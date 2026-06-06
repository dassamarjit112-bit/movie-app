# 🎬 CineStream - Production Setup Guide

## ⚠️ CRITICAL: TMDB API Key Configuration

Your movie app is currently **not loading movies** because the TMDB API key is not configured. Follow this guide to fix it.

---

## 🔑 Step 1: Get Your TMDB API Key

1. **Visit TMDB**: https://www.themoviedb.org/settings/api
2. **Create an Account** (if you don't have one): https://www.themoviedb.org/signup
3. **Request API Key**:
   - Go to Settings → API
   - Click "Generate" for API Key v3
   - Read and accept the terms
   - Copy your API Key (long alphanumeric string)
4. **Save it securely** - you'll need this next

---

## 🚀 Step 2: Deploy to Vercel (Production)

### For Vercel Environment Variables:

1. Go to your **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your **movie-app** project
3. Click **Settings** → **Environment Variables**
4. **Add new variable**:
   - Name: `VITE_TMDB_API_KEY`
   - Value: `YOUR_API_KEY_FROM_STEP_1`
   - Select environments: **Production, Preview, Development**
5. Click **Save**
6. **Redeploy** your app (Vercel will automatically rebuild)

### Verify Deployment:

```bash
# After redeployment, your movies should load on:
https://your-vercel-domain.vercel.app

# Check browser console (F12) for:
✅ "TMDB API Key configured successfully - Movies will load across all devices"
```

---

## 💻 Step 3: Local Development (Optional)

If you want to test locally before pushing to Vercel:

1. Create `.env` file in your project root:
```dotenv
VITE_TMDB_API_KEY=your-api-key-from-step-1
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
```

2. Run locally:
```bash
npm install
npm run dev
```

3. Check console for:
```
✅ "TMDB API Key configured successfully - Movies will load across all devices"
```

---

## 📱 How It Works on All Devices

The updated code now uses:

1. **TMDB API** - Fetches movie metadata (titles, descriptions, ratings)
2. **Multiple Streaming Providers** - Ensures playback on all devices:
   - `2embed.cc` - Primary provider
   - `vidlink.pro` - Fallback provider
   - `vidsrc.me` - Additional fallback

**No device restrictions** - Works on:
- ✅ Smartphones (iOS & Android)
- ✅ Tablets
- ✅ Desktop browsers
- ✅ Smart TVs with browsers
- ✅ Different networks (4G, WiFi, Hotspot)

---

## 🔄 What Was Fixed

### Backend Configuration (REMOVED ❌)
- ❌ **Old**: `PORT=4000` backend required
- ✅ **New**: Pure frontend app (no backend needed)
- **Why**: Vercel doesn't need local ports. Backend ports break mobile access.

### TMDB API Key (FIXED ✅)
- ❌ **Old**: Listed as "optional"
- ✅ **New**: Required for all functionality
- **Why**: Movies, search, and details depend on TMDB data

### Device Support (IMPROVED ✅)
- ❌ **Old**: Movies didn't load on many devices
- ✅ **New**: Works on all devices with 3+ fallback streaming providers
- **Why**: Multiple providers ensure playback regardless of device/network

### Error Handling (ENHANCED ✅)
- ❌ **Old**: Silent failures, no logging
- ✅ **New**: Clear console messages with setup instructions
- **Why**: Easier debugging and user support

---

## 🔍 Troubleshooting

### "Movies not loading on home page"
```
1. Open Browser Console: F12 or right-click → Inspect
2. Look for one of these messages:
   - ✅ "TMDB API Key configured..." = ALL GOOD, movies should load in 2-3 seconds
   - ❌ "TMDB API Key not configured..." = Need to add API key
3. If you see the error, follow Step 2 above
```

### "API Error 401 Unauthorized"
```
1. API Key is invalid or expired
2. Go to https://www.themoviedb.org/settings/api
3. Generate a new API key
4. Update Vercel environment variables
5. Wait 2-3 minutes and redeploy
6. Hard refresh in browser (Ctrl+F5 or Cmd+Shift+R)
```

### "Search not working"
```
Same as above - requires valid TMDB API key
```

### "Movies work on desktop but not on phone"
```
1. Clear browser cache on phone
2. Hard refresh (pull down and release)
3. Or use Private/Incognito mode to test
4. If still fails, check phone's date/time is correct
```

### "Only shows "No Poster" images"
```
1. API key is working but movies aren't loading
2. Check internet connection
3. Wait a few seconds - TMDB sometimes takes time
4. Check browser console for errors
```

---

## ✅ Verification Checklist

After setting up, verify everything works:

- [ ] TMDB API key added to Vercel environment variables
- [ ] App redeployed on Vercel
- [ ] Console shows "✅ TMDB API Key configured successfully"
- [ ] Home page shows movie categories with images
- [ ] Search bar works (type a movie name)
- [ ] Movie details load when clicked
- [ ] Works on desktop browser
- [ ] Works on mobile browser
- [ ] Works on tablet

---

## 📞 Common Questions

**Q: Do I need Supabase for production?**
```
A: No. Supabase is optional. The app works with TMDB API alone.
   Supabase is only needed if you want user accounts/subscriptions.
```

**Q: Can I use Vercel's free tier?**
```
A: Yes! This app is perfect for Vercel's free tier.
   No backend needed, so all computing is done in browser.
```

**Q: How many API calls does the app make?**
```
A: About 5-10 API calls on app load (getting home page movies).
   TMDB free tier has plenty of quota for this usage.
```

**Q: Is the streaming legal?**
```
A: The app uses TMDB (official API) for metadata.
   Streaming providers are third-party services.
   Make sure to comply with local laws.
```

**Q: Do I need to renew the API key?**
```
A: No. TMDB API keys don't expire.
   They remain valid indefinitely unless you delete them.
```

---

## 📊 Configuration Summary

| Component | Status | Location |
|-----------|--------|----------|
| **Backend (PORT 4000)** | ❌ REMOVED | N/A |
| **TMDB API Key** | ✅ REQUIRED | Vercel Env Vars |
| **Supabase** | ⚪ OPTIONAL | Vercel Env Vars |
| **Frontend** | ✅ READY | Vercel Deploy |
| **Streaming** | ✅ 3+ PROVIDERS | Auto-fallback |

---

## 🚀 Summary

Your CineStream app is now **production-ready** and will work on:
- ✅ All devices (phones, tablets, desktops)
- ✅ All networks (4G, WiFi, Hotspot)
- ✅ All browsers (Chrome, Safari, Firefox, Edge)
- ✅ Global audience (Vercel CDN)

**Next Steps:**
1. Get TMDB API key from https://www.themoviedb.org/settings/api
2. Add to Vercel environment variables
3. Redeploy
4. Enjoy! 🎉

For help, check browser console (F12) for detailed error messages.
