-- Migration: Add Telegram Scraper Columns to application_movies table
-- This allows the system to store direct Telegram file IDs for native cloud serving.

ALTER TABLE application_movies
ADD COLUMN IF NOT EXISTS telegram_file_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- Add an index to speed up title searches if not already present
CREATE INDEX IF NOT EXISTS idx_movies_title ON application_movies (title);
