const SelectCountryPage = (() => {
  async function init() {
    // Hide navbar and footer on onboarding page
    const navMount = document.getElementById('navbar-mount');
    const footerMount = document.getElementById('footer-mount');
    const mobileNavMount = document.getElementById('mobile-nav-mount');
    
    if (navMount) navMount.innerHTML = '';
    if (footerMount) footerMount.innerHTML = '';
    if (mobileNavMount) mobileNavMount.innerHTML = '';

    const session = await window.Auth.getSession();
    if (!session) {
      window.Router.navigate('login');
      return;
    }

    try {
      // Check if country is already set
      const profile = await window.Auth.getProfile(session.user.id);
      if (profile && profile.country && profile.country !== '') {
        // Country already set, save to local storage and go home
        localStorage.setItem('cs_user_country', profile.country);
        window.Router.navigate('home');
        return;
      }
    } catch (e) {
      console.warn("Could not fetch profile for country check", e);
    }

    const btn = document.getElementById('sc-continue-btn');
    const select = document.getElementById('sc-country-select');

    if (!btn || !select) return;

    btn.onclick = async () => {
      const country = select.value;
      if (!country) {
        window.UI.toast('Please select a country to continue.', 'warning');
        return;
      }

      window.UI.setLoading(btn, true);
      try {
        await window.Auth.updateProfile(session.user.id, { country: country });
        localStorage.setItem('cs_user_country', country);
        window.UI.toast('Country saved successfully!', 'success');
        
        // Ensure nav is restored when leaving
        window.Router.navigate('home');
        // Force a page reload to ensure the UI restores navbar components
        window.location.reload();
      } catch (err) {
        window.UI.toast('Failed to save country. Please try again.', 'error');
        window.UI.setLoading(btn, false);
      }
    };
  }

  return { init };
})();

window.SelectCountryPage = SelectCountryPage;
