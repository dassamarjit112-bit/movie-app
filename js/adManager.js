/* CineStream — Ad Manager */

const AdManager = (() => {
  // Obfuscated Adsterra keys to prevent simple string matching by blockers
  const B_KEY = 'f777d033819679364b129d2d85e61f5e';
  const BANNER_URL = 'aHR0cHM6Ly9mb3Jtc3N0ZXJubHlzdGF0ZWx5LmNvbS9mNzc3ZDAzMzgxOTY3OTM2NGIxMjlkMmQ4NWU2MWY1ZS9pbnZva2UuanM=';
  const SOCIAL_BAR_URL = 'aHR0cHM6Ly9mb3Jtc3N0ZXJubHlzdGF0ZWx5LmNvbS9iMC9lNy8wZi9iMGU3MGZkMDFmNTM1MzY4MWNhNWU1MGYzMWJhZDBmYS5qcw==';

  function initSocialBar() {
    try {
      const script = document.createElement('script');
      script.src = atob(SOCIAL_BAR_URL);
      script.type = 'text/javascript';
      script.async = true;
      document.body.appendChild(script);
    } catch (e) { console.warn('AdManager init error'); }
  }

  function injectBanner(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Check if already injected
    if (container.querySelector('.ad-320x50')) return;

    // Clear existing content
    container.innerHTML = '';
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'ad-320x50';
    
    // Inject atOptions
    const optScript = document.createElement('script');
    optScript.type = 'text/javascript';
    optScript.innerHTML = `
      window.atOptions = {
        'key' : '${B_KEY}',
        'format' : 'iframe',
        'height' : 50,
        'width' : 320,
        'params' : {}
      };
    `;
    
    // Inject invoke script
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = atob(BANNER_URL);
    
    wrapper.appendChild(optScript);
    wrapper.appendChild(invokeScript);
    container.appendChild(wrapper);
  }

  // Hook for router.js to call after page renders
  window.initAdBanner = function() {
    injectBanner('global-ad-banner');
    injectBanner('content-ad-banner-1');
    injectBanner('content-ad-banner-2');
  };

  // Auto-init social bar after a brief delay
  setTimeout(() => {
    initSocialBar();
  }, 1500);

  return { initSocialBar, injectBanner };
})();

window.AdManager = AdManager;
