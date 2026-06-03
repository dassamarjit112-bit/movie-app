'use client';

import React, { useEffect, useState, useRef } from 'react';
import Hls from 'hls.js';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { Loader2, AlertCircle } from 'lucide-react';

interface MoviePlayerProps {
  tmdbId: string;
  season?: string;
  episode?: string;
}

interface StreamResponse {
  success: boolean;
  streamUrl?: string;
  format?: string;
  subtitles?: { lang: string; url: string }[];
  error?: string;
}

export default function MoviePlayer({ tmdbId, season, episode }: MoviePlayerProps) {
  const [streamData, setStreamData] = useState<StreamResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchStream = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let apiUrl = `/api/stream/${tmdbId}`;
        if (season && episode) {
          apiUrl += `?season=${season}&episode=${episode}`;
        }

        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('Failed to fetch stream manifest');
        
        const data: StreamResponse = await res.json();
        
        if (data.success && data.streamUrl) {
          if (mounted) setStreamData(data);
        } else {
          throw new Error(data.error || 'No stream available');
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Error resolving stream');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStream();
    
    return () => { mounted = false; };
  }, [tmdbId, season, episode]);

  useEffect(() => {
    if (!streamData || !videoRef.current) return;

    const source = streamData.streamUrl;
    if (!source) return;

    const defaultOptions: Plyr.Options = {
      captions: { active: true, update: true, language: 'en' },
      controls: [
        'play-large', 'play', 'progress', 'current-time', 'mute', 
        'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
      ],
      settings: ['captions', 'quality', 'speed'],
    };

    if (streamData.format === 'hls' && Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 100,
      });

      hls.loadSource(source);
      hls.attachMedia(videoRef.current);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Initialize Plyr once HLS manifest is parsed to grab quality levels if needed
        playerRef.current = new Plyr(videoRef.current!, defaultOptions);
      });

      return () => {
        if (playerRef.current) {
          playerRef.current.destroy();
        }
        hls.destroy();
      };
    } else {
      // Fallback for native HLS support (e.g., Safari) or MP4
      videoRef.current.src = source;
      playerRef.current = new Plyr(videoRef.current, defaultOptions);
      
      return () => {
        if (playerRef.current) {
          playerRef.current.destroy();
        }
      };
    }
  }, [streamData]);

  if (loading) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-xl flex flex-col items-center justify-center border border-gray-800 shadow-2xl">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Resolving Ad-Free Stream...</p>
      </div>
    );
  }

  if (error || !streamData) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-xl flex flex-col items-center justify-center border border-red-900/50 shadow-2xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-gray-100 mb-2">Stream Unavailable</h3>
        <p className="text-gray-400">{error || 'Could not load the requested media.'}</p>
      </div>
    );
  }

  return (
    <div className="w-full relative rounded-xl overflow-hidden shadow-2xl bg-black border border-gray-800 group">
      <video
        ref={videoRef}
        className="w-full h-full"
        crossOrigin="anonymous"
        playsInline
      >
        {streamData.subtitles?.map((sub, index) => (
          <track
            key={index}
            kind="captions"
            label={sub.lang === 'en' ? 'English' : sub.lang}
            srcLang={sub.lang}
            src={sub.url}
            default={index === 0}
          />
        ))}
      </video>
    </div>
  );
}
