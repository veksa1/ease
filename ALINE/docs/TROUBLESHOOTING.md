# ALINE Deployment Troubleshooting Guide

Common issues and solutions when deploying the ALINE service to Google Cloud Run.

## Table of Contents
1. [Build Failures](#build-failures)
2. [Deployment Failures](#deployment-failures)
3. [Runtime Errors](#runtime-errors)
4. [Performance Issues](#performance-issues)
5. [Database Issues](#database-issues)
6. [GitHub Actions Issues](#github-actions-issues)

---

## Build Failures

### Issue: "Cannot find model checkpoint"
**Symptom:**
```
FileNotFoundError: runs/checkpoints/best.pt not found
```

**Solution:**
```bash
# Train the model locally first
cd ALINE
make data
make train

# Verify checkpoint exists
ls -lh runs/checkpoints/best.pt

# Commit and push
git add runs/checkpoints/best.pt
git commit -m "Add trained model checkpoint"
git push
```

### Issue: "uv.lock not found"
**Symptom:**
```
Error: uv.lock file not found
```

**Solution:**
```bash
# Generate lock file
cd ALINE
uv sync

# Commit lock file
git add uv.lock
git commit -m "Add uv.lock file"
git push
```

### Issue: "Docker build timeout"
**Symptom:**
```
ERROR: failed to solve: process "/bin/sh -c uv sync --frozen" did not complete
```

**Solution:**
1. Reduce image size by optimizing dependencies
2. Use Cloud Build instead of GitHub Actions build:
```yaml
# In deploy-gcloud.yaml, replace docker build with:
- name: Build with Cloud Build
  run: |
    gcloud builds submit --tag ${{ env.IMAGE_NAME }}:${{ github.sha }} ALINE/
```

---

## Deployment Failures

### Issue: "Permission denied" when deploying
**Symptom:**
```
ERROR: (gcloud.run.deploy) PERMISSION_DENIED: Permission denied
```

**Solution:**
```bash
# Verify service account has correct roles
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions@*"

# Add missing roles
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### Issue: "Service not accessible after deployment"
**Symptom:**
```
curl: (7) Failed to connect to aline-service-xxx.run.app
```

**Solution:**
```bash
# Check if service allows unauthenticated access
gcloud run services get-iam-policy aline-service --region us-central1

# Add unauthenticated access
gcloud run services add-iam-policy-binding aline-service \
  --region us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

### Issue: "Insufficient quota"
**Symptom:**
```
ERROR: RESOURCE_EXHAUSTED: Quota exceeded for quota metric 'Cloud Run requests'
```

**Solution:**
1. Request quota increase in GCP Console
2. Reduce max-instances:
```yaml
--max-instances 3
```
3. Use different region with available quota

---

## Runtime Errors

### Issue: "Model not loaded" error
**Symptom:**
```json
{"detail": "Model not loaded"}
```

**Solution:**
1. Check Cloud Run logs:
```bash
gcloud run services logs tail aline-service --region us-central1
```

2. Common causes:
   - Model checkpoint path incorrect in configs/service.yaml
   - Not enough memory allocated
   - Model file corrupted

3. Fix memory allocation:
```yaml
# In deploy-gcloud.yaml
--memory 4Gi  # Increase from 2Gi
```

### Issue: "Database file not writable"
**Symptom:**
```
sqlite3.OperationalError: unable to open database file
```

**Solution:**
Cloud Run has read-only filesystem except /tmp. Update database path:

```python
# In service/database.py
db_path = '/tmp/aline.db'
```

**Warning:** Data in /tmp is ephemeral. For production, use:
- Cloud SQL (PostgreSQL)
- Cloud Firestore
- Persistent volume (if needed)

### Issue: "Timeout errors"
**Symptom:**
```
504 Gateway Timeout
```

**Solution:**
1. Increase timeout:
```yaml
--timeout 600  # 10 minutes (max)
```

2. Optimize model inference:
```python
# Use smaller batch sizes
# Cache model outputs
# Use quantization if applicable
```

---

## Performance Issues

### Issue: "High cold start latency"
**Symptom:**
First request takes 30+ seconds

**Solutions:**
1. Use minimum instances:
```yaml
--min-instances 1  # Keep one instance warm
```

2. Reduce image size:
```dockerfile
# Use multi-stage build
FROM python:3.12-slim as builder
# Build dependencies
FROM python:3.12-slim
COPY --from=builder ...
```

3. Optimize model loading:
```python
# Load model lazily or use model cache
```

### Issue: "High memory usage"
**Symptom:**
Container OOM (Out of Memory) errors

**Solutions:**
1. Increase memory limit:
```yaml
--memory 4Gi
```

2. Use CPU-only mode:
```yaml
# In configs/service.yaml
device: cpu
```

3. Implement model pruning/quantization

---

## Database Issues

### Issue: "Data not persisting"
**Symptom:**
Calendar connections disappear after restart

**Solution:**
SQLite in /tmp is ephemeral. Use persistent storage:

**Option 1: Cloud SQL (Recommended for production)**
```python
# Update database.py to use PostgreSQL
import psycopg2

# Connection via Cloud SQL Proxy
conn = psycopg2.connect(
    host='/cloudsql/PROJECT:REGION:INSTANCE',
    database='aline',
    user='aline-user',
    password=os.getenv('DB_PASSWORD')
)
```

**Option 2: Cloud Firestore**
```python
from google.cloud import firestore

db = firestore.Client()
collection = db.collection('calendar_connections')
```

### Issue: "Database locked"
**Symptom:**
```
sqlite3.OperationalError: database is locked
```

**Solution:**
SQLite doesn't handle concurrent writes well. Solutions:
1. Use connection pooling
2. Implement write queue
3. Switch to PostgreSQL (recommended)

---

## GitHub Actions Issues

### Issue: "Secret not found"
**Symptom:**
```
Error: Input required and not supplied: credentials_json
```

**Solution:**
1. Verify secrets are set:
   - Go to GitHub → Settings → Secrets → Actions
   - Check GCP_PROJECT_ID and GCP_SA_KEY exist

2. Re-create service account key:
```bash
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com

# Copy entire JSON content to GCP_SA_KEY secret
```

### Issue: "Workflow not triggering"
**Symptom:**
Push to main doesn't trigger deployment

**Solution:**
1. Check workflow file syntax:
```bash
# Validate YAML
yamllint .github/workflows/deploy-gcloud.yaml
```

2. Check path filters match your changes:
```yaml
paths:
  - 'ALINE/service/**'
  - 'ALINE/models/**'
  # etc.
```

3. Manually trigger:
   - Go to Actions tab
   - Select "Deploy ALINE Service"
   - Click "Run workflow"

### Issue: "Tests failing in CI but passing locally"
**Symptom:**
Tests pass on local machine but fail in GitHub Actions

**Solution:**
1. Check Python version matches:
```yaml
python-version: "3.12"  # Should match local
```

2. Check for missing dependencies:
```bash
# Ensure all test dependencies are in pyproject.toml
```

3. Check for environment-specific code:
```python
# Avoid hardcoded paths, use Path(__file__).parent
```

---

## Quick Diagnostic Commands

```bash
# View recent logs
gcloud run services logs tail aline-service --limit 50

# Check service status
gcloud run services describe aline-service --region us-central1

# Test health endpoint
curl https://YOUR_SERVICE_URL/health

# Check resource usage
gcloud run services describe aline-service \
  --region us-central1 \
  --format='value(status.conditions)'

# View deployment revisions
gcloud run revisions list --service aline-service --region us-central1

# Rollback to previous revision
gcloud run services update-traffic aline-service \
  --region us-central1 \
  --to-revisions REVISION_NAME=100
```

---

## Getting Help

If you're still stuck:

1. **Check logs first:**
   ```bash
   gcloud run services logs tail aline-service --region us-central1
   ```

2. **Review GitHub Actions logs:**
   - Go to repository → Actions → Failed workflow
   - Expand each step to see detailed errors

3. **Common log locations:**
   - Cloud Run: GCP Console → Cloud Run → Service → Logs
   - GitHub Actions: Repository → Actions → Workflow run
   - Local: Check terminal output

4. **Enable debug logging:**
   ```python
   # In service/main.py
   logging.basicConfig(level=logging.DEBUG)
   ```

5. **Test locally first:**
   ```bash
   cd ALINE
   ./test-deployment.sh
   ```

6. **Open an issue:**
   - Include error messages
   - Include relevant logs
   - Describe what you've tried

---

## Prevention Checklist

Before deploying:
- [ ] Run `./test-deployment.sh` locally
- [ ] All tests pass (`make test`)
- [ ] Service imports successfully
- [ ] Model checkpoint exists
- [ ] Environment variables documented
- [ ] Secrets configured in GitHub
- [ ] GCP project setup complete
- [ ] Service account has permissions
- [ ] Budget alerts configured

---

**Last Updated:** 2025-11-15
**Maintainer:** ALINE Team
