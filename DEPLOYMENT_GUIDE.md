# Shift6 - PWA Deployment Guide

Deploy your Shift6 PWA to the web in minutes! This guide covers Vercel (recommended) and other hosting options.

---

## 🚀 Option 1: Vercel (Recommended - Easiest)

**Why Vercel?**
- ✅ Free for personal projects
- ✅ Automatic HTTPS
- ✅ Auto-deploy from Git pushes
- ✅ Global CDN
- ✅ Perfect for PWAs
- ✅ Zero configuration needed

### Quick Deploy (2 minutes)

1. **Sign up for Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Sign Up"
   - Use your GitHub account (easiest)

2. **Import Your Repository**
   - Click "Add New Project"
   - Select "Import Git Repository"
   - Choose your `Shift6` repository
   - Click "Import"

3. **Configure (Auto-detected)**
   - Framework: Vite (auto-detected)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Click "Deploy"

4. **Done!**
   - Your app will deploy in ~1 minute
   - You'll get a URL like: `shift6-xyz.vercel.app`
   - Every Git push auto-deploys!

### Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `shift6.app`)
4. Follow DNS instructions
5. Free HTTPS automatically enabled!

---

## 🔧 Option 2: Netlify (Also Great)

**Similar to Vercel, slightly different interface**

1. **Sign up**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub

2. **New Site from Git**
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub
   - Select `Shift6` repository

3. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Click "Deploy site"

4. **Done!**
   - Get URL like: `shift6.netlify.app`
   - Auto-deploy on push

### Netlify Config File (Optional)

Create `netlify.toml` for more control:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

---

## 📄 Option 3: GitHub Pages (Free)

**Good for quick demos, slightly more setup**

1. **Install gh-pages package**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json**
   ```json
   {
     "homepage": "https://YOUR_USERNAME.github.io/Shift6",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Update vite.config.js**
   ```javascript
   export default defineConfig({
     base: '/Shift6/', // Your repo name
     // ... rest of config
   })
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages**
   - Go to repo → Settings → Pages
   - Source: Deploy from branch
   - Branch: `gh-pages`
   - Save

**Note:** GitHub Pages doesn't support service workers as well as Vercel/Netlify.

---

## ☁️ Option 4: Cloudflare Pages (Fast)

1. **Sign up**
   - Go to [pages.cloudflare.com](https://pages.cloudflare.com)
   - Connect GitHub

2. **Create Project**
   - Select `Shift6` repo
   - Framework: Vite
   - Build command: `npm run build`
   - Output: `dist`
   - Deploy

3. **Done!**
   - Super fast global CDN
   - Free SSL

---

## 🔥 Option 5: Firebase Hosting

**Good if using Firebase for backend**

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   ```

2. **Configuration**
   - Public directory: `dist`
   - Single-page app: Yes
   - GitHub auto-deploy: Yes (optional)

3. **Deploy**
   ```bash
   npm run build
   firebase deploy
   ```

---

## 🐳 Option 6: Docker + Any VPS

**If you want full control**

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /sw.js {
            add_header Cache-Control "public, max-age=0, must-revalidate";
        }
    }
}
```

**Build & Run**:
```bash
docker build -t shift6 .
docker run -p 80:80 shift6
```

---

## 📱 Testing Your PWA After Deploy

### 1. Check PWA Features

**Chrome DevTools:**
- Open your deployed site
- F12 → Application tab
- Check:
  - ✅ Manifest loaded
  - ✅ Service Worker registered
  - ✅ "Add to Home Screen" appears

### 2. Lighthouse Audit

- Chrome DevTools → Lighthouse tab
- Check "Progressive Web App"
- Run audit
- Aim for 100 PWA score!

### 3. Test Installation

**Android Chrome:**
- Visit your site
- "Add to Home Screen" prompt appears
- Install and test offline

**iOS Safari:**
- Visit your site
- Share → "Add to Home Screen"
- Test (limited PWA features on iOS)

**Desktop Chrome:**
- Install icon in address bar
- Click to install
- Test as app

---

## 🔄 Continuous Deployment Workflow

With Vercel/Netlify (recommended):

1. **Develop locally**
   ```bash
   npm run dev
   ```

2. **Make changes, test**

3. **Commit and push**
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

4. **Automatic deployment!**
   - Vercel/Netlify detects push
   - Runs `npm run build`
   - Deploys to production
   - ~1-2 minutes total

5. **Users get updates**
   - Service worker updates automatically
   - Next time they open app, new version loads

---

## 🌐 Custom Domain Setup

### Buy a Domain

Recommended registrars:
- Namecheap
- Google Domains
- Cloudflare

### Point to Your Host

**For Vercel:**
1. Add domain in Vercel dashboard
2. Add these DNS records at your registrar:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

**For Netlify:**
1. Add domain in Netlify dashboard
2. Update nameservers to Netlify's
3. Or add A record: `75.2.60.5`

**SSL Certificate:** Auto-generated and free!

---

## 📊 Analytics (Optional)

### Google Analytics

1. Get tracking ID from [analytics.google.com](https://analytics.google.com)
2. Add to `index.html`:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Vercel Analytics

- Built-in and free
- Enable in project settings
- No code changes needed

---

## 🐛 Troubleshooting

### Service Worker Not Registering

**Issue:** Service worker shows error in DevTools

**Solutions:**
- Ensure site is HTTPS (Vercel/Netlify handle this)
- Check `vite.config.js` PWA plugin is configured
- Clear browser cache and hard reload (Cmd+Shift+R)

### App Not Installing

**Issue:** "Add to Home Screen" doesn't appear

**Check:**
- Manifest is valid (`/manifest.webmanifest`)
- Icons are present (`/pwa-192x192.png`, `/pwa-512x512.png`)
- Service worker is registered
- Site is HTTPS

### Old Version Showing After Deploy

**Issue:** Users still see old version

**Solution:**
- Service worker auto-updates on next visit
- Or add update prompt in your app
- Users can hard refresh (Cmd+Shift+R)

### Build Fails

**Issue:** Deployment fails during build

**Check:**
- `npm run build` works locally
- All dependencies in `package.json`
- No local-only environment variables
- Build logs for specific error

---

## 📋 Pre-Deployment Checklist

Before you deploy, ensure:

- [ ] `npm run build` works locally
- [ ] App works in preview mode (`npm run preview`)
- [ ] Icons are added (192x192, 512x512)
- [ ] Manifest is configured (`vite.config.js`)
- [ ] Meta tags are set (`index.html`)
- [ ] App name and description are finalized
- [ ] Colors/theme are set
- [ ] Privacy policy URL (if collecting data)
- [ ] Error handling is in place
- [ ] Mobile tested on real device

---

## 🎯 Recommended: Vercel Setup (Step-by-Step)

Since we already have `vercel.json` configured:

1. **Push your code to GitHub** (if not already done)

2. **Go to [vercel.com](https://vercel.com)**

3. **Sign up with GitHub**

4. **Click "Add New Project"**

5. **Import `Shift6` repository**

6. **Click "Deploy"** (all settings auto-detected)

7. **Wait ~1 minute**

8. **Get your URL:** `shift6-xyz.vercel.app`

9. **Test PWA installation** on your phone

10. **Every push to `main` auto-deploys!**

That's it! Your app is live.

---

## 🔜 Next Steps After Deploy

1. **Share your URL** with friends/testers
2. **Get feedback** on UX and features
3. **Add custom domain** (optional)
4. **Monitor with analytics** (optional)
5. **Consider app stores** (use Capacitor later)
6. **Add more features** based on feedback
7. **Iterate and improve!**

---

## 💰 Cost Comparison

| Service | Free Tier | Custom Domain | Build Minutes | Bandwidth |
|---------|-----------|---------------|---------------|-----------|
| **Vercel** | Yes | Free SSL | Unlimited | 100GB/mo |
| **Netlify** | Yes | Free SSL | 300 min/mo | 100GB/mo |
| **GitHub Pages** | Yes | Free SSL | Unlimited | 100GB/mo |
| **Cloudflare** | Yes | Free SSL | Unlimited | Unlimited |
| **Firebase** | Yes | Free SSL | Limited | 10GB/mo |

**Recommendation:** Start with Vercel (best PWA support + zero config)

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Service Worker Guide](https://web.dev/service-workers/)

---

Need help? Check the Vercel dashboard logs or Vercel community forums!
