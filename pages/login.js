/* CineStream — Login Page Controller */
const LoginPage = (() => {
  function init() {
    // Check if already logged in
    Auth.getSession().then(session => {
      if (session) Router.navigate('home');
    });

    // Setup password strength meter
    const regPw = document.getElementById('reg-password');
    if (regPw) regPw.addEventListener('input', () => checkPasswordStrength(regPw.value));

    // Enter key support
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const activeForm = document.getElementById('form-login')?.style.display !== 'none' ? 'login' : 'register';
        if (activeForm === 'login') signIn();
        else register();
      }
    });
  }

  function switchTab(tab) {
    const forms = ['login', 'register', 'forgot'];
    forms.forEach(f => {
      const el = document.getElementById(`form-${f}`);
      if (el) el.style.display = f === tab ? 'block' : 'none';
    });

    document.getElementById('tab-login')?.classList.toggle('active', tab === 'login');
    document.getElementById('tab-register')?.classList.toggle('active', tab === 'register');

    // Show/hide tabs bar
    const tabsBar = document.querySelector('.tabs');
    if (tabsBar) tabsBar.style.display = tab === 'forgot' ? 'none' : 'flex';
  }

  function togglePassword(id) {
    const input = document.getElementById(id);
    const icon = document.getElementById(`pw-toggle-${id === 'login-password' ? 'login' : 'reg'}`);
    if (!input || !icon) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.textContent = input.type === 'password' ? 'visibility' : 'visibility_off';
  }

  function checkPasswordStrength(pw) {
    const bars = document.querySelectorAll('.pw-bar');
    let strength = 0;
    if (pw.length >= 8) strength++;
    if (/[A-Z]/.test(pw)) strength++;
    if (/[0-9]/.test(pw)) strength++;
    if (/[^a-zA-Z0-9]/.test(pw)) strength++;

    const colors = ['#ff6b6b', '#ffc832', '#14d1ff', '#32dc78'];
    bars.forEach((bar, i) => {
      bar.style.background = i < strength ? colors[strength - 1] : 'rgba(255,255,255,0.1)';
    });
  }

  function showError(formId, message) {
    const el = document.getElementById(formId);
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
    }
  }

  function hideError(formId) {
    const el = document.getElementById(formId);
    if (el) el.style.display = 'none';
  }

  async function signIn() {
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) return showError('login-error', 'Please fill in all fields.');
    hideError('login-error');

    const btn = document.getElementById('login-btn');
    UI.setLoading(btn, true);

    try {
      await Auth.signInWithEmail(email, password);
      UI.toast('Welcome back! 🎬', 'success');
      Router.navigate('home');
    } catch (err) {
      const msg = err.message?.includes('Invalid login')
        ? 'Invalid email or password. Please try again.'
        : err.message || 'Sign in failed. Please try again.';
      showError('login-error', msg);
      UI.setLoading(btn, false);
    }
  }

  async function register() {
    const name = document.getElementById('reg-name')?.value?.trim();
    const email = document.getElementById('reg-email')?.value?.trim();
    const password = document.getElementById('reg-password')?.value;
    const confirm = document.getElementById('reg-confirm')?.value;

    if (!name || !email || !password || !confirm) return showError('reg-error', 'Please fill in all fields.');
    if (password !== confirm) return showError('reg-error', 'Passwords do not match.');
    if (password.length < 8) return showError('reg-error', 'Password must be at least 8 characters.');
    hideError('reg-error');

    const btn = document.getElementById('register-btn');
    UI.setLoading(btn, true);

    try {
      const result = await Auth.signUpWithEmail(email, password, name);
      if (result && result.session) {
        UI.toast('Account created! Welcome to CineStream 🎬', 'success');
        Router.navigate('home');
      } else {
        // Email confirmation required
        btn.disabled = false;
        btn.innerHTML = 'Create Account';
        showError('reg-error', '');
        document.getElementById('form-register').innerHTML = `
          <div style="text-align:center;padding:20px 0">
            <span class="material-symbols-outlined icon-fill success-icon-anim" style="font-size:64px;color:#32dc78;display:block;margin:0 auto 16px">mark_email_read</span>
            <h3 style="font-family:'Montserrat',sans-serif;font-size:20px;font-weight:700;margin-bottom:8px">Check your email</h3>
            <p style="font-size:14px;color:rgba(229,226,225,0.6);line-height:1.6">We sent a confirmation link to <strong style="color:var(--c-secondary-container)">${email}</strong>. Click it to activate your account.</p>
            <button onclick="LoginPage.switchTab('login')" class="btn btn-ghost btn-sm" style="margin-top:24px">Back to Sign In</button>
          </div>
        `;
      }
    } catch (err) {
      showError('reg-error', err.message || 'Registration failed. Please try again.');
      UI.setLoading(btn, false);
    }
  }

  async function signInWithGoogle() {
    try {
      await Auth.signInWithGoogle();
    } catch (err) {
      UI.toast(err.message || 'Google sign-in failed.', 'error');
    }
  }

  function showForgotPassword() {
    switchTab('forgot');
  }

  async function sendReset() {
    const email = document.getElementById('forgot-email')?.value?.trim();
    if (!email) return UI.toast('Please enter your email.', 'warning');

    try {
      await Auth.sendPasswordReset(email);
      document.getElementById('form-forgot').innerHTML = `
        <div style="text-align:center;padding:16px 0">
          <span class="material-symbols-outlined icon-fill" style="font-size:48px;color:var(--c-secondary-container);display:block;margin:0 auto 12px">forward_to_inbox</span>
          <p style="font-size:14px;color:rgba(229,226,225,0.7);line-height:1.6">Password reset link sent to <strong>${email}</strong></p>
          <button onclick="LoginPage.switchTab('login')" class="btn btn-ghost btn-sm" style="margin-top:20px">Back to Sign In</button>
        </div>
      `;
    } catch (err) {
      UI.toast(err.message || 'Failed to send reset email.', 'error');
    }
  }

  return { init, switchTab, togglePassword, signIn, register, signInWithGoogle, showForgotPassword, sendReset };
})();

window.LoginPage = LoginPage;
