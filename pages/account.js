/* CineStream — Account Page Controller */

const AccountPage = (() => {
  let activeAvatarUrl = '';

  async function init() {
    // Render Shell Layout Nav
    document.getElementById('navbar-mount').innerHTML = UI.renderNavbar('account');
    document.getElementById('footer-mount').innerHTML = UI.renderFooter();
    document.getElementById('mobile-nav-mount').innerHTML = UI.renderMobileNav('account');
    UI.updateNavbarUser();
    UI.initRipples();

    const session = await window.Auth.getSession();
    if (!session) {
      UI.toast('Please login to view account dashboard.', 'info');
      Router.navigate('login');
      return;
    }

    const userId = session.user.id;

    // Bind tab events
    setupTabs(userId);

    // Profile Settings tab init
    await setupProfileTab(session);

    // Sign out button
    document.getElementById('account-signout-btn').onclick = async () => {
      UI.showModal({
        title: 'Sign Out',
        content: 'Are you sure you want to log out of CineStream? You will need to sign in again to access premium features.',
        confirmText: 'Sign Out',
        cancelText: 'Cancel',
        dangerous: true,
        onConfirm: async () => {
          await window.Auth.signOut();
          UI.toast('Logged out successfully.', 'info');
        }
      });
    };

    // Load initial tab datasets
    await loadSubscriptionDetails(userId);
    await loadWatchlist(userId);
    await loadWatchHistory(userId);
  }

  function setupTabs(userId) {
    const navButtons = document.querySelectorAll('.account-nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navButtons.forEach(btn => {
      btn.onclick = () => {
        // Toggle Nav State
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle Content Tab
        const targetTab = btn.dataset.tab;
        tabPanes.forEach(pane => {
          if (pane.id === `tab-${targetTab}`) {
            pane.style.display = 'block';
          } else {
            pane.style.display = 'none';
          }
        });
      };
    });
  }

  async function setupProfileTab(session) {
    const emailInput = document.getElementById('profile-email-input');
    const nameInput = document.getElementById('profile-name-input');
    const avatarImg = document.getElementById('profile-avatar-img');
    const changeBtn = document.getElementById('change-avatar-btn');
    const saveBtn = document.getElementById('save-profile-btn');

    if (!emailInput || !nameInput || !avatarImg) return;

    // Set standard email
    emailInput.value = session.user.email;

    // Fetch details
    const profile = await window.Auth.getProfile(session.user.id);
    const fullName = profile?.full_name || session.user.user_metadata?.full_name || 'CineStream User';
    activeAvatarUrl = profile?.avatar_url || session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=e50914&textColor=ffffff`;

    nameInput.value = fullName;
    avatarImg.src = activeAvatarUrl;

    // Dynamic Seed avatar randomizer
    changeBtn.onclick = () => {
      const styles = ['initials', 'bottts', 'adventurer', 'fun-emoji'];
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      const seed = Math.random().toString(36).substring(2, 9);
      activeAvatarUrl = `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${seed}&backgroundColor=e50914,14d1ff`;
      avatarImg.src = activeAvatarUrl;
      UI.toast('Avatar seed randomized! Save changes to apply.', 'info');
    };

    // Save changes
    saveBtn.onclick = async () => {
      const name = nameInput.value.trim();
      if (!name) {
        UI.toast('Please enter a valid display name.', 'warning');
        return;
      }

      UI.setLoading(saveBtn, true);
      try {
        await window.Auth.updateProfile(session.user.id, {
          full_name: name,
          avatar_url: activeAvatarUrl
        });
        UI.toast('Profile settings updated successfully!', 'success');
        UI.updateNavbarUser();
      } catch (err) {
        UI.toast('Failed to save profile. Please try again.', 'error');
      } finally {
        UI.setLoading(saveBtn, false);
      }
    };
  }

  async function loadSubscriptionDetails(userId) {
    const activeDisplay = document.getElementById('sub-active-display');
    const inactiveDisplay = document.getElementById('sub-inactive-display');
    const planNameEl = document.getElementById('sub-plan-name');
    const periodEl = document.getElementById('sub-period');
    const priceEl = document.getElementById('sub-price');
    const cancelBtn = document.getElementById('cancel-sub-btn');

    if (!activeDisplay || !inactiveDisplay) return;

    const sub = await Subscriptions.getUserSubscription(userId);
    const plans = Subscriptions.getPlans();

    if (sub && new Date(sub.end_date) > new Date()) {
      const plan = plans.find(p => p.id === sub.plan_id) || plans[1];
      
      planNameEl.textContent = `CineStream ${plan.name} (${plan.quality})`;
      priceEl.textContent = `$${plan.price}`;
      
      const renewText = sub.status === 'cancelled'
        ? `Cancelled — Access will expire on ${UI.formatDate(sub.end_date)}`
        : `Renews automatically on ${UI.formatDate(sub.end_date)}`;
      periodEl.textContent = renewText;

      activeDisplay.style.display = 'block';
      inactiveDisplay.style.display = 'none';

      // Setup Cancel Action
      if (sub.status === 'cancelled') {
        cancelBtn.style.display = 'none';
      } else {
        cancelBtn.style.display = 'inline-flex';
        cancelBtn.onclick = () => {
          UI.showModal({
            title: 'Cancel Membership',
            content: `Are you sure you want to cancel your active <strong>${plan.name}</strong> membership? You will retain standard streaming access until <strong>${UI.formatDate(sub.end_date)}</strong>.`,
            confirmText: 'Cancel Plan',
            cancelText: 'Keep Plan',
            dangerous: true,
            onConfirm: async () => {
              try {
                // Update status in Supabase subscription
                await window.sb
                  .from('subscriptions')
                  .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                  .eq('id', sub.id);

                UI.toast('Membership successfully cancelled.', 'success');
                // Reload dashboard
                await loadSubscriptionDetails(userId);
              } catch (err) {
                UI.toast('Failed to cancel membership.', 'error');
              }
            }
          });
        };
      }
    } else {
      activeDisplay.style.display = 'none';
      inactiveDisplay.style.display = 'block';
    }

    // Bind Quick Gift Code Box
    const giftInput = document.getElementById('quick-gift-input');
    const giftBtn = document.getElementById('quick-gift-btn');
    if (giftBtn && giftInput) {
      giftBtn.onclick = async () => {
        const code = giftInput.value.trim();
        if (!code) {
          UI.toast('Please enter a gift code.', 'warning');
          return;
        }

        UI.setLoading(giftBtn, true);
        try {
          await Subscriptions.redeemGiftCode(code, userId);
          UI.toast('Gift code successfully redeemed!', 'success');
          giftInput.value = '';
          
          // Reload subscription details
          await loadSubscriptionDetails(userId);
          UI.updateNavbarUser();
        } catch (err) {
          UI.toast(err.message || 'Failed to redeem gift code.', 'error');
        } finally {
          UI.setLoading(giftBtn, false);
        }
      };
    }
  }

  async function loadWatchlist(userId) {
    const grid = document.getElementById('account-watchlist-grid');
    const empty = document.getElementById('watchlist-empty');
    if (!grid) return;

    const list = await Subscriptions.getWatchlist(userId);

    if (list && list.length > 0) {
      grid.style.display = 'grid';
      if (empty) empty.style.display = 'none';

      const items = await Promise.all(list.map(async item => {
        let content = null;
        if (window.TMDB) {
          content = await TMDB.getDetails(item.content_id, 'movie').catch(() => null) ||
                    await TMDB.getDetails(item.content_id, 'tv').catch(() => null);
        }
        return content;
      }));
      grid.innerHTML = items.filter(Boolean).map(content => UI.posterCard(content)).join('');
    } else {
      grid.style.display = 'none';
      if (empty) empty.style.display = 'block';
    }
  }

  async function loadWatchHistory(userId) {
    const grid = document.getElementById('account-history-grid');
    const empty = document.getElementById('history-empty');
    const clearBtn = document.getElementById('clear-history-btn');
    if (!grid) return;

    const history = await Subscriptions.getWatchHistory(userId);

    if (history && history.length > 0) {
      grid.style.display = 'grid';
      empty.style.display = 'none';
      if (clearBtn) clearBtn.style.display = 'inline-flex';

      const items = await Promise.all(history.map(async record => {
        let content = null;
        if (window.TMDB) {
          // Use stored content_type if available, otherwise try both
          const preferredType = record.content_type || 'movie';
          content = await TMDB.getDetails(record.content_id, preferredType).catch(() => null);
          if (!content) {
            const altType = preferredType === 'movie' ? 'tv' : 'movie';
            content = await TMDB.getDetails(record.content_id, altType).catch(() => null);
          }
        }
        if (!content) return null;

        // Mock progress formats
        const progressSeconds = record.progress_seconds || 0;
        const totalDuration = (content.duration || 120) * 60; // duration in seconds
        const percent = Math.min(100, Math.round((progressSeconds / totalDuration) * 100)) || 25;
        const remainingMinutes = Math.max(5, Math.round((totalDuration - progressSeconds) / 60));

        const item = {
          id: content.id,
          title: content.title,
          poster: content.poster,
          thumbnail: content.thumbnail || content.poster,
          progress: percent,
          duration: 100,
          timeLeft: remainingMinutes > 60 ? `${Math.floor(remainingMinutes/60)}h left` : `${remainingMinutes}m left`,
          type: content.type
        };

        return item;
      }));

      grid.innerHTML = items.filter(Boolean).map(item => UI.videoCard(item)).join('');

      UI.initVideoCardHovers();

      // Bind Clear History
      if (clearBtn) {
        clearBtn.onclick = () => {
          UI.showModal({
            title: 'Clear Viewing History',
            content: 'Are you sure you want to clear your entire viewing history? This will reset all continue watching rows across the application.',
            confirmText: 'Clear All',
            cancelText: 'Keep History',
            dangerous: true,
            onConfirm: async () => {
              try {
                await window.sb
                  .from('watch_history')
                  .delete()
                  .eq('user_id', userId);

                UI.toast('Viewing history successfully cleared.', 'success');
                await loadWatchHistory(userId);
              } catch (err) {
                UI.toast('Failed to clear viewing history.', 'error');
              }
            }
          });
        };
      }
    } else {
      grid.style.display = 'none';
      empty.style.display = 'block';
      if (clearBtn) clearBtn.style.display = 'none';
    }
  }

  return { init };
})();

window.AccountPage = AccountPage;
