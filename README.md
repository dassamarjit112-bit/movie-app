# CineStream — Premium Cinema Streaming SPA

CineStream is an enterprise-grade OTT (Over-The-Top) video streaming Single Page Application (SPA) designed with a dark cinematic aesthetic, fluid glassmorphism elements, custom HLS players, and a personalized client-side **Advanced AI Recommendation Engine**.

---

## 🚀 Key Features

- **Adaptive HLS Video Player**: Custom controls built on `hls.js` supporting dynamic resolution selectors, speed controls, PiP, buffering states, and fullscreen overlays.
- **Advanced AI Recommender Engine**: Dynamic content matching that profiles user vectors (Watchlist favorites and Viewing History logs) using cosine genre similarity. Features localized explanation tags (e.g. `✨ 98% Match`).
- **Sandbox Subscriptions & Payments**: Three-tiered membership cards (Basic, Standard, Premium) with sandboxed payments updating real-time Supabase active states.
- **Voucher Voucher Code System**: Secure coupon validation module (`CINE30BASIC`, `CINE30STANDARD`, `CINE30PREMIUM`) unlocking streaming permissions immediately.
- **OTT Settings Dashboard**: Tabbed accounts containing profile revisions, initial seeds avatar randomizers, viewing log cleans, and watchlist grids.
- **SPA Router**: Lightweight hash-based router (`#/home`, `#/movies`) with page-load animations and secure auth route guards.

---

## 🛠️ Technology Stack

- **Frontend Core**: Vanilla HTML5, Vanilla CSS3 (custom variables, glassmorphism filters, animations), Vanilla ES6 Modules.
- **Adaptive Stream Engine**: `hls.js` CDN.
- **Database & Authentication**: Supabase JS SDK client.
- **Avatar Generator**: Dicebear APIs.
- **Developer Local Server**: Vite.

---

## 💻 Local Setup & Development

1. **Install Dependencies**:
   Ensure you have [Node.js](https://nodejs.org/) installed, then run:
   ```bash
   npm install
   ```

2. **Configure Credentials**:
   - Rename `.env` template or create a new one:
     ```env
     VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```
   - Open `js/config.js` and enter your Supabase Project credentials:
     ```javascript
     const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
     const SUPABASE_ANON_KEY = 'your-anon-key-here';
     ```

3. **Run Local Server**:
   Launch the dev server using Vite:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 📦 Setting Up Supabase Database

To set up the database tables and authentication triggers:
1. Open the [supabase.md](supabase.md) file in this repository.
2. Copy the SQL script.
3. Open the **SQL Editor** in your Supabase Dashboard.
4. Paste the script and click **Run**. This will create the `profiles`, `subscriptions`, `gift_codes`, `watch_history`, and `watchlist` tables, set up Row Level Security (RLS) policies, and seed mock voucher codes!

---

## 🐙 Deploying to GitHub

To push your local codebase to a new repository on GitHub:

1. **Initialize Git**:
   ```bash
   git init
   ```

2. **Add Files & Commit**:
   ```bash
   git add .
   git commit -m "feat: CineStream OTT complete build with custom HLS and AI recommendations"
   ```

3. **Link to GitHub Repository**:
   Create a new public or private repository on GitHub (do NOT initialize it with README or gitignore), then run:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

---

## ⚡ Deploying to Vercel

Vercel offers zero-config deployment for static apps!

1. Go to the [Vercel Dashboard](https://vercel.com/) and click **Add New** → **Project**.
2. **Import** your newly created CineStream GitHub repository.
3. In the **Build and Development Settings**, Vercel will automatically recognize the Vite setup:
   - **Framework Preset**: `Vite` (Vercel sets this automatically)
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`
4. Click **Deploy**!
5. Within seconds, your CineStream platform will be live globally!

> **Note**: Because CineStream uses a hash-based SPA router (`#/home`, `#/movies`), it works perfectly on standard static servers out of the box with **zero** custom server routing rewrites!
