/**
 * apk.js — CricZ TV APK Download Handler
 * Handles APK download via anchor tag with Android intent fallback.
 */

(function () {
  // ── Mount Navbar & Mobile Nav ──────────────────────────────────────────────
  const navbar = document.getElementById('navbar-mount');
  if (navbar && window.UI) navbar.innerHTML = UI.renderNavbar('');

  const mobileNav = document.getElementById('mobile-nav-mount');
  if (mobileNav && window.UI) mobileNav.innerHTML = UI.renderMobileNav('');

  if (window.UI) {
    UI.updateNavbarUser?.();
    UI.initRipples?.();
  }

  // ── APK Config ────────────────────────────────────────────────────────────
  const APK_FILENAME = 'SDCineStream.apk';
  const APK_PATH     = '/' + APK_FILENAME;          // served from root

  // ── Intent URL builder ────────────────────────────────────────────────────
  const buildIntentUrl = () => {
    const directApkUrl = window.location.origin + '/SDCineStream.apk';
    return `intent://${directApkUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
  };

  // ── Attempt Android intent with visibility guard ──────────────────────────
  const attemptIntent = (intentUrl) => {
    let hidden = false;

    const onHide = () => { hidden = true; };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onHide);

    window.location.href = intentUrl;

    setTimeout(() => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', onHide);
    }, 2000);
  };

  // ── Primary download trigger ───────────────────────────────────────────────
  const triggerDownload = () => {
    // 1️⃣  Standard anchor-based download (works in most browsers)
    const a = document.createElement('a');
    a.href     = APK_PATH;
    a.download = APK_FILENAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 2️⃣  Fallback: Android intent direct download (after brief delay)
    setTimeout(() => {
      const intentUrl = buildIntentUrl();
      attemptIntent(intentUrl);
    }, 1500);
  };

  // ── Wire up the download button ───────────────────────────────────────────
  const downloadBtn = document.getElementById('apk-download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', triggerDownload);
  }
})();
