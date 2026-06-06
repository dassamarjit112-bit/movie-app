/* CineStream — Login Page Controller */
const LoginPage = (() => {
  let registrationEmail = ''; // Store email for OTP verification

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
      // Use OTP-based signup instead
      const result = await Auth.signUpWithOTP(email, name);
      
      registrationEmail = email;
      btn.disabled = false;
      btn.innerHTML = 'Create Account';
      showError('reg-error', '');
      
      // Show OTP verification page
      document.getElementById('form-register').innerHTML = `
        <div style="text-align:center;padding:20px 0">
          <span class="material-symbols-outlined icon-fill success-icon-anim" style="font-size:64px;color:#14d1ff;display:block;margin:0 auto 16px">mail</span>
          <h3 style="font-family:'Montserrat',sans-serif;font-size:20px;font-weight:700;margin-bottom:8px">Enter OTP Code</h3>
          <p style="font-size:14px;color:rgba(229,226,225,0.6);line-height:1.6">We sent a verification code to <strong style="color:var(--c-secondary-container)">${email}</strong>. Enter it below.</p>
          <input type="text" id="otp-code" placeholder="000000" maxlength="6" style="width:100%;padding:12px;margin:20px 0;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.05);color:white;text-align:center;font-size:20px;letter-spacing:8px;font-family:monospace;">
          <button onclick="LoginPage.verifyOTP()" class="btn btn-primary" style="width:100%;margin-top:16px">Verify Code</button>
          <button onclick="LoginPage.switchTab('login')" class="btn btn-ghost btn-sm" style="margin-top:16px">Back to Sign In</button>
        </div>
      `;
      
      // Auto-focus on OTP input
      setTimeout(() => document.getElementById('otp-code')?.focus(), 100);
    } catch (err) {
      showError('reg-error', err.message || 'Registration failed. Please try again.');
      UI.setLoading(btn, false);
    }
  }

  async function verifyOTP() {
    const code = document.getElementById('otp-code')?.value?.trim();
    
    if (!code || code.length !== 6) {
      UI.toast('Please enter a valid 6-digit code', 'warning');
      return;
    }
    
    const btn = document.querySelector('[onclick="LoginPage.verifyOTP()"]');
    if (btn) UI.setLoading(btn, true);
    
    try {
      const result = await Auth.verifyOTP(registrationEmail, code);
      UI.toast('Email verified! Welcome to CineStream 🎬', 'success');
      Router.navigate('home');
    } catch (err) {
      UI.toast(err.message || 'Invalid OTP code. Please try again.', 'error');
      if (btn) UI.setLoading(btn, false);
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

  return { init, switchTab, togglePassword, signIn, register, verifyOTP, signInWithGoogle, showForgotPassword, sendReset };
})();

window.LoginPage = LoginPage;
