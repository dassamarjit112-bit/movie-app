const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

// In-memory store for active jobs
const jobs = new Map();

// Generate unique ID
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// Cleanup old files periodically (run every hour)
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

setInterval(() => {
  const now = Date.now();
  fs.readdir(downloadsDir, (err, files) => {
    if (err) return;
    files.forEach(file => {
      const filePath = path.join(downloadsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        // Delete files older than 24 hours
        if (now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
          fs.unlink(filePath, () => console.log(`[JobManager] Deleted old file: ${file}`));
        }
      });
    });
  });
}, 60 * 60 * 1000);

/**
 * Start a new background download job
 * @param {string} sourceUrl - The m3u8 or mp4 URL to download
 * @param {string} filename - The target filename (e.g. movie.mp4)
 * @returns {string} jobId
 */
async function startJob(sourceUrl, filename) {
  const jobId = generateId();
  const outputPath = path.join(downloadsDir, `${jobId}_${filename}`);

  const job = {
    id: jobId,
    status: 'pending',
    progress: 0,
    filename,
    filePath: outputPath,
    createdAt: Date.now(),
    error: null
  };

  jobs.set(jobId, job);

  // Determine if it's direct MP4 or M3U8
  const isMp4 = sourceUrl.includes('.mp4');

  process.nextTick(async () => {
    try {
      job.status = 'downloading';

      if (isMp4) {
        // Direct MP4 Download using Axios
        console.log(`[JobManager] Starting direct MP4 download for job ${jobId}`);
        const response = await axios({
          method: 'GET',
          url: sourceUrl,
          responseType: 'stream',
          headers: {
            'Referer': 'https://vidlink.pro/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const totalLength = parseInt(response.headers['content-length'], 10);
        let downloaded = 0;

        const writer = fs.createWriteStream(outputPath);
        response.data.on('data', (chunk) => {
          downloaded += chunk.length;
          if (totalLength) {
            job.progress = Math.min(99, Math.round((downloaded / totalLength) * 100));
          } else {
            // Indeterminate progress if no content length
            job.progress = job.progress < 90 ? job.progress + 1 : 90;
          }
        });

        response.data.pipe(writer);

        writer.on('finish', () => {
          job.progress = 100;
          job.status = 'completed';
          console.log(`[JobManager] Job ${jobId} completed. Saved to ${outputPath}`);
        });

        writer.on('error', (err) => {
          job.status = 'failed';
          job.error = err.message;
          console.error(`[JobManager] Job ${jobId} failed:`, err.message);
        });
      } else {
        // M3U8 Download using FFmpeg
        console.log(`[JobManager] Starting FFmpeg M3U8 extraction for job ${jobId}`);
        const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

        const ffmpegArgs = [
          '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          '-headers', `Referer: https://vidlink.pro/\r\nOrigin: https://vidlink.pro`,
          '-i', sourceUrl,
          '-c', 'copy',
          '-bsf:a', 'aac_adtstoasc',
          outputPath
        ];

        const ffmpeg = spawn(ffmpegPath, ffmpegArgs);

        ffmpeg.stderr.on('data', (data) => {
          const out = data.toString();
          // FFmpeg doesn't give clean percentages without knowing total duration,
          // but we can parse time= to get an idea, or just increment progress heuristically.
          if (out.includes('time=')) {
            // Rough heuristic: increment slowly until finished
            if (job.progress < 95) job.progress += 1;
          }
        });

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            job.progress = 100;
            job.status = 'completed';
            console.log(`[JobManager] Job ${jobId} completed. Saved to ${outputPath}`);
          } else {
            job.status = 'failed';
            job.error = `FFmpeg exited with code ${code}`;
            console.error(`[JobManager] Job ${jobId} failed: exit code ${code}`);
          }
        });
        
        ffmpeg.on('error', (err) => {
          job.status = 'failed';
          job.error = err.message;
          console.error(`[JobManager] Job ${jobId} failed to start FFmpeg:`, err.message);
        });
      }
    } catch (err) {
      job.status = 'failed';
      job.error = err.message;
      console.error(`[JobManager] Job ${jobId} fatal error:`, err.message);
    }
  });

  return jobId;
}

function getJob(jobId) {
  return jobs.get(jobId);
}

module.exports = {
  startJob,
  getJob,
  downloadsDir
};
