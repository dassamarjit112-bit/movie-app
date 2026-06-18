/**
 * apk.js — SDCineStream APK Download Handler
 * Shows animated progress overlay, then triggers the real APK download.
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
  const APK_PATH     = '/' + APK_FILENAME;   // served from root

  // ── Overlay elements ──────────────────────────────────────────────────────
  const overlay   = document.getElementById('apk-dl-overlay');
  const circle    = document.getElementById('apk-dl-circle');
  const pctEl     = document.getElementById('apk-dl-pct');
  const barEl     = document.getElementById('apk-dl-bar');
  const statusEl  = document.getElementById('apk-dl-status');
  const downloadBtn = document.getElementById('apk-download-btn');

  // SVG circle circumference (r=52) → 2πr ≈ 326.73
  const CIRCUMFERENCE = 2 * Math.PI * 52;

  // ── Status messages shown at different progress stages ────────────────────
  const STAGES = [
    { at: 0,   msg: 'Preparing download…' },
    { at: 15,  msg: 'Connecting to server…' },
    { at: 35,  msg: 'Fetching SDCineStream.apk…' },
    { at: 60,  msg: 'Downloading… please wait' },
    { at: 85,  msg: 'Almost done!' },
    { at: 100, msg: '✓ Download complete!' },
  ];

  // ── Update ring + bar + percentage ───────────────────────────────────────
  function setProgress(pct) {
    const offset = CIRCUMFERENCE * (1 - pct / 100);
    if (circle)  circle.style.strokeDashoffset = offset;
    if (barEl)   barEl.style.width = pct + '%';
    if (pctEl)   pctEl.textContent = Math.round(pct) + '%';

    // Update status message
    let msg = STAGES[0].msg;
    for (const s of STAGES) {
      if (pct >= s.at) msg = s.msg;
    }
    if (statusEl) statusEl.textContent = msg;
  }

  // ── Animate progress from 0 → 100 over ~3 seconds ────────────────────────
  function runAnimation(onComplete) {
    let pct = 0;
    const TOTAL_MS  = 3200;
    const INTERVAL  = 60;
    const steps     = TOTAL_MS / INTERVAL;
    const increment = 100 / steps;

    setProgress(0);

    const timer = setInterval(() => {
      pct = Math.min(pct + increment, 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(timer);
        // Brief pause at 100% before completing
        setTimeout(onComplete, 500);
      }
    }, INTERVAL);
  }

  // ── Trigger the actual file download ──────────────────────────────────────
  function triggerFileDownload() {
    // Standard anchor-based download
    const a = document.createElement('a');
    a.href     = APK_PATH;
    a.download = APK_FILENAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Fallback: Android intent direct download
    setTimeout(() => {
      const directApkUrl = window.location.origin + '/' + APK_FILENAME;
      const intentUrl = `intent://${directApkUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
      window.location.href = intentUrl;
    }, 1500);
  }

  // ── Main click handler ────────────────────────────────────────────────────
  function handleDownloadClick() {
    if (!overlay) {
      // Fallback: no overlay element, download directly
      triggerFileDownload();
      return;
    }

    // Disable button while downloading
    if (downloadBtn) downloadBtn.classList.add('is-downloading');

    // Show overlay
    overlay.style.display = 'flex';

    // Run the animation, then trigger real download
    runAnimation(() => {
      // Keep overlay visible 0.5s at 100%, then hide and download
      setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.4s ease';
        setTimeout(() => {
          overlay.style.display = 'none';
          overlay.style.opacity = '';
          overlay.style.transition = '';
          if (downloadBtn) downloadBtn.classList.remove('is-downloading');

          // Trigger the real APK download
          triggerFileDownload();
        }, 400);
      }, 300);
    });
  }

  // ── Wire up button ────────────────────────────────────────────────────────
  if (downloadBtn) {
    downloadBtn.addEventListener('click', handleDownloadClick);
  }

  // ── Dismiss overlay on backdrop click (in case user wants to cancel) ──────
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
        if (downloadBtn) downloadBtn.classList.remove('is-downloading');
      }
    });
  }
})();
