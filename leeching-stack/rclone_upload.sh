#!/bin/bash
# ==========================================
# Rclone Automated Webhook Upload Script
# Designed to be triggered by qBittorrent
# Parameters passed from qBittorrent: 
# %F (Content path), %N (Torrent name), %K (Torrent ID)
# ==========================================

CONTENT_PATH=$1
TORRENT_NAME=$2
TORRENT_ID=$3

# Path where your rclone config is stored (mounted in docker)
RCLONE_CONFIG_PATH="/config/rclone/rclone.conf"

# The name of your configured rclone remote (e.g., s3, terabox, gdrive)
RCLONE_REMOTE="my_cloud_remote"

# The remote directory to upload to
REMOTE_DIR="$RCLONE_REMOTE:/Movies"

# Your application's webhook URL to update movie status
API_WEBHOOK_URL="https://api.yourmovieapp.com/v1/webhooks/upload-complete"

echo "Starting upload for: $TORRENT_NAME"
echo "Path: $CONTENT_PATH"

# Run rclone to move the file
# --config specifies the config file
# --progress is optional but good for logging
rclone move "$CONTENT_PATH" "$REMOTE_DIR" --config "$RCLONE_CONFIG_PATH" -v

RCLONE_EXIT_CODE=$?

if [ $RCLONE_EXIT_CODE -eq 0 ]; then
    echo "Upload completed successfully."
    
    # Optional: Ping your backend API to notify that the file is ready
    curl -X POST "$API_WEBHOOK_URL" \
         -H "Content-Type: application/json" \
         -d '{
               "torrent_id": "'"$TORRENT_ID"'",
               "torrent_name": "'"$TORRENT_NAME"'",
               "status": "Available for Streaming",
               "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"
             }'
             
    echo "Webhook sent to backend."
else
    echo "Upload failed with rclone exit code $RCLONE_EXIT_CODE."
    exit 1
fi
