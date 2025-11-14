FROM pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime

# Install system dependencies for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install base libs for ALINE + Bayesian simulation
RUN pip install --no-cache-dir \
    jupyterlab numpy pandas scipy scikit-learn matplotlib seaborn \
    torch torchvision torchaudio tqdm einops wandb pyyaml \
    statsmodels pymc pytensor \
    jupyter-resource-usage ipython

WORKDIR /workspace
EXPOSE 8888
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--allow-root", "--no-browser"]
