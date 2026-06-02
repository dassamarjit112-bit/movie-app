/* ============================================================
   CineStream — Subscriptions & Gift Codes Module
   ============================================================ */

const Subscriptions = (() => {
  // ── Plan definitions ──
  const PLANS = [
    {
      id: 'basic',
      name: 'Basic',
      price: 4.99,
      period: 'month',
      quality: 'SD',
      screens: 1,
      downloads: false,
      features: ['SD Quality (480p)', '1 Screen at a time', 'Mobile only', 'Limited catalog'],
      color: 'var(--c-tertiary)'
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 9.99,
      period: 'month',
      quality: 'FHD',
      screens: 2,
      downloads: true,
      featured: true,
      features: ['Full HD (1080p)', '2 Screens simultaneously', 'All devices', 'Full catalog', '25 downloads/month'],
      color: 'var(--c-secondary-container)'
    },
    {
      id: 'premium',
      name: 'Premium 4K',
      price: 14.99,
      period: 'month',
      quality: '4K',
      screens: 4,
      downloads: true,
      features: ['Ultra HD 4K + HDR', '4 Screens simultaneously', 'All devices', 'Full catalog + Exclusives', 'Unlimited downloads', 'Dolby Atmos Audio'],
      color: 'var(--c-primary-container)'
    }
  ];

  // ── Get all plans ──
  function getPlans() { return PLANS; }

  // ── Get user subscription ──
  async function getUserSubscription(userId) {
    if (!userId) return null;
    try {
      const { data, error } = await window.sb
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  }

  // ── Check if user is subscribed ──
  async function isSubscribed(userId) {
    const sub = await getUserSubscription(userId);
    if (!sub) return false;
    const now = new Date();
    const end = new Date(sub.end_date);
    return end > now;
  }

  // ── Redeem Gift Code ──
  async function redeemGiftCode(code, userId) {
    // Normalize code
    const normalizedCode = code.trim().toUpperCase();

    // Look up code in database
    const { data: giftCode, error: fetchError } = await window.sb
      .from('gift_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (fetchError || !giftCode) {
      throw new Error('Invalid gift code. Please check and try again.');
    }

    if (giftCode.usage_count >= giftCode.max_uses) {
      throw new Error('This gift code has reached its maximum usage limit.');
    }

    if (giftCode.expires_at && new Date(giftCode.expires_at) < new Date()) {
      throw new Error('This gift code has expired.');
    }

    // Check if user already used this code
    const { data: existingSub } = await window.sb
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('gift_code_used', normalizedCode)
      .single();

    if (existingSub) {
      throw new Error('You have already redeemed this gift code.');
    }

    // Increment usage count
    const { error: updateError } = await window.sb
      .from('gift_codes')
      .update({
        usage_count: (giftCode.usage_count || 0) + 1
      })
      .eq('id', giftCode.id);

    if (updateError) throw new Error('Failed to redeem code. Please try again.');

    // Calculate subscription end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (giftCode.duration_days || 30));

    // Create or update subscription
    const { error: subError } = await window.sb
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_id: giftCode.plan_id || 'standard',
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        source: 'gift_code',
        gift_code_used: normalizedCode,
        updated_at: new Date().toISOString()
      });

    if (subError) throw new Error('Subscription activation failed. Contact support.');

    return {
      plan: giftCode.plan_id || 'standard',
      duration_days: giftCode.duration_days || 30,
      end_date: endDate.toISOString()
    };
  }

  // ── Get watch history ──
  async function getWatchHistory(userId, limit = 10) {
    if (!userId) return [];
    try {
      const { data } = await window.sb
        .from('watch_history')
        .select('*')
        .eq('user_id', userId)
        .order('last_watched', { ascending: false })
        .limit(limit);
      return data || [];
    } catch { return []; }
  }

  // ── Save watch progress ──
  async function saveProgress(userId, contentId, progressSeconds, contentType = 'movie') {
    if (!userId || !contentId) return;
    try {
      await window.sb.from('watch_history').upsert({
        user_id: userId,
        content_id: String(contentId),
        progress_seconds: progressSeconds,
        content_type: contentType,
        last_watched: new Date().toISOString()
      }, { onConflict: 'user_id,content_id' });
    } catch { /* silent */ }
  }

  // ── Watchlist ──
  async function getWatchlist(userId) {
    if (!userId) return [];
    try {
      const { data } = await window.sb
        .from('watchlist')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });
      return data || [];
    } catch { return []; }
  }

  async function toggleWatchlist(userId, contentId) {
    if (!userId || !contentId) return;
    const { data: existing } = await window.sb
      .from('watchlist').select('id').eq('user_id', userId).eq('content_id', contentId).single();

    if (existing) {
      await window.sb.from('watchlist').delete().eq('id', existing.id);
      return false; // removed
    } else {
      await window.sb.from('watchlist').insert({ user_id: userId, content_id: contentId, added_at: new Date().toISOString() });
      return true; // added
    }
  }

  // ── Format plan badge ──
  function planBadge(planId) {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return '';
    const colors = { basic: 'badge-blue', standard: 'badge-green', premium: 'badge-gold' };
    return `<span class="badge ${colors[planId] || 'badge-blue'}">${plan.quality} • ${plan.name}</span>`;
  }

  return {
    PLANS,
    getPlans,
    getUserSubscription,
    isSubscribed,
    redeemGiftCode,
    getWatchHistory,
    saveProgress,
    getWatchlist,
    toggleWatchlist,
    planBadge
  };
})();

window.Subscriptions = Subscriptions;
