/* ============================================================
   CineStream — Authentication Module
   Handles: Email/Password, Google OAuth, Session, Password Reset
   ============================================================ */

const Auth = (() => {
  // ── Sign In with Email/Password ──
  async function signInWithEmail(email, password) {
    const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  // ── Sign Up with Email/Password ──
  async function signUpWithEmail(email, password, fullName) {
    const { data, error } = await window.sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, avatar_url: '' },
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) throw error;

    // Create profile record
    if (data.user) {
      await window.sb.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email: email,
        avatar_url: '',
        created_at: new Date().toISOString()
      });
    }
    return data;
  }

  // ── Google OAuth ──
  async function signInWithGoogle() {
    const redirectTo = window.location.origin + window.location.pathname;

    // Detect Median.co Android WebApp environment
    const isMedian = typeof window.median !== 'undefined' || 
                     (typeof window.gonative !== 'undefined') ||
                     navigator.userAgent.includes('gonative') ||
                     navigator.userAgent.includes('median');

    if (isMedian) {
      // Get the OAuth URL from Supabase WITHOUT redirecting (skipBrowserRedirect = true)
      const { data, error } = await window.sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true  // prevents Supabase from opening external browser
        }
      });
      if (error) throw error;

      // Open the URL in Median's in-app browser which handles OAuth correctly
      if (data?.url) {
        if (window.median && window.median.openExternalUrl) {
          // Median v4+ API
          window.median.openExternalUrl({ url: data.url });
        } else if (window.gonative && window.gonative.webview && window.gonative.webview.loadUrl) {
          // Older GoNative/Median API
          window.gonative.webview.loadUrl({ url: data.url });
        } else {
          // Fallback: open in the same webview
          window.location.href = data.url;
        }
      }
      return data;
    }

    // Standard browser / desktop flow
    const { data, error } = await window.sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) throw error;
    return data;
  }

  // ── Sign Out ──
  async function signOut() {
    const { error } = await window.sb.auth.signOut();
    if (error) throw error;
    window.Router.navigate('login');
  }

  // ── Get Current Session ──
  async function getSession() {
    try {
      const { data, error } = await window.sb.auth.getSession();
      if (error) {
        console.warn('Auth.getSession returned error:', error);
        return null;
      }
      return data ? data.session : null;
    } catch (e) {
      console.warn('Auth.getSession crashed:', e);
      return null;
    }
  }

  // ── Get Current User ──
  async function getUser() {
    const { data: { user } } = await window.sb.auth.getUser();
    return user;
  }

  // ── Get User Profile ──
  async function getProfile(userId) {
    const { data, error } = await window.sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  }

  // ── Update Profile ──
  async function updateProfile(userId, updates) {
    const { data, error } = await window.sb
      .from('profiles')
      .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() });
    if (error) throw error;
    return data;
  }

  // ── Reset Password ──
  async function sendPasswordReset(email) {
    const { error } = await window.sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/#/reset-password'
    });
    if (error) throw error;
  }

  // ── Auth State Change Listener ──
  function onAuthChange(callback) {
    return window.sb.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  }

  // ── Auth Guard ── (call on protected pages)
  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      window.Router.navigate('login');
      return null;
    }
    return session;
  }

  return {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    getSession,
    getUser,
    getProfile,
    updateProfile,
    sendPasswordReset,
    onAuthChange,
    requireAuth
  };
})();

window.Auth = Auth;
