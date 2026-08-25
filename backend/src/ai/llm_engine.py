"""
🤖 Unified In-Process Direct LLM Engine
Loads GGUF models directly into Python with 100% GPU acceleration (CUDA/Metal/Vulkan/AVX2).
Supports direct llama-cpp-python execution with automatic fallback to Ollama.
"""

import logging
import os
import sys
from collections.abc import Generator

from src.config import settings

logger = logging.getLogger("llm_engine")

# Locate models directory
ROOT_DIR = getattr(sys, "_MEIPASS", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
MODELS_DIR = os.path.join(ROOT_DIR, "models")
MODEL_FILENAME = "Llama-3.2-3B-Instruct-Q4_K_M.gguf"
DEFAULT_MODEL_PATH = os.path.join(MODELS_DIR, MODEL_FILENAME)

# Global in-process LLM instance cache
_DIRECT_LLM_INSTANCE = None


def detect_gpu() -> bool:
    """Detects if NVIDIA CUDA GPU or hardware acceleration is available."""
    try:
        import torch

        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            logger.info(f"🚀 CUDA GPU Detected: {gpu_name} ({torch.cuda.device_count()} device(s))")
            return True
    except Exception:
        pass

    # Check for NVIDIA SMI / GPU environment variables
    if "CUDA_PATH" in os.environ or "CUDA_HOME" in os.environ:
        return True
    return False


def get_direct_llm(model_path: str | None = None, n_ctx: int = 4096):
    """
    Initializes or returns the cached in-process Llama instance on GPU.
    """
    global _DIRECT_LLM_INSTANCE
    if _DIRECT_LLM_INSTANCE is not None:
        return _DIRECT_LLM_INSTANCE

    target_path = model_path or DEFAULT_MODEL_PATH

    # Check user home persistent models directory as well
    if not os.path.exists(target_path):
        user_model_path = os.path.join(os.path.expanduser("~"), ".finance_assistant", "models", MODEL_FILENAME)
        if os.path.exists(user_model_path):
            target_path = user_model_path

    if not os.path.exists(target_path):
        logger.info(f"Direct GGUF model not found at {target_path}. Using Ollama fallback.")
        return None

    try:
        from llama_cpp import Llama

        has_gpu = detect_gpu()
        # -1 offloads ALL 28-32 transformer layers directly onto GPU VRAM
        gpu_layers = -1 if has_gpu else 0

        logger.info(f"Loading {os.path.basename(target_path)} directly in Python (GPU layers: {gpu_layers})...")
        _DIRECT_LLM_INSTANCE = Llama(
            model_path=target_path,
            n_ctx=n_ctx,
            n_gpu_layers=gpu_layers,
            verbose=False,
            n_threads=os.cpu_count() or 4,
        )
        logger.info("✅ Direct LLM successfully loaded in memory/GPU!")
        return _DIRECT_LLM_INSTANCE
    except Exception as e:
        logger.warning(f"Could not load direct llama_cpp model: {e}. Falling back to Ollama.")
        return None


def generate_llm_response(
    prompt: str, system_prompt: str = "", max_tokens: int = 1024, temperature: float = 0.3
) -> str:
    """
    Generates text response using direct in-process GPU model if available,
    otherwise falls back to Ollama.
    """
    direct_llm = get_direct_llm()
    if direct_llm:
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            output = direct_llm.create_chat_completion(
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return output["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"Direct LLM inference error: {e}")

    # Fallback to Ollama
    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        from langchain_ollama import ChatOllama

        llm = ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_COPILOT_MODEL,
            temperature=temperature,
        )
        msgs = []
        if system_prompt:
            msgs.append(SystemMessage(content=system_prompt))
        msgs.append(HumanMessage(content=prompt))
        res = llm.invoke(msgs)
        return res.content.strip()
    except Exception as e:
        logger.error(f"Ollama fallback error: {e}")
        return f"Unable to generate AI analysis. (Error: {e})"


def generate_llm_stream(
    prompt: str, system_prompt: str = "", max_tokens: int = 1024, temperature: float = 0.3
) -> Generator[str, None, None]:
    """
    Streams tokens in real-time from direct GPU model or Ollama.
    """
    direct_llm = get_direct_llm()
    if direct_llm:
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            stream = direct_llm.create_chat_completion(
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )
            for chunk in stream:
                delta = chunk["choices"][0].get("delta", {})
                content = delta.get("content", "")
                if content:
                    yield content
            return
        except Exception as e:
            logger.error(f"Direct stream error: {e}")

    # Fallback to Ollama streaming
    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        from langchain_ollama import ChatOllama

        llm = ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_COPILOT_MODEL,
            temperature=temperature,
        )
        msgs = []
        if system_prompt:
            msgs.append(SystemMessage(content=system_prompt))
        msgs.append(HumanMessage(content=prompt))
        for chunk in llm.stream(msgs):
            if chunk.content:
                yield chunk.content
    except Exception as e:
        logger.error(f"Ollama stream error: {e}")
        yield f"AI streaming failed: {e}"
