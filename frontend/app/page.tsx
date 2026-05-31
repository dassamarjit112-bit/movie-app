"use client";

import React, { useState, useEffect } from "react";

interface Movie {
  id: number;
  title: string;
  description: string;
  poster: string;
  release_date: string;
  imdb_id: string;
}

export default function HomeMovieDashboard() {
  const [displayedMovies, setDisplayedMovies] = useState<Movie[]>([]); // Filtered results displayed on grid
  const [searchQuery, setSearchQuery] = useState(""); // Text inside top navigation search bar
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data automatically from backend database on page load or when search query updates
  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      try {
        const url = searchQuery.trim()
          ? `/api/get-latest-synced-movies?query=${encodeURIComponent(searchQuery)}`
          : "/api/get-latest-synced-movies";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setDisplayedMovies(data);
        }
      } catch (error) {
        console.error("Failed to fetch synced movies", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search requests slightly for a smoother user experience
    const delayDebounceFn = setTimeout(() => {
      fetchMovies();
    }, 150);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#08090C] text-white flex flex-col font-sans">
      {/* Premium Glassmorphic Top Navigation Header */}
      <nav className="w-full bg-[#0F111A]/85 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 transition cursor-pointer select-none">
          NETCINEMA
        </div>

        <div className="relative w-full sm:w-96">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search latest releases instantly..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#171A26] border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/10 transition"
          />
        </div>
      </nav>

      {/* Main Home Dashboard Body */}
      <main className="flex-1 p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {searchQuery ? `Search Results for "${searchQuery}"` : "Latest Released Movies & Shows"}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Automated Aggregated Scrape-Sync Engine. Updated hourly from theatrical and OTT registries.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Sync Worker: Active</span>
          </div>
        </div>

        {/* Loading State Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col space-y-3 animate-pulse">
                <div className="w-full aspect-[2/3] rounded-2xl bg-[#12151F] border border-white/5"></div>
                <div className="h-4 bg-[#12151F] rounded w-3/4"></div>
                <div className="h-3 bg-[#12151F] rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : displayedMovies.length > 0 ? (
          /* Movie Display Card Grid Container */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {displayedMovies.map((movie) => (
              <div key={movie.id} className="group cursor-pointer flex flex-col space-y-2">
                {/* Poster Display Layout Frame */}
                <div className="w-full aspect-[2/3] rounded-2xl bg-[#12151F] border border-white/5 overflow-hidden shadow-lg relative transition-all duration-300 group-hover:shadow-pink-500/10 group-hover:border-pink-500/20">
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#12151F]">
                      <span className="text-2xl mb-2">🎬</span>
                      <span className="text-xs text-gray-400 font-medium truncate w-full">{movie.title}</span>
                    </div>
                  )}
                  {/* Hover Overlay Watch Button */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08090C]/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-4">
                    <p className="text-xs text-gray-300 line-clamp-3 mb-3 leading-relaxed font-light hidden sm:block">
                      {movie.description || "No overview available."}
                    </p>
                    <button className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-xs py-2.5 rounded-xl font-bold transition shadow-lg shadow-pink-500/25 active:scale-95">
                      ▶ Watch Preview
                    </button>
                  </div>
                </div>
                {/* Meta details */}
                <div className="px-1">
                  <h2 className="font-bold text-sm truncate group-hover:text-pink-500 transition duration-200">
                    {movie.title}
                  </h2>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-gray-500 font-medium">
                      {movie.release_date ? movie.release_date.split("-")[0] : "Recent"}
                    </span>
                    <span className="text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                      Stream HD
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 text-gray-500 flex flex-col items-center justify-center space-y-4">
            <span className="text-4xl">🍿</span>
            <div className="space-y-1">
              <p className="text-base font-semibold text-gray-400">No matching releases found</p>
              <p className="text-xs text-gray-600">Try checking your search spelling or enter a different movie title.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
