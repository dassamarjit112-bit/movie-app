// ============================================================
//  CineStream — Supabase Configuration & Fallback Engine
//  Attempts direct Supabase connection. In case of offline use,
//  CDN blocks, or invalid credentials, triggers a complete 
//  localStorage-backed database simulation.
// ============================================================

// Your actual Supabase Project credentials
const SUPABASE_URL = 'https://atrfvqtypzzmxvygyfzo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0cmZ2cXR5cHp6bXh2eWd5ZnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNjA2MzIsImV4cCI6MjA5NTczNjYzMn0.VcX9OhEx1xQV24ejzfs9td_InGb7uo2Nwsy3gae_tAU';

let supabaseClientInstance = null;
let isUsingMock = false;

// ── Check if Supabase SDK is loaded and credentials are valid ──
const isSDKLoaded = typeof supabase !== 'undefined';
const isRealConfigured = SUPABASE_URL && !SUPABASE_URL.includes('YOUR_PROJECT_ID');

if (isSDKLoaded && isRealConfigured) {
  try {
    const { createClient } = supabase;
    supabaseClientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    console.log('CineStream: Supabase SDK successfully initialized.');
  } catch (err) {
    console.warn('CineStream: Supabase initialization crashed, enabling mock database.', err);
    isUsingMock = true;
  }
} else {
  console.warn('CineStream: Supabase SDK not loaded or default credentials remain. Enabling mock database.');
  isUsingMock = true;
}

// ── Mock Database Client implementation ──
if (isUsingMock || !supabaseClientInstance) {
  isUsingMock = true;

  // Local Database Store inside localStorage
  const getStore = (key) => JSON.parse(localStorage.getItem(`mock_db_${key}`)) || [];
  const setStore = (key, data) => localStorage.setItem(`mock_db_${key}`, JSON.stringify(data));

  // Seeds default gift codes if empty
  if (getStore('gift_codes').length === 0) {
    setStore('gift_codes', [
      { id: 'gc1', code: 'CINE30BASIC', plan_id: 'basic', duration_days: 30, is_used: false },
      { id: 'gc2', code: 'CINE30STANDARD', plan_id: 'standard', duration_days: 30, is_used: false },
      { id: 'gc3', code: 'CINE30PREMIUM', plan_id: 'premium', duration_days: 30, is_used: false },
      { id: 'gc4', code: 'CINE90PREMIUM', plan_id: 'premium', duration_days: 90, is_used: false }
    ]);
  }

  // Current session variable
  let currentSession = JSON.parse(localStorage.getItem('mock_session')) || null;
  const authListeners = [];

  // Helper builder class mimicking Supabase Query Builder
  class MockQueryBuilder {
    constructor(tableName) {
      this.table = tableName;
      this.data = getStore(tableName);
    }

    select(fields) {
      // Mimics select
      return this;
    }

    eq(field, value) {
      this.data = this.data.filter(row => row[field] === value);
      return this;
    }

    order(field, options = {}) {
      const asc = options.ascending !== false;
      this.data.sort((a, b) => {
        if (a[field] < b[field]) return asc ? -1 : 1;
        if (a[field] > b[field]) return asc ? 1 : -1;
        return 0;
      });
      return this;
    }

    limit(num) {
      this.data = this.data.slice(0, num);
      return this;
    }

    single() {
      const result = this.data[0] || null;
      return Promise.resolve({ data: result, error: result ? null : new Error('Row not found') });
    }

    async then(onfulfilled) {
      // Mimic standard async query execution
      return Promise.resolve({ data: this.data, error: null }).then(onfulfilled);
    }

    async upsert(row) {
      let store = getStore(this.table);
      const existingIdx = store.findIndex(item => {
        if (row.id) return item.id === row.id;
        if (row.user_id && row.content_id) return item.user_id === row.user_id && item.content_id === row.content_id;
        return false;
      });

      const newRow = { ...row, updated_at: new Date().toISOString() };
      if (existingIdx > -1) {
        store[existingIdx] = { ...store[existingIdx], ...newRow };
      } else {
        newRow.id = row.id || Math.random().toString(36).substring(2, 9);
        newRow.created_at = new Date().toISOString();
        store.push(newRow);
      }
      setStore(this.table, store);
      return Promise.resolve({ data: newRow, error: null });
    }

    async update(updates) {
      let store = getStore(this.table);
      store = store.map(item => {
        // If matches current query filters
        const matches = this.data.some(d => d.id === item.id);
        if (matches) {
          return { ...item, ...updates, updated_at: new Date().toISOString() };
        }
        return item;
      });
      setStore(this.table, store);
      return Promise.resolve({ data: updates, error: null });
    }

    async delete() {
      let store = getStore(this.table);
      store = store.filter(item => {
        // Exclude filtered items
        return !this.data.some(d => d.id === item.id);
      });
      setStore(this.table, store);
      return Promise.resolve({ error: null });
    }

    async insert(row) {
      const store = getStore(this.table);
      const newRow = {
        id: Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
        ...row
      };
      store.push(newRow);
      setStore(this.table, store);
      return Promise.resolve({ data: newRow, error: null });
    }
  }

  // Instantiate complete Mock Client Object
  supabaseClientInstance = {
    auth: {
      async signInWithPassword({ email, password }) {
        if (!email || !password) throw new Error('Email and password required');
        
        let users = getStore('users');
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) throw new Error('Invalid email or password credentials.');

        currentSession = {
          user: { id: user.id, email: user.email, user_metadata: { full_name: user.full_name } },
          access_token: 'mock-token-' + user.id
        };
        localStorage.setItem('mock_session', JSON.stringify(currentSession));
        authListeners.forEach(cb => cb('SIGNED_IN', currentSession));

        return { data: { session: currentSession }, error: null };
      },

      async signUp({ email, password, options }) {
        if (!email || !password) throw new Error('Email and password required');

        let users = getStore('users');
        if (users.some(u => u.email === email)) throw new Error('Email address already registered.');

        const newUser = {
          id: Math.random().toString(36).substring(2, 9),
          email,
          password,
          full_name: options?.data?.full_name || 'CineStream User'
        };
        users.push(newUser);
        setStore('users', users);

        currentSession = {
          user: { id: newUser.id, email: newUser.email, user_metadata: { full_name: newUser.full_name } },
          access_token: 'mock-token-' + newUser.id
        };
        localStorage.setItem('mock_session', JSON.stringify(currentSession));
        authListeners.forEach(cb => cb('SIGNED_IN', currentSession));

        return { data: { user: currentSession.user, session: currentSession }, error: null };
      },

      async signOut() {
        currentSession = null;
        localStorage.removeItem('mock_session');
        authListeners.forEach(cb => cb('SIGNED_OUT', null));
        return { error: null };
      },

      async getSession() {
        return Promise.resolve({ data: { session: currentSession }, error: null });
      },

      async getUser() {
        return Promise.resolve({ data: { user: currentSession ? currentSession.user : null }, error: null });
      },

      onAuthStateChange(callback) {
        authListeners.push(callback);
        // Call immediately with current state
        callback(currentSession ? 'SIGNED_IN' : 'SIGNED_OUT', currentSession);
        return {
          data: {
            subscription: {
              unsubscribe() {
                const idx = authListeners.indexOf(callback);
                if (idx > -1) authListeners.splice(idx, 1);
              }
            }
          }
        };
      }
    },

    from(tableName) {
      return new MockQueryBuilder(tableName);
    }
  };
}

// Export global client variables
window.sb = supabaseClientInstance;
window.isUsingMockSupabase = isUsingMock;
