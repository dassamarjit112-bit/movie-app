import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { spawn } from 'child_process';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * GET /api/media/download
 * Query params: id, title, type, season, episode
 * Returns manifest URL for download
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const title = searchParams.get('title') || 'video';
    const type = searchParams.get('type') || 'movie';
    const season = parseInt(searchParams.get('season') || '1');
    const episode = parseInt(searchParams.get('episode') || '1');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    console.log(`[DownloadEngine] GET Request: ${title} (ID: ${id}, Type: ${type})`);

    // Step 1 & 2: Extract master .m3u8 playlist URL
    const manifestUrl = await extractMasterPlaylistUrl(id, type, season, episode);
    if (!manifestUrl) {
      return NextResponse.json({ error: 'Could not resolve streaming source' }, { status: 404 });
    }

    console.log(`[DownloadEngine] Resolved manifest: ${manifestUrl}`);

    // For GET requests, return JSON with manifest info
    // The browser/frontend will handle the actual download
    return NextResponse.json({
      success: true,
      manifestUrl,
      title: title.replace(/[^a-zA-Z0-9_-]/g, '_'),
      type,
      season,
      episode,
      downloadUrl: manifestUrl,
      message: 'Stream manifest resolved. Open the URL in a download manager or HLS downloader.'
    });

  } catch (error) {
    console.error('[DownloadEngine] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media/download
 * Extracts master .m3u8 playlist and pipes through FFmpeg for download
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, type = 'movie', season = 1, episode = 1 } = body;

    if (!id || !title) {
      return NextResponse.json({ error: 'Missing id or title' }, { status: 400 });
    }

    console.log(`[DownloadEngine] Starting pipeline for: ${title} (ID: ${id})`);

    const manifestUrl = await extractMasterPlaylistUrl(id, type, season, episode);
    if (!manifestUrl) {
      return NextResponse.json({ error: 'Could not resolve streaming source' }, { status: 404 });
    }

    console.log(`[DownloadEngine] Resolved manifest: ${manifestUrl}, starting FFmpeg...`);

    const ffmpegProcess = spawn('ffmpeg', [
      '-i', manifestUrl,
      '-c', 'copy',
      '-bsf:a', 'aac_adtstoasc',
      '-movflags', 'frag_keyframe+empty_moov',
      '-f', 'mp4',
      'pipe:1'
    ]);

    ffmpegProcess.stderr.on('data', (data) => {
      // Uncomment for debugging: console.log(`[FFmpeg] ${data}`);
    });

    ffmpegProcess.on('error', (err) => {
      console.error('[DownloadEngine] FFmpeg process error:', err);
    });

    const readableStream = new ReadableStream({
      start(controller) {
        ffmpegProcess.stdout.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        ffmpegProcess.stdout.on('end', () => {
          try { controller.close(); } catch (e) {}
        });
        ffmpegProcess.on('close', (code) => {
          if (code !== 0) {
            console.error(`[DownloadEngine] FFmpeg exited with code ${code}`);
          }
          try { controller.close(); } catch (e) {}
        });
      },
      cancel() {
        console.log('[DownloadEngine] Stream cancelled by client, killing FFmpeg');
        ffmpegProcess.kill('SIGKILL');
      }
    });

    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeTitle}_${type === 'series' ? `S${season}_E${episode}` : 'movie'}.mp4`;

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('[DownloadEngine] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}

/**
 * Step 1 & 2: Extract master .m3u8 playlist URL from multiple sources
 */
async function extractMasterPlaylistUrl(tmdbId: string, type: string, season: number, episode: number): Promise<string | null> {
  const sources = type === 'series'
    ? [
        `https://api.vidsrc.cc/v1/source/tv/${tmdbId}/${season}/${episode}`,
        `https://embed.su/api/source/tv/${tmdbId}/${season}/${episode}`,
        `https://2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
      ]
    : [
        `https://api.vidsrc.cc/v1/source/movie/${tmdbId}`,
        `https://embed.su/api/source/movie/${tmdbId}`,
        `https://2embed.cc/embed/${tmdbId}`
      ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.google.com/'
  };

  for (const sourceUrl of sources) {
    try {
      console.log(`[DownloadEngine] Trying source: ${sourceUrl}`);
      
      const response = await axios.get(sourceUrl, {
        headers,
        timeout: 15000,
        validateStatus: () => true
      });

      // Parse response based on source format
      let playlistUrl: string | null = null;

      // VidSrc API format
      if (sourceUrl.includes('vidsrc.cc')) {
        playlistUrl = response.data?.playlist_url || response.data?.file || response.data?.url || null;
      }
      // Embed.su format
      else if (sourceUrl.includes('embed.su')) {
        if (response.data?.sources) {
          const sources = response.data.sources;
          const hlsSource = sources.find((s: any) => s.type === 'hls' || s.url?.includes('.m3u8'));
          playlistUrl = hlsSource?.url || sources[0]?.url || null;
        } else {
          playlistUrl = response.data?.url || response.data?.file || null;
        }
      }
      // 2Embed format - usually returns iframe or redirect
      else if (sourceUrl.includes('2embed.cc')) {
        // 2Embed may return HTML with embedded player
        const htmlString = typeof response.data === 'string' ? response.data : '';
        const iframeMatch = htmlString.match(/<iframe[^>]+src=["']([^"']+)["']/);
        const scriptMatch = htmlString.match(/<script[^>]*>([^<]+\.m3u8[^<]*)<\/script>/i);
        const htmlMatch = iframeMatch?.[1] || scriptMatch?.[1] || null;
        if (htmlMatch) playlistUrl = htmlMatch;
      }

      if (playlistUrl && (playlistUrl.includes('.m3u8') || playlistUrl.includes('m3u8'))) {
        console.log(`[DownloadEngine] Found playlist: ${playlistUrl}`);
        return playlistUrl;
      }

      // Also try to extract from response text if it's HTML
      if (typeof response.data === 'string') {
        const m3u8Match = response.data.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
        if (m3u8Match) {
          return m3u8Match[1];
        }
      }
    } catch (error) {
      console.warn(`[DownloadEngine] Source failed: ${sourceUrl}`, (error as Error).message);
      continue;
    }
  }

  // Fallback: Try to get from Videasy player (same domain as streaming)
  try {
    const videasyFallback = type === 'series'
      ? `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`
      : `https://player.videasy.net/movie/${tmdbId}`;
    
    console.log(`[DownloadEngine] Trying Videasy fallback: ${videasyFallback}`);
    
    const videasyResponse = await axios.get(videasyFallback, {
      headers,
      timeout: 15000
    });

    // Extract .m3u8 from Videasy page
    if (typeof videasyResponse.data === 'string') {
      const m3u8Match = videasyResponse.data.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
      if (m3u8Match) {
        return m3u8Match[1];
      }
      
      // Also look for blob URLs or encoded manifests
      const blobMatch = videasyResponse.data.match(/["'](https?:\/\/[^"']+\.m3u8)["']/);
      if (blobMatch) return blobMatch[1];
    }
  } catch (error) {
    console.warn(`[DownloadEngine] Videasy fallback failed:`, (error as Error).message);
  }

  return null;
}