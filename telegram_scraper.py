import os
import asyncio
import psycopg2
from telethon import TelegramClient, events
import re

# Load environment variables
API_ID = os.getenv('TELEGRAM_API_ID')
API_HASH = os.getenv('TELEGRAM_API_HASH')
DATABASE_URL = os.getenv('DATABASE_URL')
SESSION_NAME = 'media_scraper_session'

if not API_ID or not API_HASH or not DATABASE_URL:
    raise RuntimeError("TELEGRAM_API_ID, TELEGRAM_API_HASH, and DATABASE_URL must be set in the environment.")

# Array of target public movie channel usernames
TARGET_CHANNELS = [
    '@example_movie_channel_1', 
    '@hd_movies_cloud'
]

def clean_title(file_name):
    """
    Clean the file name to extract a searchable movie title.
    Removes common tags like [1080p], x264, Web-DL, years, etc.
    """
    if not file_name:
        return ""
    # Remove file extension
    title = os.path.splitext(file_name)[0]
    # Replace dots and underscores with spaces
    title = title.replace('.', ' ').replace('_', ' ')
    # Remove things inside brackets/parentheses
    title = re.sub(r'[\[\(].*?[\]\)]', '', title)
    # Remove common quality tags and resolutions
    title = re.sub(r'(?i)(1080p|720p|480p|4k|2160p|x264|x265|hevc|web-dl|bluray|brrip|hdtv)', '', title)
    # Trim whitespace
    return title.strip()

def insert_telegram_file(title, file_id, file_size, source_channel):
    """
    Inserts or updates the telegram file reference in the database.
    Attempts to match with an existing movie by title (simplified match).
    """
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Try to find a movie ID matching the title (case-insensitive substring match as basic heuristic)
        # Note: In production, you might want to use fuzzy matching or TMDB API to get the exact ID before inserting.
        cur.execute(
            """
            SELECT id FROM application_movies 
            WHERE title ILIKE %s
            LIMIT 1
            """,
            (f"%{title}%",)
        )
        result = cur.fetchone()
        
        if result:
            movie_id = result[0]
            cur.execute(
                """
                UPDATE application_movies 
                SET telegram_file_id = %s, file_size_bytes = %s 
                WHERE id = %s
                """,
                (file_id, file_size, movie_id)
            )
            print(f"Updated movie {movie_id} ('{title}') with telegram_file_id from {source_channel}.")
        else:
            print(f"Skipped '{title}': No matching movie found in the database. Please sync from TMDB first.")
            
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Database error: {e}")

async def main():
    print("Starting Telegram Media Scraper...")
    client = TelegramClient(SESSION_NAME, int(API_ID), API_HASH)
    
    @client.on(events.NewMessage(chats=TARGET_CHANNELS))
    async def new_message_handler(event):
        if event.message.video or event.message.document:
            media = event.message.video or event.message.document
            
            # Extract metadata
            file_id = getattr(media, 'id', None)
            file_name = None
            file_size = getattr(media, 'size', 0)
            
            # Try to get the file name from attributes
            for attr in getattr(media, 'attributes', []):
                if hasattr(attr, 'file_name'):
                    file_name = attr.file_name
                    break
            
            if not file_name and event.message.text:
                # Fallback to first line of caption if no file name
                file_name = event.message.text.split('\n')[0]
                
            if file_id and file_name:
                searchable_title = clean_title(file_name)
                channel_username = getattr(event.chat, 'username', 'Unknown')
                
                print(f"New file detected: {file_name} ({file_size} bytes)")
                print(f"Extracted Title: {searchable_title}")
                
                insert_telegram_file(searchable_title, file_id, file_size, channel_username)

    await client.start()
    print("Listening for new messages...")
    await client.run_until_disconnected()

if __name__ == '__main__':
    asyncio.run(main())
