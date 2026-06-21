import os
import requests
import psycopg2
from datetime import datetime
from urllib.parse import urljoin
import firebase_admin
from firebase_admin import credentials, messaging

# Load environment variables
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

# Firebase Configuration
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-adminsdk.json")

if not TMDB_API_KEY or not DATABASE_URL:
    raise RuntimeError("TMDB_API_KEY and DATABASE_URL must be set in the environment")

def initialize_firebase():
    """Initialize the Firebase Admin SDK if not already initialized."""
    if not firebase_admin._apps:
        if os.path.exists(FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            return True
        else:
            print(f"Warning: Firebase credentials not found at {FIREBASE_CREDENTIALS_PATH}. Push notifications skipped.")
            return False
    return True

def send_firebase_push(title, message, image_url=None, target_url=None):
    """
    Sends a push notification using Firebase Cloud Messaging (FCM).
    Targets all devices subscribed to the 'movies' topic.
    """
    if not initialize_firebase():
        return

    notification = messaging.Notification(
        title=title,
        body=message,
        image=image_url
    )

    data_payload = {}
    if target_url:
        data_payload["url"] = target_url

    message_payload = messaging.Message(
        notification=notification,
        data=data_payload,
        topic="movies"  # Assuming all users subscribe to 'movies'
    )

    try:
        response = messaging.send(message_payload)
        print(f"Successfully triggered Firebase push notification: {title} (Message ID: {response})")
    except Exception as e:
        print(f"Failed to trigger Firebase push notification: {str(e)}")

def fetch_now_playing(page=1):
    url = f"https://api.themoviedb.org/3/movie/now_playing?api_key={TMDB_API_KEY}&language=en-US&page={page}"
    resp = requests.get(url)
    resp.raise_for_status()
    return resp.json()

def fetch_external_ids(movie_id):
    url = f"https://api.themoviedb.org/3/movie/{movie_id}/external_ids?api_key={TMDB_API_KEY}"
    resp = requests.get(url)
    resp.raise_for_status()
    return resp.json()

def upsert_movies(movies):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    new_movies_inserted = []
    
    for movie in movies:
        movie_id = movie["id"]
        title = movie["title"]
        synopsis = movie["overview"]
        poster_url = urljoin("https://image.tmdb.org/t/p/w500", movie.get("poster_path", ""))
        release_date = movie.get("release_date")
        external = fetch_external_ids(movie_id)
        imdb_id = external.get("imdb_id")
        
        # We use xmax to determine if the row was inserted (xmax = 0) or updated
        cur.execute(
            """
            INSERT INTO application_movies (id, title, description, poster, release_date, imdb_id, date_synced)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET date_synced = EXCLUDED.date_synced
            RETURNING (xmax = 0) AS is_insert;
            """,
            (movie_id, title, synopsis, poster_url, release_date, imdb_id, datetime.utcnow())
        )
        
        result = cur.fetchone()
        if result and result[0]:
            new_movies_inserted.append({
                "title": title,
                "poster": poster_url,
                "id": movie_id
            })
            
    conn.commit()
    cur.close()
    conn.close()
    
    return new_movies_inserted

def main():
    page = 1
    total_new_movies = []
    
    while True:
        data = fetch_now_playing(page)
        results = data.get("results", [])
        if not results:
            break
            
        newly_inserted = upsert_movies(results)
        total_new_movies.extend(newly_inserted)
        
        if page >= data.get("total_pages", 1):
            break
        page += 1
        
    print(f"Sync completed. {len(total_new_movies)} new movies added.")
    
    # If we found new movies, trigger the Firebase Native Push Notification!
    if total_new_movies:
        featured = total_new_movies[0]
        send_firebase_push(
            title="🎬 New Movie Available!",
            message=f"{featured['title']} is now playing! Tap to start streaming now.",
            image_url=featured['poster'],
            target_url=f"/#player?id={featured['id']}&type=movie"
        )

if __name__ == "__main__":
    main()
