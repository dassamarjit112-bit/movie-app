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
        data: { full_name: fullName, avatar_url: '' }
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
    const { data, error } = await window.sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
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
    const { data } = await window.sb.auth.getSession();
    return data.session;
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
