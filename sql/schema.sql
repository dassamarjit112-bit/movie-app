-- Schema for the Automated Movie Sync Application database

CREATE TABLE IF NOT EXISTS application_movies (
    id INTEGER PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    poster VARCHAR(500),
    release_date DATE,
    imdb_id VARCHAR(50),
    date_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for title search performance if Postgres is used directly
CREATE INDEX IF NOT EXISTS idx_movies_title ON application_movies (title);
