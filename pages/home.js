/* CineStream — Home Page Controller (TMDB-powered) */

// ── Fallback demo content (used while TMDB loads or if offline) ──
const DEMO_CONTENT = [
  { id:'1', title:'Void Walker', type:'movie', genre:'Sci-Fi', year:2024, duration:122, imdb:'8.4',
    poster:'https://images.unsplash.com/photo-1518676590629-3dcbd9cf5e8c?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1518676590629-3dcbd9cf5e8c?w=800&q=80&auto=format',
    description:'A haunting journey through the fabric of reality.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'2', title:'Velocity Shift', type:'movie', genre:'Action', year:2023, duration:108, imdb:'7.8',
    poster:'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&q=80&auto=format',
    description:'Speed is all that separates survival from destruction.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'3', title:'The Silent Gate', type:'movie', genre:'Fantasy', year:2024, duration:145, imdb:'9.0',
    poster:'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80&auto=format',
    description:'An ancient doorway to another world opens.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'4', title:'Midnight Red', type:'movie', genre:'Drama', year:2024, duration:98, imdb:'8.1',
    poster:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80&auto=format',
    description:'A city lit by neon holds secrets darker than the night.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'5', title:'The Beacon', type:'movie', genre:'Thriller', year:2023, duration:115, imdb:'7.6',
    poster:'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80&auto=format',
    description:'Isolated on a cliff-side lighthouse, she discovers she is not alone.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'6', title:'Neural Link', type:'movie', genre:'Sci-Fi', year:2024, duration:132, imdb:'8.7',
    poster:'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&q=80&auto=format',
    description:'The first human-AI neural bridge promises immortality.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'7', title:'Eden Unveiled', type:'movie', genre:'Documentary', year:2023, duration:89, imdb:'8.5',
    poster:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&auto=format',
    description:'Breathtaking footage from the last untouched corners of our planet.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'8', title:'The Concrete Jungle', type:'series', genre:'Crime', year:2023, duration:52, imdb:'8.9',
    poster:'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80&auto=format',
    description:'A gritty look at power, corruption, and survival.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8',
    seasons:2,
    episodes: {
      1: [
        { epNum:1, title:'Episode 1', desc:'The story begins.', duration:45, thumb:'https://images.unsplash.com/photo-1507120410851-1f2f6c9491a0?w=400&q=80&auto=format', stream:'https://example.com/series8/s1/e1.m3u8' },
        { epNum:2, title:'Episode 2', desc:'The plot thickens.', duration:45, thumb:'https://images.unsplash.com/photo-1507120410851-1f2f6c9491a0?w=400&q=80&auto=format', stream:'https://example.com/series8/s1/e2.m3u8' }
      ],
      2: [
        { epNum:1, title:'Episode 1', desc:'Season two starts.', duration:45, thumb:'https://images.unsplash.com/photo-1507120410851-1f2f6c9491a0?w=400&q=80&auto=format', stream:'https://example.com/series8/s2/e1.m3u8' },
        { epNum:2, title:'Episode 2', desc:'New challenges arise.', duration:45, thumb:'https://images.unsplash.com/photo-1507120410851-1f2f6c9491a0?w=400&q=80&auto=format', stream:'https://example.com/series8/s2/e2.m3u8' }
      ]
    }
  },
  { id:'9', title:'Cosmic Horizons', type:'series', genre:'Documentary', year:2023, duration:45, imdb:'9.2',
    poster:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80&auto=format',
    description:'Journey to the edges of the known universe.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8',
    seasons:1, episodes:['E8','E7'] },
  { id:'10', title:'Point of Origin', type:'movie', genre:'Thriller', year:2024, duration:117, imdb:'7.9',
    poster:'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80&auto=format',
    description:'A detective investigates impossible crimes that happen at dawn.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'11', title:'Blue Note', type:'movie', genre:'Drama', year:2024, duration:104, imdb:'8.2',
    poster:'https://images.unsplash.com/photo-1415886411433-bc44ef4bdb88?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1415886411433-bc44ef4bdb88?w=800&q=80&auto=format',
    description:'A jazz musician faces his final concert and the truth about his life.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'12', title:'Iron Veil', type:'movie', genre:'Action', year:2024, duration:136, imdb:'7.5',
    poster:'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&q=80&auto=format',
    description:'A covert ops specialist goes off-book to take down a shadow government.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
];

window.DEMO_CONTENT = DEMO_CONTENT;

// ── Hero slides (will be updated dynamically from TMDB trending) ──
let HERO_SLIDES = [
  {
    title: 'CYBERPULSE: THE LAST ARCHIVE',
    desc: 'In a world where memories are digital currency, one rogue archivist discovers a secret that could restart humanity.',
    img: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&q=85&auto=format',
    badge: 'New Release',
    rating: '4.9',
    id: '1', type: 'movie'
  },
  {
    title: 'COSMIC HORIZONS: SEASON 2',
    desc: 'Journey to the edge of the universe. Emmy-award winning documentary series returns with jaw-dropping 8K footage.',
    img: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1920&q=85&auto=format',
    badge: 'Series',
    rating: '9.2',
    id: '9', type: 'series'
  },
  {
    title: 'THE SILENT GATE',
    desc: 'An ancient doorway to another world opens — but closing it may cost everything you love.',
    img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&q=85&auto=format',
    badge: 'Top Rated',
    rating: '9.0',
    id: '3', type: 'movie'
  }
];

const HomePage = (() => {
  let currentSlide = 0;
  let carouselInterval = null;

  function init() {
    // Render nav
    document.getElementById('navbar-mount').innerHTML = UI.renderNavbar('home');
    document.getElementById('footer-mount').innerHTML = UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = UI.renderMobileNav('home');
    UI.updateNavbarUser();
    UI.initRipples();

    // Hero carousel with static slides first
    renderHeroSlide(0);
    startCarousel();
    setupCarouselDots();

    // Genre chip UI
    document.querySelectorAll('.genre-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const genre = chip.dataset.genre;
        filterHomeByGenre(genre);
      });
    });

    // Continue watching from demo/local storage
    populateContinueWatching();

    // Load TMDB data async, fill sections as they arrive
    loadTMDBSections();
    
    // Load live sports recommendations
    loadLiveSports();
  }

  async function loadLiveSports() {
    const section = document.getElementById('live-sports-section');
    const row = document.getElementById('home-sports-row');
    if (!section || !row || !window.SportsAPI) return;

    // Sport emoji mapping
    const sportEmoji = { football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾' };

    try {
      const matches = await window.SportsAPI.getLiveMatches();
      if (matches && matches.length > 0) {
        section.style.display = 'block';
        row.innerHTML = matches.map(match => {
          const emoji = sportEmoji[match.sportType] || '🏆';
          const isLive = match.status && (match.status.toUpperCase().includes('LIVE') || match.status === 'LIVE');
          const viewers = Math.floor(Math.random() * 80 + 10) + 'K';

          const homeLogoHtml = match.homeLogo
            ? `<img src="${match.homeLogo}" alt="${match.homeTeam}" class="hs-team-logo" onerror="this.style.display='none';this.nextSibling.style.display='flex';">
               <div class="hs-team-abbr" style="display:none">${(match.homeTeam||'?').substring(0,3).toUpperCase()}</div>`
            : `<div class="hs-team-abbr">${(match.homeTeam||'?').substring(0,3).toUpperCase()}</div>`;

          const awayLogoHtml = match.awayLogo
            ? `<img src="${match.awayLogo}" alt="${match.awayTeam}" class="hs-team-logo" onerror="this.style.display='none';this.nextSibling.style.display='flex';">
               <div class="hs-team-abbr" style="display:none">${(match.awayTeam||'?').substring(0,3).toUpperCase()}</div>`
            : `<div class="hs-team-abbr">${(match.awayTeam||'?').substring(0,3).toUpperCase()}</div>`;

          return `
            <div class="hs-match-card" onclick="Router.navigate('sports-stream', {id: '${match.matchId}'})">
              <div class="hs-card-inner">
                <div class="hs-card-top">
                  <div class="hs-tournament-tag">
                    <span>${emoji}</span>
                    <span>${match.tournament}</span>
                  </div>
                  ${isLive
                    ? `<div class="hs-live-tag"><div class="hs-live-tag-dot"></div>LIVE</div>`
                    : `<div style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.05);border-radius:999px;padding:3px 9px;">${match.status}</div>`
                  }
                </div>
                <div class="hs-card-teams">
                  <div class="hs-team">
                    <div class="hs-team-logo-ring">${homeLogoHtml}</div>
                    <div class="hs-team-name">${match.homeTeam}</div>
                  </div>
                  <div class="hs-score-box">
                    <div class="hs-score">${match.score}</div>
                    <div class="hs-score-sub">${isLive ? '● LIVE' : 'Final'}</div>
                  </div>
                  <div class="hs-team">
                    <div class="hs-team-logo-ring">${awayLogoHtml}</div>
                    <div class="hs-team-name">${match.awayTeam}</div>
                  </div>
                </div>
                <div class="hs-card-footer">
                  <div class="hs-viewers">
                    <span class="material-symbols-outlined" style="font-size:13px;">visibility</span>
                    ${viewers} watching
                  </div>
                  <button class="hs-watch-btn">
                    <span class="material-symbols-outlined icon-fill" style="font-size:13px;">play_arrow</span>
                    Watch
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      } else {
        section.style.display = 'none';
      }
    } catch (err) {
      console.warn("Failed to load live sports on home page:", err);
    }
  }

  // ── Load all TMDB sections in parallel ──
  async function loadTMDBSections() {
    try {
      // Trending — first priority, loads hero too
      TMDB.fetchTrending().then(items => {
        if (items.length) {
          window.registerDemoContent(items);
          // Update hero carousel with real movies
          HERO_SLIDES = items.slice(0, 5).map(m => ({
            title: m.title.toUpperCase(),
            desc: m.description,
            img: m.thumbnail || m.poster,
            badge: m.type === 'series' ? 'Series' : 'Trending',
            rating: m.imdb,
            id: m.id,
            type: m.type
          }));
          renderHeroSlide(currentSlide);
          // Update carousel dot count
          const dotsEl = document.getElementById('carousel-dots');
          if (dotsEl) {
            dotsEl.innerHTML = HERO_SLIDES.map((_, i) =>
              `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-idx="${i}"></button>`
            ).join('');
            setupCarouselDots();
          }
          fillRow('trending-row', items.slice(0, 12), true);
        }
      });

      // Upcoming
      TMDB.fetchUpcoming().then(items => {
        if (items.length) {
          window.registerDemoContent(items);
          fillRow('new-releases-row', items.slice(0, 10));
        }
      });

      // Bollywood
      TMDB.fetchBollywood().then(items => {
        if (items.length) {
          window.registerDemoContent(items);
          fillRow('bollywood-row', items.slice(0, 12));
        }
      });

      // Hollywood
      TMDB.fetchHollywood().then(items => {
        if (items.length) {
          window.registerDemoContent(items);
          fillRow('hollywood-row', items.slice(0, 12));
        }
      });

      // Tollywood + South
      Promise.all([TMDB.fetchTollywood(), TMDB.fetchSouthMovies()]).then(([tol, south]) => {
        const combined = [...tol, ...south].sort((a, b) => b.popularity - a.popularity);
        if (combined.length) {
          window.registerDemoContent(combined);
          fillRow('tollywood-row', combined.slice(0, 12));
        }
      });

      // TV Serials
      TMDB.fetchTVSeries().then(items => {
        if (items.length) {
          window.registerDemoContent(items);
          fillRow('tvserials-row', items.slice(0, 12));
        }
      });

      // Top Rated
      TMDB.fetchTopRated().then(items => {
        if (items.length) {
          window.registerDemoContent(items);
          fillRow('top-rated-row', items.slice(0, 10));
        }
      });

      // AI Recommended
      populateRecommended();

    } catch (err) {
      console.warn('TMDB load error, using fallback:', err);
      // Use demo content as fallback
      fillRow('trending-row', DEMO_CONTENT.slice(0, 8), true);
      fillRow('new-releases-row', [...DEMO_CONTENT].sort(() => Math.random() - 0.5).slice(0, 6));
      fillRow('bollywood-row', DEMO_CONTENT.slice(0, 6));
      fillRow('hollywood-row', DEMO_CONTENT.slice(0, 6));
      fillRow('tollywood-row', DEMO_CONTENT.slice(0, 6));
      fillRow('tvserials-row', DEMO_CONTENT.filter(c => c.type === 'series'));
      fillRow('top-rated-row', [...DEMO_CONTENT].sort((a, b) => parseFloat(b.imdb) - parseFloat(a.imdb)).slice(0, 8));
    }
  }

  // ── Fill a scroll row with poster cards ──
  function fillRow(rowId, items, withRank = false) {
    const row = document.getElementById(rowId);
    if (!row || !items.length) return;
    row.innerHTML = items.map((item, i) =>
      UI.posterCard(item, { showRank: withRank && i < 3, rank: i + 1, size: 'poster-card-item' })
    ).join('');
  }

  // ── Filter visible home sections by genre/industry chip ──
  function filterHomeByGenre(genre) {
    const industryMap = {
      bollywood: 'bollywood-section',
      hollywood: 'hollywood-section',
      tollywood: 'tollywood-section',
      south: 'tollywood-section',
    };
    if (genre === 'all') {
      document.querySelectorAll('.section').forEach(s => s.style.display = '');
      return;
    }
    const industrySection = industryMap[genre];
    if (industrySection) {
      // Show only the relevant section
      document.querySelectorAll('.section').forEach(s => {
        s.style.display = s.id === industrySection ? '' : 'none';
      });
    } else {
      // Genre filtering — let movies page handle it
      Router.navigate('movies', { genre });
    }
  }

  // ── Hero rendering ──
  function renderHeroSlide(idx) {
    const slide = HERO_SLIDES[idx];
    if (!slide) return;
    const img = document.getElementById('hero-img');
    const title = document.getElementById('hero-title');
    const desc = document.getElementById('hero-desc');
    const badge = document.getElementById('hero-badge');
    const rating = document.getElementById('hero-rating');
    const playBtn = document.getElementById('hero-play-btn');
    const infoBtn = document.getElementById('hero-info-btn');

    if (img) { img.style.opacity = '0'; setTimeout(() => { img.src = slide.img; img.style.opacity = '1'; img.style.transition = 'opacity 0.7s ease'; }, 100); }
    if (title) { title.style.animation = 'none'; title.offsetHeight; title.textContent = slide.title; title.style.animation = 'fade-up 0.6s ease both'; }
    if (desc) desc.textContent = slide.desc;
    if (badge) badge.textContent = slide.badge;
    if (rating) rating.textContent = slide.rating;
    if (playBtn) playBtn.onclick = () => Router.navigate('player', { id: slide.id });
    if (infoBtn) infoBtn.onclick = () => Router.navigate('detail', { id: slide.id, type: slide.type });

    document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === idx);
    });
  }

  function startCarousel() {
    if (carouselInterval) clearInterval(carouselInterval);
    carouselInterval = setInterval(() => {
      currentSlide = (currentSlide + 1) % HERO_SLIDES.length;
      renderHeroSlide(currentSlide);
    }, 6000);
  }

  function setupCarouselDots() {
    document.querySelectorAll('.carousel-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        currentSlide = parseInt(dot.dataset.idx);
        renderHeroSlide(currentSlide);
        startCarousel();
      });
    });
  }

// ── Continue Watching (from Supabase watch history) ──
async function populateContinueWatching() {
  const row = document.getElementById('continue-watching-row');
  const section = document.getElementById('continue-watching-section');
  if (!row) return;

  try {
    const session = await window.Auth.getSession();
    if (!session) {
      if (section) section.style.display = 'none';
      return;
    }
    const userId = session.user.id;

    // Fetch recent watch history entries for this user
    const { data: history, error } = await window.sb
      .from('watch_history')
      .select('content_id, progress_seconds, last_watched, episode, content_type')
      .eq('user_id', userId)
      .order('last_watched', { ascending: false })
      .limit(8);

    if (error) throw error;
    if (!history || history.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }

    if (section) section.style.display = 'block';

    const items = await Promise.all(history.map(async (h) => {
      let content = null;
      if (window.TMDB) {
        // Try stored type first, then movie, then tv
        const preferredType = h.content_type || 'movie';
        content = await TMDB.getDetails(h.content_id, preferredType).catch(() => null);
        if (!content) {
          const altType = preferredType === 'movie' ? 'tv' : 'movie';
          content = await TMDB.getDetails(h.content_id, altType).catch(() => null);
        }
      }
      if (!content) return null;

      const progressSec = h.progress_seconds || 0;
      const durationSec = (content.duration || 90) * 60;
      const percent = Math.min(100, Math.round((progressSec / durationSec) * 100));
      const remainingMin = Math.max(1, Math.round((durationSec - progressSec) / 60));
      const timeLeft = remainingMin >= 60
        ? `${Math.floor(remainingMin / 60)}h ${remainingMin % 60}m left`
        : `${remainingMin}m left`;

      return {
        ...content,
        episode: h.episode || '',
        timeLeft,
        progress: percent,
        duration: 100,
      };
    }));

    const filtered = items.filter(Boolean);
    if (filtered.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }

    row.innerHTML = filtered.map(item => UI.videoCard(item)).join('');
    UI.initVideoCardHovers();
  } catch (e) {
    console.warn('Continue watching load failed:', e);
    if (section) section.style.display = 'none';
  }
}

  // ── AI Recommendations ──
  async function populateRecommended() {
    const grid = document.getElementById('recommended-grid');
    if (!grid) return;
    try {
      const session = await window.Auth.getSession();
      const userId = session ? session.user.id : null;
      const items = await AIRecommender.getPersonalizedRecommendations(userId, 12);
      if (items && items.length) {
        grid.innerHTML = items.map(item => UI.posterCard(item, {})).join('');
        return;
      }
    } catch (err) {
      console.warn('AI recommender error:', err);
    }
    // Fallback: latest from DEMO_CONTENT or TMDB
    const fallback = (window.DEMO_CONTENT || DEMO_CONTENT).slice(0, 12);
    grid.innerHTML = fallback.map(item => UI.posterCard(item, {})).join('');
  }

  return { init };
})();

window.HomePage = HomePage;
