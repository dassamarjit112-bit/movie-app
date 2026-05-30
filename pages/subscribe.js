/* CineStream — Subscription Page Controller */

const SubscribePage = (() => {
  async function init() {
    // Render Navigation & Footer
    document.getElementById('navbar-mount').innerHTML = UI.renderNavbar('subscribe');
    document.getElementById('footer-mount').innerHTML = UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = UI.renderMobileNav('subscribe');
    UI.updateNavbarUser();
    UI.initRipples();

    // Check if user is logged in
    const session = await window.Auth.getSession();
    let activePlanId = null;

    if (session) {
      try {
        const sub = await Subscriptions.getUserSubscription(session.user.id);
        if (sub) {
          // Check expiration
          if (new Date(sub.end_date) > new Date()) {
            activePlanId = sub.plan_id;
          }
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
      }
    }

    // Populate Pricing Cards
    populatePlans(activePlanId, session);

    // Setup Gift Code Redemption
    setupGiftRedemption(session);
  }

  function populatePlans(activePlanId, session) {
    const grid = document.getElementById('plans-grid');
    if (!grid) return;

    const plans = Subscriptions.getPlans();
    grid.innerHTML = plans.map(plan => {
      const isActive = plan.id === activePlanId;
      const isFeatured = plan.featured;
      const color = plan.color;

      return `
        <div class="glass-card plan-card" style="padding:40px 32px; border-radius:20px; display:flex; flex-direction:column; position:relative; overflow:hidden;
          border:${isActive ? `2.5px solid ${color}` : isFeatured ? '1.5px solid var(--c-secondary-container)' : '1px solid rgba(255,255,255,0.07)'};
          box-shadow:${isActive ? `0 0 45px rgba(20,209,255,0.15)` : isFeatured ? '0 10px 40px rgba(0,0,0,0.45)' : 'none'};">
          
          ${isFeatured ? `<div style="position:absolute; top:16px; right:-32px; background:var(--c-secondary-container); color:#000; font-size:10px; font-weight:800; padding:4px 36px; transform:rotate(45deg); letter-spacing:0.06em; text-transform:uppercase;">Popular</div>` : ''}
          ${isActive ? `<div style="position:absolute; top:12px; left:16px; display:flex; align-items:center; gap:6px;"><span class="badge badge-green" style="font-size:9.5px; border-radius:4px;">ACTIVE PLAN</span></div>` : ''}

          <div style="margin-bottom:24px;">
            <h3 style="font-family:'Montserrat',sans-serif; font-size:22px; font-weight:700; color:#fff; display:flex; align-items:center; gap:8px;">
              ${plan.name}
            </h3>
            <div style="display:flex; align-items:baseline; gap:4px; margin-top:12px;">
              <span style="font-size:36px; font-weight:800; color:#fff;">$${plan.price}</span>
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

          <!-- Action Button -->
          ${isActive 
            ? `<button class="btn btn-ghost" style="width:100%; border-radius:10px; border-color:var(--c-tertiary-container); color:rgba(229,226,225,0.5); cursor:not-allowed;" disabled>Current Active Plan</button>`
            : `<button class="btn ${isFeatured ? 'btn-primary' : 'btn-ghost'}" style="width:100%; border-radius:10px; font-weight:700; ${isFeatured ? '' : `border-color:${color}; color:${color}`}" 
                onclick="SubscribePage.checkout('${plan.id}')">Subscribe Now</button>`
          }
        </div>
      `;
    }).join('');
  }

  async function checkout(planId) {
    const session = await window.Auth.getSession();
    if (!session) {
      UI.toast('Please sign in or register to complete subscription.', 'info');
      Router.navigate('login');
      return;
    }

    const plan = Subscriptions.PLANS.find(p => p.id === planId);
    
    // Launch dynamic modal confirmation
    UI.showModal({
      title: `Confirm Premium Access`,
      content: `Activate the <strong>CineStream ${plan.name}</strong> access tier for <strong>$${plan.price}/month</strong>? (Simulated sandbox checkout — no actual credit card is charged).`,
      confirmText: 'Pay & Activate',
      cancelText: 'Cancel',
      onConfirm: async () => {
        const bodyBtn = document.body; // mock loading indicator via top progress
        const loadBar = document.getElementById('top-loading-bar');
        if (loadBar) { loadBar.style.width = '40%'; loadBar.style.opacity = '1'; }

        try {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 30); // 30 day subscription duration

          // Save active subscription in database
          const { error } = await window.sb
            .from('subscriptions')
            .upsert({
              user_id: session.user.id,
              plan_id: planId,
              status: 'active',
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              source: 'payment',
              updated_at: new Date().toISOString()
            });

          if (error) throw error;

          if (loadBar) loadBar.style.width = '100%';
          setTimeout(() => { if (loadBar) loadBar.style.opacity = '0'; }, 300);

          UI.toast(`Welcome to Premium! activated CineStream ${plan.name}`, 'success');
          
          // Re-init subscription page to update buttons
          init();
        } catch (err) {
          UI.toast('Checkout failed. Please try again.', 'error');
        }
      }
    });
  }

  function setupGiftRedemption(session) {
    const input = document.getElementById('gift-code-input');
    const btn = document.getElementById('gift-code-btn');
    const feedback = document.getElementById('gift-feedback');

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
        
        UI.toast('Gift code redeemed successfully!', 'success');
        input.value = '';

        // Refresh Pricing grid and user navbar
        init();
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

  return { init, checkout };
})();

window.SubscribePage = SubscribePage;
