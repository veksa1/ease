
  # Mobile Design System - React Frontend

A modern React frontend application built with Vite, TypeScript, and Radix UI components, fully containerized with Docker for easy deployment.

This is a code bundle for Mobile Design System. The original project is available at https://www.figma.com/design/YetTrsLZ1bdgQI2wvgVZAs/Mobile-Design-System.

## 🚀 Quick Start

### Development (Local)

1. **Install dependencies:**
```bash
npm install
```

2. **Start development server:**
```bash
npm run dev
```

3. **Open your browser:** `http://localhost:5173`

### Development (Docker)

1. **Copy environment file:**
```bash
cp .env.example .env
```

2. **Start with Docker Compose:**
```bash
npm run docker:dev
```

3. **Access your app:** `http://localhost:3000`

## 🐳 Docker Commands

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Build Docker image |
| `npm run docker:run` | Run container in detached mode |
| `npm run docker:dev` | Start development environment |
| `npm run docker:prod` | Start production environment |
| `npm run docker:stop` | Stop all containers |
| `npm run docker:logs` | View container logs |

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components (Radix UI based)
│   └── figma/          # Figma-specific components
├── styles/             # CSS and styling
├── utils/              # Utility functions
│   ├── api.ts          # API client for backend communication
│   └── env.ts          # Environment configuration
└── main.tsx           # Application entry point
```

## 🌍 Environment Variables

Create a `.env` file from `.env.example`:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development

# Docker Configuration
BACKEND_URL=http://backend:8000
```

For production:
```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENVIRONMENT=production
```

## 🔗 Backend Integration

The app includes utilities for easy backend communication:

```typescript
import { apiClient } from './utils/api';

// GET request
const { data, error } = await apiClient.get('/users');

// POST request
const { data, error } = await apiClient.post('/users', { name: 'John' });
```

## 🏭 Production Deployment

### Option 1: Docker with Traefik (Recommended)

1. **Set up your server** (see `DEPLOYMENT.md` for detailed instructions)

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your production values
```

3. **Deploy with SSL:**
```bash
npm run docker:prod
```

This automatically:
- ✅ Sets up SSL certificates with Let's Encrypt
- ✅ Configures reverse proxy
- ✅ Enables automatic renewals
- ✅ Optimizes for production

### Option 2: Manual Docker Deployment

```bash
# Build and run manually
docker build -t ease3-frontend .
docker run -d -p 3000:3000 \
  -e REACT_APP_API_URL=https://api.yourdomain.com \
  -e REACT_APP_ENVIRONMENT=production \
  ease3-frontend
```

## 🔧 Domain Configuration (GoDaddy)

1. **Add A Record:**
   - Type: `A`
   - Name: `@`
   - Value: `YOUR_SERVER_IP`

2. **Add CNAME for www:**
   - Type: `CNAME`
   - Name: `www`
   - Value: `yourdomain.com`

## 📊 Features

- ✅ **Modern Stack:** React 18, TypeScript, Vite
- ✅ **UI Components:** Radix UI with custom styling
- ✅ **Containerized:** Docker with multi-stage builds
- ✅ **SSL Ready:** Automatic HTTPS with Let's Encrypt
- ✅ **Environment Variables:** Runtime configuration support
- ✅ **API Ready:** Built-in API client utilities
- ✅ **Production Optimized:** Gzip, caching, security headers

## 🛠️ Development

### Adding New Components

1. Create in `src/components/`
2. Follow the existing pattern with TypeScript interfaces
3. Use Radix UI components from `src/components/ui/`

### API Integration

```typescript
// utils/api.ts provides a configured client
import { apiClient } from '../utils/api';

const MyComponent = () => {
  useEffect(() => {
    const fetchData = async () => {
      const response = await apiClient.get('/api/data');
      if (response.data) {
        setData(response.data);
      }
    };
    fetchData();
  }, []);
};
```

### Environment Configuration

```typescript
// utils/env.ts provides environment utilities
import { ENV, getApiUrl, isProduction } from '../utils/env';

// Get API URL for any endpoint
const apiUrl = getApiUrl('/users'); // https://api.yourdomain.com/users

// Check environment
if (isProduction()) {
  // Production-specific code
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Port 3000 already in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

2. **Docker build failures:**
```bash
docker system prune -a
npm run docker:build
```

3. **Environment variables not updating:**
```bash
npm run docker:stop
npm run docker:dev
```

### Logs

```bash
# View all logs
npm run docker:logs

# View specific service logs
docker-compose logs -f frontend
```

## 📚 Additional Documentation

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) - Comprehensive deployment guide
- [Radix UI Documentation](https://www.radix-ui.com/) - UI component library
- [Vite Documentation](https://vitejs.dev/) - Build tool

---

**Need help?** Check the `DEPLOYMENT.md` file for detailed server setup and deployment instructions.
  