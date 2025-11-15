"""
Quick test to verify tqdm is installed and working
"""
try:
    from tqdm import tqdm
    import time
    
    print("✓ tqdm imported successfully")
    print("\nTesting progress bar:")
    
    # Test basic progress bar
    for i in tqdm(range(50), desc="Test progress"):
        time.sleep(0.02)
    
    # Test nested progress bars
    print("\nTesting nested progress bars (like epochs and batches):")
    for epoch in tqdm(range(3), desc="Epochs", position=0):
        for batch in tqdm(range(20), desc=f"Epoch {epoch+1}", position=1, leave=False):
            time.sleep(0.01)
    
    print("\n✓ All tqdm tests passed!")
    print("Ready to use tqdm in training script")
    
except ImportError as e:
    print(f"✗ Error importing tqdm: {e}")
    print("\nTo install tqdm, run:")
    print("  uv pip install tqdm")
    
except Exception as e:
    print(f"✗ Error during test: {e}")
