# 🚀 ALINE Google Cloud Deployment - Setup Checklist

Use this checklist to deploy the ALINE service to Google Cloud Run.

---

## ✅ Pre-Deployment Checklist

### Local Validation
- [ ] Run `cd ALINE && ./test-deployment.sh` - all checks pass
- [ ] All unit tests pass (`make test`)
- [ ] Service imports successfully
- [ ] Model checkpoint exists at `runs/checkpoints/best.pt`

### Documentation Review
- [ ] Read `DEPLOYMENT_QUICKSTART.md` (3-step guide)
- [ ] Skim `GOOGLE_CLOUD_DEPLOYMENT.md` (complete reference)
- [ ] Bookmark `TROUBLESHOOTING.md` (for later)

---

## 🌐 Google Cloud Setup

### 1. Create GCP Project
- [ ] Go to [console.cloud.google.com](https://console.cloud.google.com)
- [ ] Create new project or select existing
- [ ] Note your Project ID: `_______________________`
- [ ] Enable billing (required for Cloud Run)

### 2. Enable Required APIs
```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```
- [ ] APIs enabled successfully

### 3. Create Service Account
```bash
# Replace PROJECT_ID with your actual project ID

gcloud iam service-accounts create github-actions \
  --description="Service account for GitHub Actions deployment" \
  --display-name="GitHub Actions"
```
- [ ] Service account created

### 4. Grant Permissions
```bash
# Replace PROJECT_ID with your actual project ID

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```
- [ ] Permissions granted

### 5. Create Service Account Key
```bash
# Replace PROJECT_ID with your actual project ID

gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com
```
- [ ] Key file `github-actions-key.json` downloaded
- [ ] **IMPORTANT:** Keep this file secure, don't commit to git!

---

## 🔑 GitHub Secrets Configuration

### Navigate to Secrets
1. [ ] Go to your GitHub repository
2. [ ] Click **Settings** → **Secrets and variables** → **Actions**
3. [ ] Click **New repository secret**

### Add Secrets

#### Secret 1: GCP_PROJECT_ID
- [ ] Name: `GCP_PROJECT_ID`
- [ ] Value: Your Google Cloud Project ID
- [ ] Click **Add secret**

#### Secret 2: GCP_SA_KEY
- [ ] Name: `GCP_SA_KEY`
- [ ] Value: **Entire contents** of `github-actions-key.json`
  ```bash
  # To copy file contents (Linux/Mac):
  cat github-actions-key.json | pbcopy  # Mac
  cat github-actions-key.json | xclip   # Linux
  
  # Or open in text editor and copy all
  ```
- [ ] Paste entire JSON (including braces `{}`)
- [ ] Click **Add secret**

#### Secret 3: N8N_WEBHOOK_URL (Optional)
- [ ] Name: `N8N_WEBHOOK_URL`
- [ ] Value: Your n8n webhook URL (e.g., `https://n8n.example.com/webhook/aline-context`)
- [ ] Click **Add secret**
- [ ] Skip if not using calendar integration

### Verify Secrets
- [ ] `GCP_PROJECT_ID` appears in secrets list
- [ ] `GCP_SA_KEY` appears in secrets list
- [ ] (Optional) `N8N_WEBHOOK_URL` appears in secrets list

---

## 🚀 First Deployment

### Trigger Deployment
```bash
# Make sure you're on the deployment branch
git checkout copilot/start-implementation-for-deployment

# Push to main to trigger deployment
git push origin copilot/start-implementation-for-deployment:main
```
- [ ] Code pushed successfully

### Monitor Deployment
1. [ ] Go to repository → **Actions** tab
2. [ ] Click on "Deploy ALINE Service to Google Cloud Run" workflow
3. [ ] Watch the progress:
   - [ ] Test job passes
   - [ ] Deploy job builds image
   - [ ] Security scan completes
   - [ ] Image pushed to GCR
   - [ ] Service deployed to Cloud Run

### Get Service URL
- [ ] Deployment completes successfully
- [ ] Note service URL from workflow output: `_______________________`
- [ ] Or run: `gcloud run services describe aline-service --region us-central1 --format 'value(status.url)'`

---

## 🧪 Test Deployment

### Health Check
```bash
# Replace with your actual service URL
export SERVICE_URL="https://aline-service-XXXXXXXXXX-uc.a.run.app"

curl $SERVICE_URL/health
```
Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T...",
  "model_loaded": true
}
```
- [ ] Health endpoint returns 200 OK
- [ ] Model loaded is `true`

### API Documentation
- [ ] Open in browser: `$SERVICE_URL/docs`
- [ ] Swagger UI loads
- [ ] All endpoints visible

### Test Risk Prediction (Optional)
```bash
# Requires sample data - see GOOGLE_CLOUD_DEPLOYMENT.md
curl -X POST $SERVICE_URL/risk/daily \
  -H "Content-Type: application/json" \
  -d @examples/sample_request.json
```
- [ ] API responds successfully

---

## 📊 Post-Deployment

### Monitoring
- [ ] Go to [Cloud Run Console](https://console.cloud.google.com/run)
- [ ] Find `aline-service`
- [ ] Check:
  - [ ] Status is "Healthy"
  - [ ] URL is accessible
  - [ ] Metrics show no errors

### Logs
```bash
# View recent logs
gcloud run services logs tail aline-service --region us-central1

# Or view in console:
# Cloud Run → aline-service → Logs
```
- [ ] Logs show successful startup
- [ ] No error messages
- [ ] Model loaded successfully

### Set Up Alerts (Optional but Recommended)
- [ ] Cloud Monitoring → Alerting
- [ ] Create alert for error rate > 5%
- [ ] Create alert for high latency
- [ ] Set notification email

### Cost Monitoring
- [ ] Go to [Billing](https://console.cloud.google.com/billing)
- [ ] Set up budget alert (e.g., $10/month)
- [ ] Enable cost breakdown by service

---

## 🔒 Security Checklist

### Secrets Management
- [ ] `github-actions-key.json` deleted from local machine (keep secure backup)
- [ ] No credentials committed to git
- [ ] GitHub secrets are set correctly

### Access Control
- [ ] Review service account permissions (minimal required)
- [ ] Consider restricting `--allow-unauthenticated` for production
- [ ] Set up API authentication if needed (see docs)

### Security Scanning
- [ ] Check GitHub Security tab for vulnerabilities
- [ ] Review Trivy scan results in workflow
- [ ] Address any CRITICAL or HIGH findings

---

## 📱 Update Workflow

For future updates:

### 1. Make Changes
```bash
cd ALINE
# Edit service/main.py or other files
```

### 2. Test Locally
```bash
./test-deployment.sh
```
- [ ] All checks pass

### 3. Commit and Push
```bash
git add .
git commit -m "Description of changes"
git push origin main
```
- [ ] Deployment automatically triggers
- [ ] Monitor in Actions tab

### 4. Verify Update
- [ ] Check new revision in Cloud Run
- [ ] Test updated functionality
- [ ] Review logs for errors

---

## ❓ Troubleshooting

If something goes wrong:

1. **Check GitHub Actions logs**
   - Actions tab → Failed workflow → Expand steps

2. **Check Cloud Run logs**
   ```bash
   gcloud run services logs tail aline-service --region us-central1
   ```

3. **Review troubleshooting guide**
   - Open `TROUBLESHOOTING.md`
   - Find your error scenario
   - Follow solution steps

4. **Common Issues**
   - [ ] Secrets not set → Add in GitHub Settings
   - [ ] Permission denied → Check service account roles
   - [ ] Model not loaded → Check checkpoint exists
   - [ ] Build timeout → Increase timeout or optimize

---

## ✅ Deployment Complete!

When all items are checked:

- [ ] **Service is deployed** to Google Cloud Run
- [ ] **Health check passes**
- [ ] **API documentation accessible**
- [ ] **Monitoring set up**
- [ ] **Cost alerts configured**
- [ ] **Security reviewed**

**Congratulations!** 🎉 Your ALINE service is now live in production!

---

## 📚 Additional Resources

- [DEPLOYMENT_QUICKSTART.md](./DEPLOYMENT_QUICKSTART.md) - Quick reference
- [GOOGLE_CLOUD_DEPLOYMENT.md](./GOOGLE_CLOUD_DEPLOYMENT.md) - Complete guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Debug help
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GitHub Actions Documentation](https://docs.github.com/actions)

---

## 🆘 Need Help?

1. Check `TROUBLESHOOTING.md` first
2. Review Cloud Run logs
3. Check GitHub Actions workflow logs
4. Open an issue on GitHub with error details

---

**Date:** 2025-11-15  
**Version:** 1.0  
**Deployment Type:** Google Cloud Run via GitHub Actions
