/* ============================================================
   CineStream — SPA Router
   Hash-based routing with auth guards and page transitions
   ============================================================ */

const Router = (() => {
  // Route registry
  const routes = {
    'login':       { page: 'pages/login.html',     auth: false },
    'home':        { page: 'pages/home.html',       auth: true  },
    'movies':      { page: 'pages/movies.html',     auth: true  },
    'tvshows':     { page: 'pages/tvshows.html',    auth: true  },
    'detail':      { page: 'pages/detail.html',     auth: true  },
    'player':      { page: 'pages/player.html',     auth: true  },
    'subscribe':   { page: 'pages/subscribe.html',  auth: true  },
    'giftcode':    { page: 'pages/giftcode.html',   auth: true  },
    'account':     { page: 'pages/account.html',    auth: true  },
  };

  const appEl = document.getElementById('app');
  const loadingBar = document.getElementById('top-loading-bar');
  let currentRoute = null;

  // ── Navigate to a route ──
  function navigate(route, params = {}) {
    const hash = params && Object.keys(params).length
      ? `#/${route}?${new URLSearchParams(params).toString()}`
      : `#/${route}`;
    window.location.hash = hash;
  }

  // ── Parse hash ──
  function parseHash() {
    const hash = window.location.hash.replace('#/', '') || 'home';
    const [route, queryStr] = hash.split('?');
    const params = {};
    if (queryStr) {
      new URLSearchParams(queryStr).forEach((v, k) => params[k] = v);
    }
    return { route: route || 'home', params };
  }

  // ── Load page HTML ──
  async function loadPage(pageFile) {
    // Show loading bar
    if (loadingBar) {
      loadingBar.style.width = '30%';
      loadingBar.style.opacity = '1';
    }

    try {
      const res = await fetch(pageFile);
      if (!res.ok) throw new Error(`Page not found: ${pageFile}`);
      const html = await res.text();

      if (loadingBar) loadingBar.style.width = '90%';
      return html;
    } catch (e) {
      console.error('Router: Failed to load page', e);
      return `<div class="flex-center" style="min-height:100vh;flex-direction:column;gap:16px;">
        <span class="material-symbols-outlined" style="font-size:64px;color:var(--c-primary-container)">error</span>
        <h2 class="text-headline-md">Page not found</h2>
        <button class="btn btn-primary" onclick="Router.navigate('home')">Go Home</button>
      </div>`;
    }
  }

  // ── Render a page ──
  async function render() {
    const { route, params } = parseHash();
    const routeConfig = routes[route] || routes['home'];

    // Store params globally for pages to read
    window.RouterParams = params;

    // Auth guard
    if (routeConfig.auth) {
      const session = await window.Auth.getSession();
      if (!session) {
        navigate('login');
        return;
      }
    }

    // Already on same route (no-op unless forced)
    if (currentRoute === route && !params.force) {
      // still run page init
      runPageInit(route);
      return;
    }

    currentRoute = route;
    const html = await loadPage(routeConfig.page);

    // Inject HTML
    appEl.innerHTML = `<div class="page-container">${html}</div>`;

    // Hide loading bar
    if (loadingBar) {
      loadingBar.style.width = '100%';
      setTimeout(() => {
        loadingBar.style.opacity = '0';
        loadingBar.style.width = '0%';
      }, 300);
    }

    // Update nav active states
    updateNavActive(route);

    // Run page-specific init
    runPageInit(route, params);

    // Run intersection observer for section animations
    initSectionObserver();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ── Route-specific initialization ──
  function runPageInit(route, params = {}) {
    switch (route) {
      case 'login':       window.LoginPage?.init(); break;
      case 'home':        window.HomePage?.init(); break;
      case 'movies':      window.MoviesPage?.init(); break;
      case 'tvshows':     window.TVShowsPage?.init(); break;
      case 'detail':      window.DetailPage?.init(params); break;
      case 'player':      window.PlayerPage?.init(params); break;
      case 'subscribe':   window.SubscribePage?.init(); break;
      case 'giftcode':    window.GiftCodePage?.init(); break;
      case 'account':     window.AccountPage?.init(); break;
    }
  }

  // ── Update navbar active state ──
  function updateNavActive(route) {
    document.querySelectorAll('[data-nav-link]').forEach(el => {
      el.classList.remove('active');
      if (el.dataset.navLink === route) el.classList.add('active');
    });

    document.querySelectorAll('.mobile-nav-item').forEach(el => {
      el.classList.remove('active');
      if (el.dataset.route === route) el.classList.add('active');
    });
  }

  // ── Intersection Observer for section animations ──
  function initSectionObserver() {
    const sections = document.querySelectorAll('.section');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    sections.forEach(s => observer.observe(s));
  }

  // ── Bootstrap ──
  function init() {
    window.addEventListener('hashchange', render);
    render();

    // Handle scroll for navbar
    window.addEventListener('scroll', () => {
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
      }
    });
  }

  return { navigate, init, parseHash };
})();

window.Router = Router;
