/* ============================================================
   CineStream — Advanced AI Recommender Engine
   Content-Based Filtering, Cosine Genre Proximity & Personalization
   ============================================================ */

const AIRecommender = (() => {
  
  // ── Calculate Cosine-like Similarity between two titles ──
  function calculateSimilarity(itemA, itemB) {
    if (itemA.id === itemB.id) return 0;
    
    let score = 0;
    
    // 1. Genre match (Highest weight: 45%)
    if (itemA.genre && itemB.genre) {
      const genresA = itemA.genre.split(',').map(g => g.trim());
      const genresB = itemB.genre.split(',').map(g => g.trim());
      const intersections = genresA.filter(g => genresB.includes(g));
      const unionSize = new Set([...genresA, ...genresB]).size;
      
      if (unionSize > 0) {
        score += (intersections.length / unionSize) * 45;
      }
    }
    
    // 2. Type match (Movie/Series) (Weight: 15%)
    if (itemA.type === itemB.type) {
      score += 15;
    }
    
    // 3. IMDb Score Proximity (Weight: 20%)
    if (itemA.imdb && itemB.imdb) {
      const diff = Math.abs(parseFloat(itemA.imdb) - parseFloat(itemB.imdb));
      const proximity = Math.max(0, 10 - diff) / 10; // 0 to 1 scale
      score += proximity * 20;
    }
    
    // 4. Year Proximity (Weight: 20%)
    if (itemA.year && itemB.year) {
      const diff = Math.abs(parseInt(itemA.year) - parseInt(itemB.year));
      const proximity = Math.max(0, 5 - diff) / 5; // 0 to 1 scale within 5 years
      score += proximity * 20;
    }
    
    return Math.round(score);
  }

  // ── Analyze user genre profile vector from watchlist and watch history ──
  async function getUserProfile(userId) {
    const profile = {
      genreWeights: {},
      favoriteType: { movie: 0, series: 0 },
      recentItemIds: []
    };

    if (!userId) return profile;

    try {
      // 1. Fetch Watchlist (Favorites) - Weight: 3
      const watchlist = await Subscriptions.getWatchlist(userId);
      watchlist.forEach(w => {
        const item = w.content || window.DEMO_CONTENT.find(c => c.id === w.content_id);
        if (item) {
          // Genre profiling
          if (item.genre) {
            item.genre.split(',').forEach(g => {
              const genre = g.trim();
              profile.genreWeights[genre] = (profile.genreWeights[genre] || 0) + 3;
            });
          }
          // Type profiling
          if (item.type) {
            profile.favoriteType[item.type] = (profile.favoriteType[item.type] || 0) + 3;
          }
        }
      });

      // 2. Fetch Watch History - Weight: 2
      const history = await Subscriptions.getWatchHistory(userId);
      history.forEach(h => {
        const item = h.content || window.DEMO_CONTENT.find(c => c.id === h.content_id);
        if (item) {
          profile.recentItemIds.push(item.id);
          // Genre profiling
          if (item.genre) {
            item.genre.split(',').forEach(g => {
              const genre = g.trim();
              profile.genreWeights[genre] = (profile.genreWeights[genre] || 0) + 2;
            });
          }
          // Type profiling
          if (item.type) {
            profile.favoriteType[item.type] = (profile.favoriteType[item.type] || 0) + 2;
          }
        }
      });

    } catch (err) {
      console.error('AIRecommender: Error profiling user:', err);
    }

    return profile;
  }

  // ── Personalized Recommendations (Home Page "For You") ──
  async function getPersonalizedRecommendations(userId, limit = 12) {
    const allContent = window.DEMO_CONTENT;
    if (!userId) {
      // Fallback for guest profiles (shuffle top rated content for freshness)
      const shuffled = [...allContent].sort(() => Math.random() - 0.5);
      return shuffled
        .sort((a, b) => (parseFloat(b.imdb || 0) - parseFloat(a.imdb || 0)) + (Math.random() - 0.5) * 2)
        .slice(0, limit)
        .map(item => ({
          ...item,
          aiMatchScore: Math.floor(Math.random() * 15) + 80,
          aiReason: 'Popular on CineStream'
        }));
    }

    const profile = await getUserProfile(userId);
    
    // Sort genres by weight to find favorites
    const sortedGenres = Object.entries(profile.genreWeights)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    const primaryGenre = sortedGenres[0] || '';
    const secondaryGenre = sortedGenres[1] || '';

    const recommended = allContent.map(item => {
      let score = 50 + (Math.random() * 20); // Base score with 20pt random jitter for fresh results
      let reasons = [];

      // A. Match against user's top genres
      if (item.genre) {
        const itemGenres = item.genre.split(',').map(g => g.trim());
        let genreMatchCount = 0;
        itemGenres.forEach(g => {
          if (profile.genreWeights[g]) {
            score += profile.genreWeights[g] * 4; // Add points based on genre affinity
            genreMatchCount++;
          }
        });

        if (primaryGenre && itemGenres.includes(primaryGenre)) {
          reasons.push(`Because you love ${primaryGenre}`);
          score += 15;
        } else if (secondaryGenre && itemGenres.includes(secondaryGenre)) {
          reasons.push(`Highly recommended in ${secondaryGenre}`);
          score += 10;
        }
      }

      // B. Boost if favorite type
      if (item.type) {
        const typeCount = profile.favoriteType[item.type] || 0;
        score += typeCount * 2;
      }

      // C. Boost if highly rated
      if (item.imdb) {
        score += (parseFloat(item.imdb) - 7) * 5; // e.g. 9.0 gives +10 points
      }

      // D. Penalize if recently watched to keep feed fresh
      if (profile.recentItemIds.includes(item.id)) {
        score -= 25; // Lower priority but keep in catalog
      }

      // E. Cap score between 60 and 99% for visual fidelity
      const finalPercentage = Math.min(99, Math.max(62, Math.round(score)));

      let aiReason = reasons[0] || 'Selected for your profile';
      if (profile.recentItemIds.includes(item.id)) {
        aiReason = 'Rewatch again';
      }

      return {
        ...item,
        aiMatchScore: finalPercentage,
        aiReason: aiReason
      };
    });

    // Sort descending by calculated score
    return recommended
      .sort((a, b) => b.aiMatchScore - a.aiMatchScore)
      .slice(0, limit);
  }

  // ── More Like This (Detail Page Recommendations) ──
  async function getMoreLikeThis(targetId, userId, limit = 6) {
    const allContent = window.DEMO_CONTENT;
    const targetItem = allContent.find(c => c.id === targetId);
    if (!targetItem) return allContent.slice(0, limit);

    // Profile preferences to inject mild personalization
    const profile = userId ? await getUserProfile(userId) : null;

    const similar = allContent
      .filter(item => item.id !== targetId)
      .map(item => {
        let similarity = calculateSimilarity(targetItem, item);

        // Inject personalized flavor (Boost by 8% if matches user favorite genre)
        if (profile && item.genre) {
          const itemGenres = item.genre.split(',').map(g => g.trim());
          const hasFavoriteGenre = itemGenres.some(g => profile.genreWeights[g] > 5);
          if (hasFavoriteGenre) similarity += 8;
        }

        // Cap match percentage
        const finalPercentage = Math.min(98, Math.max(58, similarity));

        return {
          ...item,
          aiMatchScore: finalPercentage,
          aiReason: `${finalPercentage}% Match`
        };
      });

    // Sort descending by similarity
    return similar
      .sort((a, b) => b.aiMatchScore - a.aiMatchScore)
      .slice(0, limit);
  }

  return {
    calculateSimilarity,
    getPersonalizedRecommendations,
    getMoreLikeThis
  };
})();

window.AIRecommender = AIRecommender;
