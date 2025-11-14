# ALINE - Adaptive Learning for Individualized Neurological Episodes

ALINE is a Bayesian simulation and ML framework for modeling migraine distributions and optimizing personalized treatment strategies.

---

## 🚀 Quick Start with Docker

### Prerequisites

- Docker Desktop (with GPU support enabled for CUDA acceleration)
- Docker Compose

### Setup and Run

1. **Build the container:**
   ```bash
   docker compose build
   ```

2. **Start JupyterLab:**
   ```bash
   docker compose up
   ```

3. **Access JupyterLab:**
   - Open your browser to `http://localhost:8888`
   - Use the token displayed in the terminal logs

4. **Verify GPU availability (optional):**
   Inside a notebook, run:
   ```python
   import torch
   print(torch.cuda.is_available())
   ```

### Development Workflow

- All project files are mounted to `/workspace` inside the container
- Changes made inside the container are reflected on your host machine
- Notebooks are located in `/workspace/notebooks`

### Stop the Environment

```bash
docker compose down
```

---

## 📦 Installed Dependencies

The Docker environment includes:
- **JupyterLab** for interactive development
- **PyTorch** with CUDA 12.1 support
- **Bayesian Inference**: PyMC, PyTensor
- **Scientific Computing**: NumPy, Pandas, SciPy, scikit-learn
- **Visualization**: Matplotlib, Seaborn
- **Utilities**: tqdm, einops, wandb, PyYAML

See `requirements.txt` for version details.

---

## 📂 Project Structure

```
ALINE/
├── data/                    # Mock and real data
├── notebooks/               # Jupyter notebooks for experiments
├── scripts/                 # Utility scripts
├── tickets/                 # Project tickets and planning
├── Dockerfile              # Container definition
├── docker-compose.yml      # Service orchestration
└── requirements.txt        # Python dependencies
```

---

## 📝 Development Tickets

- **001**: Mock distribution generator
- **002**: Docker Jupyter environment (current)
- **003**: Feature normalization and priors
- **004+**: Migraine simulator and policy optimization

---

## 🤝 Contributing

1. Check open tickets in `/tickets`
2. Make changes in the containerized environment
3. Update relevant documentation
4. Test notebooks end-to-end

---

*Build the lab before the experiment.*
