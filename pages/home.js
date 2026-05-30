/* CineStream — Home Page Controller */

// ── Demo content data (replaces Supabase for offline/demo use) ──
const DEMO_CONTENT = [
  { id:'1', title:'Void Walker', type:'movie', genre:'Sci-Fi', year:2024, duration:122, imdb:'8.4',
    poster:'https://images.unsplash.com/photo-1518676590629-3dcbd9cf5e8c?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1518676590629-3dcbd9cf5e8c?w=800&q=80&auto=format',
    description:'A haunting journey through the fabric of reality where memory and machine merge into one.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'2', title:'Velocity Shift', type:'movie', genre:'Action', year:2023, duration:108, imdb:'7.8',
    poster:'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&q=80&auto=format',
    description:'Speed is all that separates survival from destruction in a world of underground racing.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'3', title:'The Silent Gate', type:'movie', genre:'Fantasy', year:2024, duration:145, imdb:'9.0',
    poster:'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80&auto=format',
    description:'An ancient doorway to another world opens — but closing it may cost everything.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'4', title:'Midnight Red', type:'movie', genre:'Drama', year:2024, duration:98, imdb:'8.1',
    poster:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80&auto=format',
    description:'A city lit by neon holds secrets darker than the night that hides them.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'5', title:'The Beacon', type:'movie', genre:'Thriller', year:2023, duration:115, imdb:'7.6',
    poster:'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80&auto=format',
    description:'Isolated on a cliff-side lighthouse, the keeper discovers she is not alone.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'6', title:'Neural Link', type:'movie', genre:'Sci-Fi', year:2024, duration:132, imdb:'8.7',
    poster:'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&q=80&auto=format',
    description:'The first human-AI neural bridge promises immortality — but whose consciousness survives?',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'7', title:'Eden Unveiled', type:'movie', genre:'Documentary', year:2023, duration:89, imdb:'8.5',
    poster:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&auto=format',
    description:'Breathtaking footage from the last untouched corners of our planet.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'8', title:'The Concrete Jungle', type:'series', genre:'Crime', year:2023, duration:52, imdb:'8.9',
    poster:'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80&auto=format',
    description:'A gritty look at power, corruption, and survival in the city that never sleeps.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8',
    seasons:2, episodes:['S2 E4','S2 E3'] },
  { id:'9', title:'Cosmic Horizons', type:'series', genre:'Documentary', year:2023, duration:45, imdb:'9.2',
    poster:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80&auto=format',
    description:'Journey to the edges of the known universe with stunning 8K astrophotography.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8',
    seasons:1, episodes:['E8','E7'] },
  { id:'10', title:'Point of Origin', type:'movie', genre:'Thriller', year:2024, duration:117, imdb:'7.9',
    poster:'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80&auto=format',
    description:'A detective investigates a series of impossible crimes with a common thread: they all happen at dawn.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'11', title:'Blue Note', type:'movie', genre:'Drama', year:2024, duration:104, imdb:'8.2',
    poster:'https://images.unsplash.com/photo-1415886411433-bc44ef4bdb88?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1415886411433-bc44ef4bdb88?w=800&q=80&auto=format',
    description:'A legendary jazz musician faces his final concert — and the truth about his life.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
  { id:'12', title:'Iron Veil', type:'movie', genre:'Action', year:2024, duration:136, imdb:'7.5',
    poster:'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&q=80&auto=format',
    thumbnail:'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&q=80&auto=format',
    description:'A covert ops specialist goes off-book to take down a shadow government.',
    stream:'https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8' },
];

window.DEMO_CONTENT = DEMO_CONTENT;

const HERO_SLIDES = [
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
    desc: 'An ancient doorway to another world opens — but closing it may cost everything you love. A fantasy epic for the ages.',
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

    // Hero carousel
    renderHeroSlide(0);
    startCarousel();
    setupCarouselDots();

    // Populate content
    setTimeout(() => {
      populateContinueWatching();
      populateTrending();
      populateNewReleases();
      populateRecommended();
      populateTopRated();
    }, 300);

    // Genre chips
    document.querySelectorAll('.genre-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  }

  function renderHeroSlide(idx) {
    const slide = HERO_SLIDES[idx];
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

    // Update dots
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

  function populateContinueWatching() {
    const row = document.getElementById('continue-watching-row');
    if (!row) return;
    const items = [
      { ...DEMO_CONTENT[7], episode: 'S2 E4', timeLeft: '42m left', progress: 65, duration: 100 },
      { ...DEMO_CONTENT[8], episode: 'E8', timeLeft: '15m left', progress: 82, duration: 100 },
      { ...DEMO_CONTENT[9], episode: '', timeLeft: '1h 12m left', progress: 30, duration: 100 },
      { ...DEMO_CONTENT[10], episode: '', timeLeft: '28m left', progress: 55, duration: 100 },
    ];
    row.innerHTML = items.map(item => UI.videoCard(item)).join('');
    UI.initVideoCardHovers();
  }

  function populateTrending() {
    const row = document.getElementById('trending-row');
    if (!row) return;
    const items = DEMO_CONTENT.slice(0, 8);
    row.innerHTML = items.map((item, i) =>
      UI.posterCard(item, { showRank: i < 3, rank: i + 1, size: 'poster-card-item' })
    ).join('');
  }

  function populateNewReleases() {
    const row = document.getElementById('new-releases-row');
    if (!row) return;
    const items = [...DEMO_CONTENT].sort(() => Math.random() - 0.5).slice(0, 6);
    row.innerHTML = items.map(item => UI.posterCard(item, { size: 'poster-card-item' })).join('');
  }

  async function populateRecommended() {
    const grid = document.getElementById('recommended-grid');
    if (!grid) return;
    
    try {
      const session = await window.Auth.getSession();
      const userId = session ? session.user.id : null;
      const items = await AIRecommender.getPersonalizedRecommendations(userId, 12);
      grid.innerHTML = items.map(item => UI.posterCard(item, {})).join('');
    } catch (err) {
      console.error('Error populating AI recommendations:', err);
      // Fallback
      const items = [...DEMO_CONTENT].sort(() => Math.random() - 0.5).slice(0, 12);
      grid.innerHTML = items.map(item => UI.posterCard(item, {})).join('');
    }
  }

  function populateTopRated() {
    const row = document.getElementById('top-rated-row');
    if (!row) return;
    const sorted = [...DEMO_CONTENT].sort((a, b) => parseFloat(b.imdb) - parseFloat(a.imdb)).slice(0, 8);
    row.innerHTML = sorted.map(item => UI.posterCard(item, { size: 'poster-card-item' })).join('');
  }

  return { init };
})();

window.HomePage = HomePage;
