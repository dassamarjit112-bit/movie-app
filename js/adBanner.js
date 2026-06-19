(function () {
  function initAdBanner() {
    const containerId = 'ad-banner-inner';
    const container = document.getElementById(containerId);
    
    if (!container) {
      return;
    }

    const adsterraKey = 'f777d033819679364b129d2d85e61f5e'; 

    if (container.dataset.loadedKey === adsterraKey) {
      // Ad already loaded for this SPA session
      return;
    }

    container.innerHTML = ''; // Clear previous
    container.dataset.loadedKey = adsterraKey;

    // SPA-Safe Adsterra injection using an isolated iframe
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
          <script>
            atOptions = {
              'key' : '${adsterraKey}',
              'format' : 'iframe',
              'height' : 50,
              'width' : 320,
              'params' : {}
            };
          </script>
          <script src="https://formssternlystately.com/${adsterraKey}/invoke.js"></script>
        </body>
      </html>
    `;
    
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
  }
  
  window.initAdBanner = initAdBanner;
})();
