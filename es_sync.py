import os
import psycopg2
from elasticsearch import Elasticsearch, helpers

DATABASE_URL = os.getenv("DATABASE_URL")
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
ELASTICSEARCH_INDEX = os.getenv("ELASTICSEARCH_INDEX", "movies")

def sync_db_to_es():
    if not DATABASE_URL:
        print("DATABASE_URL not set. Skipping Elasticsearch sync.")
        return

    print(f"Connecting to database and Elasticsearch index: {ELASTICSEARCH_INDEX}")
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    # Fetch all movies from the PostgreSQL database
    cursor.execute("SELECT id, title, description, poster, release_date, imdb_id, date_synced FROM application_movies")
    rows = cursor.fetchall()
    
    if not rows:
        print("No movies found in database to sync.")
        cursor.close()
        conn.close()
        return

    # Initialize Elasticsearch client
    es = Elasticsearch(ELASTICSEARCH_URL)
    
    # Create index if it does not exist
    if not es.indices.exists(index=ELASTICSEARCH_INDEX):
        es.indices.create(index=ELASTICSEARCH_INDEX, body={
            "mappings": {
                "properties": {
                    "title": {"type": "text", "analyzer": "standard"},
                    "description": {"type": "text"},
                    "poster": {"type": "keyword"},
                    "release_date": {"type": "date"},
                    "imdb_id": {"type": "keyword"},
                    "date_synced": {"type": "date"}
                }
            }
        })

    # Prepare bulk documents
    actions = []
    for row in rows:
        movie_id, title, description, poster, release_date, imdb_id, date_synced = row
        actions.append({
            "_index": ELASTICSEARCH_INDEX,
            "_id": str(movie_id),
            "_source": {
                "title": title,
                "description": description,
                "poster": poster,
                "release_date": str(release_date) if release_date else None,
                "imdb_id": imdb_id,
                "date_synced": date_synced.isoformat() if date_synced else None
            }
        })

    # Execute bulk indexing
    helpers.bulk(es, actions)
    print(f"Successfully synced {len(actions)} movies to Elasticsearch index '{ELASTICSEARCH_INDEX}'!")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    sync_db_to_es()
