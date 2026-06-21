import os
import requests
import psycopg2
from datetime import datetime
from urllib.parse import urljoin

# Load environment variables
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

# Swing2App API Configuration
SWING2APP_API_URL = os.getenv("SWING2APP_API_URL", "https://api.swing2app.com/v1/push/send") # Update with official endpoint
SWING2APP_AUTH_TOKEN = os.getenv("SWING2APP_AUTH_TOKEN", "")
SWING2APP_APP_ID = os.getenv("SWING2APP_APP_ID", "")

if not TMDB_API_KEY or not DATABASE_URL:
    raise RuntimeError("TMDB_API_KEY and DATABASE_URL must be set in the environment")

def send_swing2app_push(title, message, image_url=None, target_url=None):
    """
    Sends a push notification to the Swing2App native wrapper via the Swing2App Server API.
    This fulfills the Custom Backend Worker -> Swing2App Gateway -> Native App architecture.
    """
    if not SWING2APP_AUTH_TOKEN:
        print("Warning: SWING2APP_AUTH_TOKEN not configured in .env. Skipping native push notification.")
        return

    headers = {
        "Authorization": f"Bearer {SWING2APP_AUTH_TOKEN}",
        "Content-Type": "application/json"
    }

    # Standard push payload (adjust keys based on official Swing2App Server API docs)
    payload = {
        "app_id": SWING2APP_APP_ID,
        "title": title,
        "message": message,
        "is_background": True
    }
    
    if image_url:
        payload["image_url"] = image_url
    if target_url:
        payload["link_url"] = target_url # Some APIs use link_url or target_url

    try:
        response = requests.post(SWING2APP_API_URL, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        print(f"Successfully triggered Swing2App push notification: {title}")
    except requests.exceptions.RequestException as e:
        print(f"Failed to trigger Swing2App push notification: {str(e)}")
        if e.response is not None:
            print("Swing2App API Response:", e.response.text)

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
    
    # If we found new movies, trigger the Swing2App Native Push Notification!
    if total_new_movies:
        featured = total_new_movies[0]
        send_swing2app_push(
            title="🎬 New Movie Available!",
            message=f"{featured['title']} is now playing! Tap to start streaming now.",
            image_url=featured['poster'],
            target_url=f"/#player?id={featured['id']}&type=movie"
        )

if __name__ == "__main__":
    main()
