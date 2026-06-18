(function () {
  function initAdBanner() {
    console.log('[Adcash] initAdBanner called');
    const container = document.getElementById('global-ad-banner') || document.getElementById('ad-banner-container');
    if (!container) {
      console.warn('[Adcash] No ad container found');
      return;
    }
    container.style.minHeight = '60px';
    function onLoad() { console.log('[Adcash] Banner loaded'); }
    function onError(e) { console.error('[Adcash] Banner error', e); }
    function tryRun() {
      if (window.aclib && typeof aclib.runBanner === 'function') {
        try { aclib.runBanner({ zoneId: 'x89bizpkdk', onLoad, onError }); }
        catch (e) { console.warn('[Adcash] callbacks not supported, calling without them'); aclib.runBanner({ zoneId: 'x89bizpkdk' }); }
        return true;
      }
      return false;
    }
    if (!tryRun()) {
      const interval = setInterval(() => { if (tryRun()) clearInterval(interval); }, 200);
    }
  }
  window.initAdBanner = initAdBanner;
})();
