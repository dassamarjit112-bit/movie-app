/* CineStream — Standalone Gift Code Controller */

const GiftCodePage = (() => {
  async function init() {
    // Render Shell Layout
    document.getElementById('navbar-mount').innerHTML = UI.renderNavbar('subscribe');
    document.getElementById('footer-mount').innerHTML = UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = UI.renderMobileNav('subscribe');
    UI.updateNavbarUser();
    UI.initRipples();

    // Check auth session
    const session = await window.Auth.getSession();

    const input = document.getElementById('standalone-gift-input');
    const btn = document.getElementById('standalone-gift-btn');
    const feedback = document.getElementById('standalone-gift-feedback');

    if (!btn || !input) return;

    btn.onclick = async () => {
      if (!session) {
        UI.toast('Please sign in to redeem a gift code.', 'info');
        Router.navigate('login');
        return;
      }

      const code = input.value.trim();
      if (!code) {
        UI.toast('Please enter a valid gift code.', 'warning');
        return;
      }

      UI.setLoading(btn, true);
      feedback.style.display = 'none';

      try {
        const res = await Subscriptions.redeemGiftCode(code, session.user.id);
        
        feedback.innerHTML = `<span class="material-symbols-outlined" style="vertical-align:middle; font-size:16px; margin-right:4px;">check_circle</span> Code activated! Standard plan unlocked until ${UI.formatDate(res.end_date)}`;
        feedback.className = 'text-green';
        feedback.style.color = '#32dc78';
        feedback.style.display = 'block';
        
        UI.toast('Voucher redeemed successfully!', 'success');
        input.value = '';

        // Navigate to account to see updated plan details
        setTimeout(() => {
          Router.navigate('account');
        }, 1500);

      } catch (err) {
        feedback.innerHTML = `<span class="material-symbols-outlined" style="vertical-align:middle; font-size:16px; margin-right:4px;">error</span> ${err.message}`;
        feedback.className = 'text-red';
        feedback.style.color = '#ff6b6b';
        feedback.style.display = 'block';
      } finally {
        UI.setLoading(btn, false);
      }
    };
  }

  return { init };
})();

window.GiftCodePage = GiftCodePage;
