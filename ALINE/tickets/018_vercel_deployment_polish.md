### 🚀 `018_vercel_deployment_polish.md`

# 🚀 Ticket 018 – Vercel Deployment + Demo Polish

**Date:** 2025-11-15  
**Owner:** DevOps / Frontend  
**Status:** 🔧 To Do  
**Goal:** Deploy the React app to Vercel with optimized build settings, add demo-specific polish (reset button, onboarding skip, offline support), and ensure production-ready performance.

---

## 🎯 Objective

Make the demo publicly accessible and polished:

* Deploy to Vercel with automatic GitHub integration
* Optimize bundle size (code splitting, tree shaking)
* Add service worker for offline capability
* Implement demo reset functionality
* Add onboarding skip for repeat visitors
* Configure environment variables
* Set up custom domain (optional)
* Add analytics/monitoring

This enables:
- **Public demo** - Anyone can test the app
- **Global CDN** - Fast loading worldwide
- **Offline-first** - Works without connection
- **Production ready** - Optimized performance
- **Easy iteration** - Auto-deploy on git push

---

## 📂 Inputs

| File                       | Description                        |
| -------------------------- | ---------------------------------- |
| `package.json`             | Build configuration                |
| `vite.config.ts`           | Vite configuration                 |
| `.env.example`             | Environment variables template     |
| `src/App.tsx`              | Main app component                 |

---

## 🧩 Tasks

### 1. Optimize Vite Build Configuration

```typescript
// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  build: {
    // Target modern browsers
    target: 'es2020',
    
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-radix': Object.keys(require('./package.json').dependencies)
            .filter(key => key.startsWith('@radix-ui')),
          'vendor-charts': ['recharts'],
        },
      },
    },
    
    // Compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 2. Create Vercel Configuration

```json
// vercel.json

{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "devCommand": "npm run dev",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### 3. Add Environment Variables

```bash
# .env.production (for Vercel)

VITE_API_URL=https://ease-demo.vercel.app
VITE_ENVIRONMENT=production
VITE_DEMO_MODE=true
VITE_ANALYTICS_ID=G-XXXXXXXXXX  # Optional: Google Analytics
```

Configure in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add `VITE_DEMO_MODE=true`
3. Add `VITE_ENVIRONMENT=production`

### 4. Add Demo Reset Button

```typescript
// src/components/DemoResetButton.tsx

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { demoDataService } from '../services/demoDataService';

export function DemoResetButton() {
  const [showConfirm, setShowConfirm] = useState(false);

  // Only show in demo mode
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  if (!isDemoMode) return null;

  const handleReset = () => {
    demoDataService.resetDemo();
    localStorage.clear();
    window.location.reload();
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="fixed bottom-20 right-4 p-3 bg-muted border border-border rounded-full shadow-lg hover:bg-muted/80 transition-colors z-50"
        title="Reset demo"
      >
        <RotateCcw className="w-5 h-5" />
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full border border-border">
            <h2 className="text-h2 mb-2">Reset demo?</h2>
            <p className="text-body text-muted-foreground mb-6">
              This will clear all your check-ins, experiments, and timeline data. 
              The demo will restart from day 1.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReset}
                className="flex-1 bg-critical hover:bg-critical/90"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

Add to App.tsx:
```typescript
import { DemoResetButton } from './components/DemoResetButton';

// In App component
return (
  <>
    {/* ... existing app content ... */}
    <DemoResetButton />
  </>
);
```

### 5. Add Onboarding Skip for Repeat Visitors

```typescript
// src/App.tsx

const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
  return localStorage.getItem('ease_has_seen_onboarding') === 'true';
});

const [currentScreen, setCurrentScreen] = useState<string>(() => {
  // Skip onboarding if already seen
  if (hasSeenOnboarding) return 'home';
  return 'onboarding-1';
});

const handleOnboardingComplete = () => {
  localStorage.setItem('ease_has_seen_onboarding', 'true');
  setHasSeenOnboarding(true);
  setCurrentScreen('home');
};
```

### 6. Add Service Worker for Offline Support

```typescript
// public/sw.js

const CACHE_NAME = 'ease-demo-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/index.js',
  '/assets/index.css',
  '/src/data/demoUserAlex.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

Register service worker:
```typescript
// src/main.tsx

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Service worker registration failed
  });
}
```

### 7. Add Loading Optimization

```typescript
// src/App.tsx

import { Suspense, lazy } from 'react';

// Lazy load heavy components
const DiaryScreen = lazy(() => import('./components/DiaryScreen'));
const InsightsScreen = lazy(() => import('./components/InsightsScreen'));
const ProfileScreen = lazy(() => import('./components/ProfileScreen'));

// Use in render
<Suspense fallback={<LoadingSpinner />}>
  {currentScreen === 'diary' && <DiaryScreen {...props} />}
</Suspense>
```

### 8. Deploy to Vercel

**Method 1: GitHub Integration (Recommended)**

1. Push code to GitHub:
```bash
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

2. Connect to Vercel:
   - Go to vercel.com and sign in
   - Click "New Project"
   - Import your GitHub repository
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `build`
   - Click "Deploy"

3. Auto-deployments:
   - Every push to `main` triggers deployment
   - Preview deployments for PRs
   - Rollback capability

**Method 2: Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 9. Add Analytics (Optional)

```typescript
// src/utils/analytics.ts

const GA_ID = import.meta.env.VITE_ANALYTICS_ID;

export function trackPageView(page: string) {
  if (!GA_ID || !window.gtag) return;
  
  window.gtag('config', GA_ID, {
    page_path: page,
  });
}

export function trackEvent(action: string, category: string, label?: string) {
  if (!GA_ID || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
  });
}
```

Use in App:
```typescript
import { trackPageView, trackEvent } from './utils/analytics';

// Track screen changes
useEffect(() => {
  trackPageView(currentScreen);
}, [currentScreen]);

// Track interactions
const handleQuickCheck = () => {
  trackEvent('complete', 'QuickCheck', 'demo_user');
  // ... rest of logic
};
```

### 10. Add README for Public Demo

```markdown
// README.md (update)

# Ease - Migraine Prediction Demo

🚀 **[Live Demo](https://ease-demo.vercel.app)**

An AI-powered migraine prediction app that learns your unique patterns.

## Demo Features

- 📊 Pre-computed 30-day predictions (user "Alex")
- 🎯 Interactive risk updates via QuickCheck
- 📅 Calendar view with historical patterns
- 💡 Correlation discovery and insights
- 🧪 Experiment tracking (hydration, sleep)
- 💾 Offline-capable with localStorage persistence

## Tech Stack

- React 18 + TypeScript
- Vite for build optimization
- Radix UI components
- ALINE ML model (pre-computed)
- Vercel hosting

## Local Development

\`\`\`bash
npm install
npm run dev
\`\`\`

## Reset Demo

Click the reset button (bottom-right) to clear all demo data and start fresh.

## Note

This is a demonstration with pre-computed data. No real health data is collected or transmitted.
```

---

## 🧠 Integration

* Final ticket that ties together Tickets 013-017
* Makes demo publicly accessible
* Provides production-ready deployment

---

## 🧪 Validation Checklist

* [ ] Build completes without errors
* [ ] Bundle size < 1 MB (gzipped)
* [ ] Lighthouse score > 90 (performance)
* [ ] Works offline (service worker)
* [ ] Demo reset button functional
* [ ] Onboarding skips for repeat visitors
* [ ] Environment variables configured
* [ ] Custom domain connected (if applicable)
* [ ] Analytics tracking (if enabled)
* [ ] No console errors in production
* [ ] Responsive on mobile/desktop
* [ ] Fast loading (< 2s LCP)

---

## ✅ Deliverables

* [ ] Updated `vite.config.ts` with optimizations
* [ ] `vercel.json` configuration
* [ ] `.env.production` with environment variables
* [ ] `DemoResetButton` component
* [ ] Service worker for offline support
* [ ] Lazy loading for route components
* [ ] Analytics integration (optional)
* [ ] Updated README with demo link
* [ ] Live deployment on Vercel
* [ ] Custom domain (optional)

---

## 📝 Deployment Checklist

```
Pre-deployment:
□ npm run build succeeds
□ npm run preview works locally
□ All features tested in preview build
□ Environment variables defined
□ Analytics ID configured (if using)

Vercel setup:
□ GitHub repository connected
□ Framework preset: Vite
□ Build command: npm run build
□ Output directory: build
□ Environment variables added
□ Domain configured (if applicable)

Post-deployment:
□ Live site loads correctly
□ All routes work (/, /diary, /insights)
□ Demo data loads
□ QuickCheck updates risk
□ Calendar displays correctly
□ Insights show correlations
□ Reset button works
□ Offline mode functional
□ Mobile responsive
□ Share demo link with team
```

---

## 🌐 Expected URLs

- **Production**: `https://ease-demo.vercel.app`
- **Preview**: `https://ease-demo-[hash].vercel.app` (for PRs)
- **Custom**: `https://ease.yourdomain.com` (optional)

---

## 📊 Performance Targets

- **Lighthouse Performance**: > 90
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Total Blocking Time**: < 300ms
- **Cumulative Layout Shift**: < 0.1
- **Bundle size (gzipped)**: < 500 KB

---

> *"Ship fast, ship often, ship to production."*

---
