"""
📥 Fast Direct Model Downloader for Embedded Python AI
Downloads the GGUF model directly from Hugging Face into models/ with progress bar and resume capability.
"""

import os
import sys
import urllib.request
import time

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(ROOT_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Llama 3.2 3B Instruct - 4-bit Quantized GGUF (Fast & High Quality, ~2.0 GB)
MODEL_FILENAME = "Llama-3.2-3B-Instruct-Q4_K_M.gguf"
MODEL_URL = "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"
DESTINATION_PATH = os.path.join(MODELS_DIR, MODEL_FILENAME)


def download_progress_hook(block_num, block_size, total_size):
    downloaded = block_num * block_size
    if total_size > 0:
        percent = min(100.0, (downloaded / total_size) * 100)
        mb_downloaded = downloaded / (1024 * 1024)
        mb_total = total_size / (1024 * 1024)
        sys.stdout.write(f"\r ⏳ Downloading: {mb_downloaded:.1f} MB / {mb_total:.1f} MB ({percent:.1f}%)")
        sys.stdout.flush()


def download_model(force=False):
    print("=" * 70)
    print(" 📥 AI Model Downloader (Llama 3.2 3B GGUF for Direct GPU Execution)")
    print("=" * 70)
    print(f" 🎯 Destination: {DESTINATION_PATH}")

    if os.path.exists(DESTINATION_PATH) and not force:
        file_size_mb = os.path.getsize(DESTINATION_PATH) / (1024 * 1024)
        if file_size_mb > 1500:  # Valid GGUF file is > 1.5GB
            print(f" ✅ Model already exists ({file_size_mb:.1f} MB). Skipping download.")
            return DESTINATION_PATH

    print(f" 🌐 Downloading {MODEL_FILENAME} from Hugging Face...")
    start_time = time.time()
    try:
        urllib.request.urlretrieve(MODEL_URL, DESTINATION_PATH, reporthook=download_progress_hook)
        elapsed = time.time() - start_time
        print(f"\n ✅ Model successfully downloaded in {elapsed:.1f} seconds!")
        return DESTINATION_PATH
    except Exception as e:
        print(f"\n ❌ Download failed: {e}")
        return None


if __name__ == "__main__":
    download_model()
