# ALINE Service - Google Cloud Deployment Quick Start

This directory contains everything needed to deploy the ALINE FastAPI service to Google Cloud Run.

## 🎯 What Gets Deployed

- **Service**: FastAPI REST API for migraine prediction
- **Model**: PyTorch transformer model (SimpleALINE)
- **Database**: SQLite for user calendar connections
- **Platform**: Google Cloud Run (serverless)

## 📦 Files

- `Dockerfile.service` - Production Docker image for Cloud Run
- `.dockerignore.service` - Exclude unnecessary files from image
- `GOOGLE_CLOUD_DEPLOYMENT.md` - Complete deployment guide
- `.github/workflows/deploy-gcloud.yaml` - CI/CD workflow

## 🚀 Quick Deploy (3 Steps)

### 1. Set Up Google Cloud

```bash
# Enable required APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com

# Create service account for deployment
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 2. Configure GitHub Secrets

Go to your GitHub repo → Settings → Secrets → Actions:

- `GCP_PROJECT_ID`: Your Google Cloud project ID
- `GCP_SA_KEY`: Contents of `github-actions-key.json`
- `N8N_WEBHOOK_URL`: (Optional) Your n8n webhook URL

### 3. Deploy

```bash
# Train model (if not already done)
make data
make train

# Push to trigger deployment
git add .
git commit -m "Deploy to Google Cloud"
git push origin main
```

That's it! Your service will be available at:
```
https://aline-service-XXXXXXXXXX-uc.a.run.app
```

## 🧪 Test Your Deployment

```bash
# Get your service URL from GitHub Actions output or:
gcloud run services describe aline-service --region us-central1 --format 'value(status.url)'

# Test health endpoint
curl https://YOUR_SERVICE_URL/health

# Test API docs
# Open in browser: https://YOUR_SERVICE_URL/docs
```

## 📚 Full Documentation

See [GOOGLE_CLOUD_DEPLOYMENT.md](./GOOGLE_CLOUD_DEPLOYMENT.md) for:
- Detailed setup instructions
- Security configuration
- Cost optimization
- Monitoring and logging
- Troubleshooting guide

## 💡 Local Testing

Test the Docker image locally before deploying:

```bash
# Build image
cd ALINE
docker build -f Dockerfile.service -t aline-service:local .

# Run locally
docker run -p 8080:8080 -e PORT=8080 aline-service:local

# Test
curl http://localhost:8080/health
```

## 🔧 Configuration

- **Service Config**: `configs/service.yaml`
- **Model Config**: `configs/model.yaml`
- **Deployment Config**: `.github/workflows/deploy-gcloud.yaml`

## 📊 What Happens on Deployment

1. GitHub Actions triggers on push to `main`
2. Builds Docker image with your code
3. Pushes image to Google Container Registry
4. Deploys to Cloud Run
5. Service is live at your Cloud Run URL

## 💰 Cost

- **Free Tier**: 2M requests/month free
- **Light Usage**: ~$5-10/month for moderate traffic
- **Scale to Zero**: No cost when idle

## 🔒 Security Notes

- Service currently allows public access (`--allow-unauthenticated`)
- For production: Add authentication (API keys, OAuth, or IAM)
- All traffic is HTTPS encrypted
- Secrets managed via GitHub Secrets

## 🆘 Need Help?

1. Check GitHub Actions logs for deployment errors
2. View Cloud Run logs: `gcloud run services logs tail aline-service`
3. See [GOOGLE_CLOUD_DEPLOYMENT.md](./GOOGLE_CLOUD_DEPLOYMENT.md) troubleshooting section
4. Open an issue on GitHub

---

**Ready to deploy?** Follow the 3 steps above! 🎉
