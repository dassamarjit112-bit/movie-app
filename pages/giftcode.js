/* CineStream — Standalone Gift Code Controller */

const GiftCodePage = (() => {
  async function init() {
    console.log('[GiftCode] Page initializing...');
    
    // Render Shell Layout
    const navbarMount = document.getElementById('navbar-mount');
    const footerMount = document.getElementById('footer-mount');
    const mobileNavMount = document.getElementById('mobile-nav-mount');
    
    if (navbarMount) navbarMount.innerHTML = UI.renderNavbar('subscribe');
    if (footerMount) footerMount.innerHTML = UI.renderFooter();
    if (mobileNavMount) mobileNavMount.innerHTML = UI.renderMobileNav('subscribe');
    
    UI.updateNavbarUser();
    UI.initRipples();

    const input = document.getElementById('standalone-gift-input');
    const btn = document.getElementById('standalone-gift-btn');
    const feedback = document.getElementById('standalone-gift-feedback');

    console.log('[GiftCode] Elements found:', { input: !!input, btn: !!btn, feedback: !!feedback });

    if (!btn || !input) {
      console.error('[GiftCode] Critical elements not found!');
      return;
    }

    // Make button visually obvious it's clickable
    btn.style.cursor = 'pointer';
    btn.style.pointerEvents = 'auto';
    
    // Enable input
    input.disabled = false;
    input.style.pointerEvents = 'auto';

    btn.onclick = async (e) => {
      e.preventDefault();
      console.log('[GiftCode] Button clicked!');
      
      // Get fresh session
      const currentSession = await window.Auth.getSession();
      console.log('[GiftCode] Session:', currentSession ? 'found' : 'not found');
      
      if (!currentSession) {
        UI.toast('Please sign in to redeem a gift code.', 'info');
        Router.navigate('login');
        return;
      }

      const code = input.value.trim();
      console.log('[GiftCode] Code entered:', code);
      
      if (!code) {
        UI.toast('Please enter a valid gift code.', 'warning');
        return;
      }

      // Show loading state
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:3px"></span> Processing...';
      if (feedback) {
        feedback.style.display = 'none';
      }

      try {
        console.log('[GiftCode] Redeeming code:', code, 'for user:', currentSession.user.id);
        
        // Call redemption
        const res = await Subscriptions.redeemGiftCode(code, currentSession.user.id);
        console.log('[GiftCode] Redemption successful:', res);
        
        // Show success feedback
        if (feedback) {
          feedback.innerHTML = `<span class="material-symbols-outlined" style="vertical-align:middle; font-size:16px; margin-right:4px;">check_circle</span> <strong>Success!</strong> Plan active until ${UI.formatDate(res.end_date)}`;
          feedback.style.cssText = 'display:block; color:#32dc78; font-size:13.5px; font-weight:600; text-align:center; margin-top:8px; line-height:1.4; padding:12px; background:rgba(50,220,120,0.1); border-radius:8px; border:1px solid rgba(50,220,120,0.2);';
        }
        
        UI.toast('🎉 Gift code redeemed successfully! Check your account.', 'success', 5000);
        input.value = '';

        // Update navbar to reflect subscription
        await UI.updateNavbarUser();

        // Show success modal
        setTimeout(() => {
          UI.showModal({
            title: '✨ Gift Activated!',
            content: `Your code <strong>${code}</strong> has been redeemed successfully!<br>Plan active until <strong>${UI.formatDate(res.end_date)}</strong>`,
            confirmText: 'View Account',
            cancelText: '',
            dangerous: false,
            onConfirm: () => {
              Router.navigate('account');
            }
          });
        }, 500);

      } catch (err) {
        console.error('[GiftCode] Redemption error:', err);
        
        // Show error feedback
        if (feedback) {
          feedback.innerHTML = `<span class="material-symbols-outlined" style="vertical-align:middle; font-size:16px; margin-right:4px;">error</span> <strong>Error:</strong> ${err.message}`;
          feedback.style.cssText = 'display:block; color:#ff6b6b; font-size:13.5px; font-weight:600; text-align:center; margin-top:8px; line-height:1.4; padding:12px; background:rgba(255,107,107,0.1); border-radius:8px; border:1px solid rgba(255,107,107,0.2);';
        }
        
        UI.toast(err.message || 'Failed to redeem code. Please try again.', 'error', 5000);
        
        // Reset button text
        btn.innerHTML = 'REDEEM PASS';
        btn.disabled = false;
      }
    };

    console.log('[GiftCode] Page initialized successfully');
  }

  return { init };
})();

window.GiftCodePage = GiftCodePage;
