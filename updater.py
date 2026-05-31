import os
import requests
import psycopg2
from datetime import datetime
from urllib.parse import urljoin

# Load environment variables
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

if not TMDB_API_KEY or not DATABASE_URL:
    raise RuntimeError("TMDB_API_KEY and DATABASE_URL must be set in the environment")

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
    for movie in movies:
        movie_id = movie["id"]
        title = movie["title"]
        synopsis = movie["overview"]
        poster_url = urljoin("https://image.tmdb.org/t/p/w500", movie.get("poster_path", ""))
        release_date = movie.get("release_date")
        external = fetch_external_ids(movie_id)
        imdb_id = external.get("imdb_id")
        cur.execute(
            """
            INSERT INTO application_movies (id, title, description, poster, release_date, imdb_id, date_synced)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET date_synced = EXCLUDED.date_synced;
            """,
            (movie_id, title, synopsis, poster_url, release_date, imdb_id, datetime.utcnow())
        )
    conn.commit()
    cur.close()
    conn.close()

def main():
    page = 1
    while True:
        data = fetch_now_playing(page)
        results = data.get("results", [])
        if not results:
            break
        upsert_movies(results)
        if page >= data.get("total_pages", 1):
            break
        page += 1
    print("Sync completed")

if __name__ == "__main__":
    main()
