# 🌥️ ALINE Cloud Deployment Guide

## Instance Details
- **Host**: `135.181.71.24`
- **GPU**: 1x Tesla V100 (16GB VRAM)
- **CPU**: 6 cores, 23GB RAM
- **OS**: Ubuntu 24.04 with CUDA 12.6 & Docker pre-installed
- **Location**: FIN-01
- **Login**: `ssh root@135.181.71.24`

---

## 🚀 Quick Deploy

### 1. Connect to Instance
```bash
ssh root@135.181.71.24
```

### 2. Clone/Upload Project
**Option A: Git Clone (if repo exists)**
```bash
git clone <your-repo-url> /workspace/ALINE
cd /workspace/ALINE
```

**Option B: SCP from Local Machine**
```bash
# Run from your local machine (Windows)
scp -r C:\Users\user\Documents\JunctionHack\ALINE root@135.181.71.24:/workspace/
```

### 3. Verify GPU & Docker
```bash
nvidia-smi                    # Check GPU
docker --version              # Verify Docker
nvidia-docker --version       # Verify NVIDIA Docker runtime
```

### 4. Build and Run
```bash
cd /workspace/ALINE
docker compose build
docker compose up -d          # Run in detached mode
```

### 5. Access JupyterLab
```bash
# Get the Jupyter token
docker compose logs jupyter | grep token
```

**Access from your browser:**
```
http://135.181.71.24:8888
```

Or create SSH tunnel for secure access:
```bash
# Run from your local machine
ssh -L 8888:localhost:8888 root@135.181.71.24
# Then access: http://localhost:8888
```

---

## 🔍 Management Commands

### View Logs
```bash
docker compose logs -f jupyter          # Follow logs
docker compose logs --tail 100 jupyter  # Last 100 lines
```

### Container Status
```bash
docker compose ps              # Running containers
docker stats                   # Resource usage
nvidia-smi                     # GPU utilization
```

### Restart Container
```bash
docker compose restart jupyter
```

### Stop/Start
```bash
docker compose stop            # Stop without removing
docker compose start           # Start existing containers
docker compose down            # Stop and remove containers
```

### Execute Commands Inside Container
```bash
docker compose exec jupyter bash           # Interactive shell
docker compose exec jupyter python -c "import torch; print(torch.cuda.is_available())"
```

---

## 🔒 Security Hardening

### 1. Set Jupyter Password
Add to `jupyter_notebook_config.py` or use token authentication only via SSH tunnel.

### 2. Firewall Rules
```bash
# Only allow SSH and Jupyter from your IP
ufw allow from YOUR_IP_ADDRESS to any port 22
ufw allow from YOUR_IP_ADDRESS to any port 8888
ufw enable
```

### 3. Use SSH Tunnel (Recommended)
Instead of exposing port 8888, always use SSH tunnel:
```bash
ssh -L 8888:localhost:8888 root@135.181.71.24
```

---

## 💾 Data Persistence

Your data is mounted at `/workspace` in the container, which maps to the host filesystem. Data persists across container restarts.

### Backup Data
```bash
# From cloud instance
tar -czf aline-backup-$(date +%Y%m%d).tar.gz /workspace/ALINE/data

# Download to local machine
scp root@135.181.71.24:/workspace/aline-backup-*.tar.gz ./
```

---

## 📊 Monitor GPU Usage

### Real-time monitoring
```bash
watch -n 1 nvidia-smi          # Update every second
```

### Inside Jupyter Notebook
```python
import torch
print(f"GPU Available: {torch.cuda.is_available()}")
print(f"GPU Name: {torch.cuda.get_device_name(0)}")
print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
```

---

## 🛠️ Troubleshooting

### Container won't start
```bash
docker compose logs jupyter
docker compose down && docker compose up
```

### GPU not detected in container
```bash
# Check NVIDIA Docker runtime
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

### Port 8888 already in use
```bash
# Find process using port
lsof -i :8888
# Or change port in docker-compose.yml
```

### Out of memory
```bash
# Clear Docker cache
docker system prune -a
```

---

## 💰 Cost Optimization

**Rate**: €0.1204/hour (~€2.89/day, ~€86.69/month)

**Best Practices:**
1. Stop container when not in use: `docker compose down`
2. Use checkpointing for long training runs
3. Monitor with `nvidia-smi` to ensure GPU utilization
4. Consider shutting down instance overnight if not training

---

## 📦 Next Steps

1. ✅ SSH into instance
2. ✅ Upload/clone ALINE project
3. ✅ Build and run container
4. ✅ Verify GPU in Jupyter notebook
5. 🚀 Start experimenting!

---

*Happy cloud computing! 🌩️*
