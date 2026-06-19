(function () {
  function initAdBanner() {
    console.log('[Adsterra] initAdBanner called');
    const containerId = 'ad-banner-inner';
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.warn('[Adsterra] No ad container found');
      return;
    }

    // IMPORTANT: Replace 'YOUR_ADSTERRA_KEY_HERE' with your actual 320x50 Adsterra key string
    const adsterraKey = 'YOUR_ADSTERRA_KEY_HERE'; 

    if (container.dataset.loadedKey === adsterraKey) {
      // Ad already loaded for this SPA session
      return;
    }

    container.innerHTML = ''; // Clear previous
    container.dataset.loadedKey = adsterraKey;

    // SPA-Safe Adsterra injection using an isolated iframe
    // This prevents document.write from wiping out the app
    const iframe = document.createElement('iframe');
    iframe.width = "320";
    iframe.height = "50";
    iframe.frameBorder = "0";
    iframe.scrolling = "no";
    iframe.style.margin = "0";
    iframe.style.padding = "0";
    iframe.style.background = "transparent";
    
    container.appendChild(iframe);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>body { margin: 0; padding: 0; background: transparent; }</style>
        </head>
        <body>
          <script type="text/javascript">
            atOptions = {
              'key' : '${adsterraKey}',
              'format' : 'iframe',
              'height' : 50,
              'width' : 320,
              'params' : {}
            };
          </script>
          <script type="text/javascript" src="//www.highperformanceformat.com/${adsterraKey}/invoke.js"></script>
        </body>
      </html>
    `;
    
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
  }
  
  window.initAdBanner = initAdBanner;
})();
