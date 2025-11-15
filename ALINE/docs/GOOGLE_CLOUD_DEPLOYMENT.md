# 🚀 Google Cloud Deployment Guide - ALINE Service

This guide covers deploying the ALINE FastAPI service to Google Cloud Run using GitHub Actions for CI/CD.

## 📋 Prerequisites

1. **Google Cloud Platform Account**
   - Create a GCP project at [console.cloud.google.com](https://console.cloud.google.com)
   - Enable billing for your project
   - Note your Project ID

2. **Required Google Cloud APIs**
   Enable the following APIs in your GCP project:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

3. **Service Account Setup**
   Create a service account for GitHub Actions deployment:
   ```bash
   # Create service account
   gcloud iam service-accounts create github-actions \
     --description="Service account for GitHub Actions deployment" \
     --display-name="GitHub Actions"

   # Grant necessary roles
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.admin"

   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"

   # Create and download key
   gcloud iam service-accounts keys create github-actions-key.json \
     --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com
   ```

## 🔑 GitHub Secrets Configuration

Add the following secrets to your GitHub repository:
(Settings → Secrets and variables → Actions → New repository secret)

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `GCP_PROJECT_ID` | Your GCP Project ID | From GCP Console dashboard |
| `GCP_SA_KEY` | Service Account JSON Key | Contents of `github-actions-key.json` |
| `N8N_WEBHOOK_URL` | n8n webhook URL (optional) | Your n8n workflow webhook endpoint |

### Setting up secrets:

```bash
# In your GitHub repository settings, add:
# 1. GCP_PROJECT_ID = your-project-id
# 2. GCP_SA_KEY = paste entire JSON content from github-actions-key.json
# 3. N8N_WEBHOOK_URL = https://your-n8n-instance.com/webhook/aline-context
```

## 📦 Model Checkpoint Setup

The ALINE service requires a trained model checkpoint. You have two options:

### Option 1: Upload checkpoint to Cloud Storage

```bash
# Create a Cloud Storage bucket
gsutil mb -p PROJECT_ID gs://PROJECT_ID-aline-models

# Upload your trained model
gsutil cp ALINE/runs/checkpoints/best.pt gs://PROJECT_ID-aline-models/checkpoints/best.pt

# Make it publicly readable (or configure service account access)
gsutil acl ch -u AllUsers:R gs://PROJECT_ID-aline-models/checkpoints/best.pt
```

Then update `ALINE/configs/service.yaml`:
```yaml
model:
  checkpoint_path: gs://PROJECT_ID-aline-models/checkpoints/best.pt
```

### Option 2: Include checkpoint in Docker image (for testing)

```bash
# Make sure your checkpoint exists locally
cd ALINE
make data    # Generate data
make train   # Train model to create runs/checkpoints/best.pt
```

The Dockerfile will include it in the image (increases image size).

## 🚀 Deployment

### Automatic Deployment via GitHub Actions

1. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Deploy ALINE service to Google Cloud"
   git push origin main
   ```

2. **Monitor deployment**:
   - Go to your GitHub repository → Actions tab
   - Watch the "Deploy ALINE Service to Google Cloud Run" workflow
   - Check for any errors in the deployment logs

3. **Get your service URL**:
   After successful deployment, the workflow will output your service URL:
   ```
   https://aline-service-XXXXXXXXXX-uc.a.run.app
   ```

### Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# Set your GCP project
gcloud config set project PROJECT_ID

# Build and deploy
cd ALINE
gcloud run deploy aline-service \
  --source . \
  --dockerfile Dockerfile.service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --port 8080
```

## 🔍 Testing the Deployment

Once deployed, test your service:

```bash
# Replace with your actual service URL
export SERVICE_URL="https://aline-service-XXXXXXXXXX-uc.a.run.app"

# Test health endpoint
curl $SERVICE_URL/health

# Test risk prediction (requires sample data)
curl -X POST $SERVICE_URL/risk/daily \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "features": [
      [7.5, 8, 9, 3, 8, 2, 150, 2.1, 8, 30, 7, 3, 6, 1013, 45, 0.5, 1, 0, 0, 15],
      ...  # 24 hours of features
    ]
  }'
```

## 📊 Monitoring & Logs

### View Logs
```bash
# Stream logs
gcloud run services logs tail aline-service --region us-central1

# View in Cloud Console
# Navigate to: Cloud Run → aline-service → Logs
```

### Metrics
Monitor your service in the GCP Console:
- Cloud Run → aline-service → Metrics
- View: Request count, latency, memory usage, CPU usage

## 🛠️ Configuration

### Environment Variables

The service supports the following environment variables (set in `.github/workflows/deploy-gcloud.yaml`):

| Variable | Description | Default |
|----------|-------------|---------|
| `N8N_WEBHOOK_URL` | n8n webhook for calendar integration | None |
| `PORT` | Server port | 8080 |

### Service Configuration

Edit `ALINE/configs/service.yaml` for:
- Model parameters
- Server settings
- Policy configuration
- Feature definitions

### Database

The service uses SQLite by default. The database file is stored at:
```
/app/data/aline.db
```

⚠️ **Note**: SQLite is suitable for development and light production use. For high-traffic production deployments, consider:
- Using Cloud SQL (PostgreSQL) with connection pooling
- Implementing Cloud Datastore for user data
- Adding persistent volume for SQLite database

## 🔒 Security Best Practices

1. **Authentication**: 
   - The current deployment allows unauthenticated access
   - For production, add authentication:
     ```bash
     # Remove --allow-unauthenticated flag
     # Add IAM authentication or API keys
     ```

2. **HTTPS Only**: Cloud Run enforces HTTPS by default ✅

3. **Secrets Management**:
   - Use Google Secret Manager for sensitive configuration
   - Never commit credentials to the repository

4. **CORS Configuration**:
   - Review and restrict CORS origins in `service/main.py`
   - Current: `allow_origins=["*"]` (open to all)

## 💰 Cost Optimization

Cloud Run pricing is based on:
- **CPU and Memory**: $0.00002400 per vCPU-second, $0.00000250 per GiB-second
- **Requests**: $0.40 per million requests
- **Free Tier**: 2 million requests/month, 360,000 GiB-seconds, 180,000 vCPU-seconds

Optimization tips:
1. Set `--min-instances 0` to scale to zero when not in use ✅
2. Use `--max-instances` to cap maximum spend
3. Optimize cold start time by reducing image size
4. Consider Cloud Run jobs for batch processing

**Estimated monthly cost** (light usage):
- ~100 requests/day: **Free** (within free tier)
- ~10,000 requests/day: **~$5-10/month**

## 🔄 CI/CD Workflow

The deployment workflow triggers on:
- Push to `main` branch
- Changes in `ALINE/service/**`, `ALINE/models/**`, `ALINE/configs/**`
- Manual trigger via GitHub Actions

Workflow steps:
1. ✅ Checkout code
2. ✅ Authenticate to GCP
3. ✅ Build Docker image
4. ✅ Push to Google Container Registry
5. ✅ Deploy to Cloud Run
6. ✅ Output service URL

## 🐛 Troubleshooting

### Build Fails

**Issue**: "Cannot find model checkpoint"
```bash
# Solution: Train model locally first
cd ALINE
make data
make train
```

**Issue**: "uv.lock not found"
```bash
# Solution: Generate lock file
cd ALINE
uv sync
```

### Deployment Fails

**Issue**: "Permission denied"
```bash
# Solution: Verify service account has correct roles
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions@*"
```

**Issue**: "Service not accessible"
```bash
# Solution: Check if service allows unauthenticated access
gcloud run services get-iam-policy aline-service --region us-central1
```

### Runtime Errors

**Issue**: "Model not loaded"
- Check logs for model loading errors
- Verify checkpoint path in `configs/service.yaml`
- Ensure model file is accessible

**Issue**: "Database errors"
- Check if `/app/data` directory exists
- Verify write permissions

## 📚 Additional Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GitHub Actions for GCP](https://github.com/google-github-actions)
- [ALINE Service API Documentation](http://SERVICE_URL/docs)

## 🎯 Next Steps

After deployment:
1. ✅ Test all API endpoints
2. ✅ Set up monitoring and alerts
3. ✅ Configure custom domain (optional)
4. ✅ Implement authentication
5. ✅ Set up staging environment
6. ✅ Configure CI/CD for testing before deployment

---

**Need Help?** 
- Check Cloud Run logs: `gcloud run services logs tail aline-service`
- Review GitHub Actions workflow runs
- Open an issue on GitHub
