# Docker Deployment Guide

This guide explains how to containerize and deploy your React frontend application.

## 🏗️ Project Structure

Your project now includes:
- `Dockerfile` - Multi-stage build for production
- `docker-compose.yml` - Development environment
- `docker-compose.production.yml` - Production environment with SSL
- `nginx.conf` - Nginx configuration for serving React app
- `env-substitution.sh` - Runtime environment variable injection
- `.env.example` - Environment variables template

## 🚀 Quick Start

### 1. Development Setup

1. Copy environment file:
```bash
cp .env.example .env
```

2. Build and run with Docker Compose:
```bash
docker-compose up --build
```

3. Access your app at `http://localhost:3000`

### 2. Production Build

Build the Docker image:
```bash
docker build -t your-app-name:latest .
```

Run the container:
```bash
docker run -d \
  -p 3000:3000 \
  -e REACT_APP_API_URL=https://api.yourdomain.com \
  -e REACT_APP_ENVIRONMENT=production \
  your-app-name:latest
```

## 🌐 Server Deployment

### Prerequisites

1. **Linux Server** (Ubuntu 20.04+ recommended)
2. **Docker & Docker Compose** installed
3. **Domain** pointed to your server IP

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Deploy Your App

1. **Transfer files to server:**
```bash
# Using rsync (recommended)
rsync -avz --exclude node_modules ./ user@your-server:/opt/your-app/

# Or using git
git clone https://github.com/yourusername/your-repo.git /opt/your-app
```

2. **Configure environment:**
```bash
cd /opt/your-app
cp .env.example .env

# Edit environment file
nano .env
```

Update your `.env` file:
```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENVIRONMENT=production
BACKEND_URL=http://backend:8000
DOMAIN=yourdomain.com
LETSENCRYPT_EMAIL=your-email@domain.com
```

3. **Deploy with production compose:**
```bash
docker-compose -f docker-compose.production.yml up -d
```

## 🔧 Domain Configuration (GoDaddy)

### DNS Settings

In your GoDaddy DNS management:

1. **A Record:** Point your domain to your server IP
   - Type: `A`
   - Name: `@` (for yourdomain.com)
   - Value: `YOUR_SERVER_IP`
   - TTL: `600`

2. **CNAME for www:** (Optional)
   - Type: `CNAME`
   - Name: `www`
   - Value: `yourdomain.com`
   - TTL: `600`

### SSL Certificate

The production setup includes automatic SSL with Let's Encrypt via Traefik. SSL certificates will be automatically obtained and renewed.

## 🔗 Backend Integration

### Environment Variables for API Communication

Your app can communicate with a backend API using environment variables:

```typescript
// In your React components
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

### Backend Service Configuration

When ready to add a backend, update `docker-compose.yml`:

```yaml
services:
  backend:
    image: your-backend-image:latest
    build: ../backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
    networks:
      - app-network
```

## 📊 Monitoring & Logs

### View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
```

### Check container status:
```bash
docker-compose ps
```

## 🛠️ Troubleshooting

### Common Issues

1. **Port already in use:**
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

2. **Permission denied:**
```bash
sudo chmod +x env-substitution.sh
```

3. **Build failures:**
```bash
# Clear Docker cache
docker system prune -a
```

### Environment Variable Issues

1. **Variables not updating:** Restart the container
```bash
docker-compose down
docker-compose up -d
```

2. **Check runtime config:**
Visit `http://yourdomain.com/config.js` to verify variables

## 🔄 Updates & Maintenance

### Update your app:
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

### Backup important data:
```bash
# Backup volumes
docker run --rm -v your-app_letsencrypt:/backup-vol -v $(pwd):/backup alpine tar czf /backup/ssl-backup.tar.gz -C /backup-vol .
```

## 📈 Performance Optimization

The Docker setup includes:
- ✅ Gzip compression
- ✅ Static asset caching
- ✅ Security headers
- ✅ Multi-stage builds for smaller images
- ✅ Nginx for efficient static file serving

## 🔒 Security Features

- SSL/TLS termination with automatic certificates
- Security headers (HSTS, XSS Protection, etc.)
- Container isolation
- Non-root user execution

## 🎯 Next Steps

1. **Add monitoring:** Consider integrating Prometheus/Grafana
2. **CI/CD:** Set up automated deployments with GitHub Actions
3. **Database:** Add PostgreSQL or MongoDB services
4. **Caching:** Implement Redis for caching
5. **Load balancing:** Scale horizontally with multiple frontend instances

For questions or issues, check the logs and refer to the troubleshooting section above.
