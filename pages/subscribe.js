/* CineStream — Subscription Page Controller (v2 — Gift Code Required) */

const SubscribePage = (() => {
  async function init() {
    document.getElementById('navbar-mount').innerHTML = UI.renderNavbar('subscribe');
    document.getElementById('footer-mount').innerHTML = UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = UI.renderMobileNav('subscribe');
    UI.updateNavbarUser();
    UI.initRipples();

    const session = await window.Auth.getSession();
    let activePlanId = null;

    if (session) {
      try {
        const sub = await Subscriptions.getUserSubscription(session.user.id);
        if (sub && new Date(sub.end_date) > new Date()) {
          activePlanId = sub.plan_id;
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
      }
    }

    populatePlans(activePlanId, session);
    setupGiftRedemption(session);
  }

  function populatePlans(activePlanId, session) {
    const grid = document.getElementById('plans-grid');
    if (!grid) return;

    const plans = Subscriptions.getPlans();
    grid.innerHTML = plans.map(plan => {
      const isActive   = plan.id === activePlanId;
      const isFeatured = plan.featured;
      const color      = plan.color;

      return `
        <div class="glass-card plan-card" style="
          padding:40px 32px; border-radius:20px; display:flex; flex-direction:column;
          position:relative; overflow:hidden;
          border:${isActive ? `2.5px solid ${color}` : isFeatured ? '1.5px solid var(--c-secondary-container)' : '1px solid rgba(255,255,255,0.07)'};
          box-shadow:${isActive ? `0 0 45px rgba(20,209,255,0.15)` : isFeatured ? '0 10px 40px rgba(0,0,0,0.45)' : 'none'};
          transition: transform 0.2s, box-shadow 0.2s;"
          onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 20px 60px rgba(0,0,0,0.5)'"
          onmouseout="this.style.transform=''; this.style.boxShadow='${isActive ? '0 0 45px rgba(20,209,255,0.15)' : isFeatured ? '0 10px 40px rgba(0,0,0,0.45)' : 'none'}'">

          ${isFeatured ? `<div style="position:absolute; top:16px; right:-32px; background:var(--c-secondary-container); color:#000; font-size:10px; font-weight:800; padding:4px 36px; transform:rotate(45deg); letter-spacing:0.06em; text-transform:uppercase;">Popular</div>` : ''}
          ${isActive   ? `<div style="position:absolute; top:12px; left:16px;"><span class="badge badge-green" style="font-size:9.5px;">ACTIVE PLAN</span></div>` : ''}

          <div style="margin-bottom:24px;">
            <h3 style="font-family:'Montserrat',sans-serif; font-size:22px; font-weight:700; color:#fff;">${plan.name}</h3>
            <div style="display:flex; align-items:baseline; gap:4px; margin-top:12px;">
              <span style="font-size:36px; font-weight:800; color:#fff;">₹${plan.price}</span>
              <span style="font-size:13px; color:rgba(229,226,225,0.45)">/ ${plan.period}</span>
            </div>
            <p style="font-size:12px; font-weight:700; letter-spacing:0.04em; color:${color}; text-transform:uppercase; margin-top:8px;">
              ${plan.quality} RESOLUTION
            </p>
          </div>

          <!-- Feature Bullets -->
          <ul style="list-style:none; display:flex; flex-direction:column; gap:12px; margin-bottom:40px; flex:1;">
            ${plan.features.map(f => `
              <li style="display:flex; gap:10px; font-size:13.5px; color:rgba(229,226,225,0.75); align-items:center;">
                <span class="material-symbols-outlined" style="color:${color}; font-size:18px">check_circle</span>
                <span>${f}</span>
              </li>
            `).join('')}
          </ul>

          <!-- Gift Code Required CTA -->
          ${isActive
            ? `<button class="btn btn-ghost" style="width:100%; border-radius:10px; border-color:var(--c-tertiary-container); color:rgba(229,226,225,0.5); cursor:not-allowed;" disabled>Current Active Plan</button>`
            : `<div style="display:flex; flex-direction:column; gap:10px;">
                <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px 14px; display:flex; align-items:center; gap:8px;">
                  <span class="material-symbols-outlined" style="color:var(--c-secondary-container); font-size:18px; flex-shrink:0;">card_giftcard</span>
                  <input type="text" id="inline-code-${plan.id}" placeholder="Enter gift code to activate"
                         style="background:none; border:none; outline:none; color:#fff; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; width:100%;">
                </div>
                <button class="btn ${isFeatured ? 'btn-primary' : 'btn-ghost'}" style="width:100%; border-radius:10px; font-weight:700; ${isFeatured ? '' : `border-color:${color}; color:${color}`}"
                    onclick="SubscribePage.activateWithCode('${plan.id}')">
                  <span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">lock_open</span>
                  Activate with Gift Code
                </button>
                <p style="font-size:11px; color:rgba(229,226,225,0.35); text-align:center; margin:0;">
                  A valid gift code is required to activate this plan
                </p>
              </div>`
          }
        </div>
      `;
    }).join('');
  }

  async function activateWithCode(planId) {
    const session = await window.Auth.getSession();
    if (!session) {
      UI.toast('Please sign in to activate a plan.', 'info');
      Router.navigate('login');
      return;
    }

    const input = document.getElementById(`inline-code-${planId}`);
    const code  = (input?.value || '').trim().toUpperCase();

    if (!code || code.length < 6) {
      UI.toast('Please enter a valid gift code to activate this plan.', 'warning');
      if (input) {
        input.style.borderColor = 'var(--c-primary-container)';
        input.focus();
      }
      return;
    }

    const plan = Subscriptions.PLANS.find(p => p.id === planId);
    if (!plan) return;

    // Show loading state on button
    const btn = input?.closest('div')?.parentElement?.querySelector('button:not([disabled])');
    if (btn) UI.setLoading(btn, true);

    try {
      const res = await Subscriptions.redeemGiftCode(code, session.user.id);

      UI.toast(`🎉 Gift code accepted! ${plan.name} plan is now active until ${UI.formatDate(res.end_date)}`, 'success');
      if (input) input.value = '';
      // Refresh the plan grid
      init();

    } catch (err) {
      UI.toast(`Invalid gift code: ${err.message}`, 'error');
      if (input) {
        input.style.color = '#ff6b6b';
        setTimeout(() => { if (input) input.style.color = ''; }, 2000);
      }
    } finally {
      if (btn) UI.setLoading(btn, false);
    }
  }

  function setupGiftRedemption(session) {
    const input    = document.getElementById('gift-code-input');
    const btn      = document.getElementById('gift-code-btn');
    const feedback = document.getElementById('gift-feedback');

    if (!btn || !input) return;

    btn.onclick = async () => {
      if (!session) {
        UI.toast('Please sign in to redeem a gift code.', 'info');
        Router.navigate('login');
        return;
      }

      const code = input.value.trim().toUpperCase();
      if (!code || code.length < 6) {
        UI.toast('Please enter a valid gift code.', 'warning');
        return;
      }

      UI.setLoading(btn, true);
      feedback.style.display = 'none';

      try {
        const res = await Subscriptions.redeemGiftCode(code, session.user.id);

        feedback.innerHTML = `
          <span class="material-symbols-outlined" style="vertical-align:middle; font-size:16px; margin-right:4px;">check_circle</span>
          Code activated! Plan unlocked until ${UI.formatDate(res.end_date)}`;
        feedback.style.color  = '#32dc78';
        feedback.style.display = 'block';

        UI.toast('Gift code redeemed successfully! 🎉', 'success');
        input.value = '';
        init();
      } catch (err) {
        feedback.innerHTML = `
          <span class="material-symbols-outlined" style="vertical-align:middle; font-size:16px; margin-right:4px;">error</span>
          ${err.message}`;
        feedback.style.color  = '#ff6b6b';
        feedback.style.display = 'block';
      } finally {
        UI.setLoading(btn, false);
      }
    };

    // Allow Enter key
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  }

  return { init, activateWithCode };
})();

window.SubscribePage = SubscribePage;
