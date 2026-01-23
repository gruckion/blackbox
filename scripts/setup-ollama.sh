#!/bin/bash
# Setup and verify Ollama for Blackbox

set -e

echo "=============================================="
echo "  Ollama Setup for Blackbox"
echo "=============================================="

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Error: Ollama is not installed."
    echo "Install it from: https://ollama.ai"
    exit 1
fi

echo "[1/4] Ollama is installed: $(ollama --version 2>/dev/null || echo 'version unknown')"

# Check if Ollama is running
echo "[2/4] Checking if Ollama is running..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "Ollama is not running. Starting it..."
    echo "Please run 'ollama serve' in another terminal, or start Ollama.app"
    echo ""
    echo "To start Ollama in background:"
    echo "  ollama serve &"
    exit 1
fi

echo "Ollama is running!"

# Pull a small model for testing
echo "[3/4] Pulling llama3.2:3b model for testing..."
ollama pull llama3.2:3b

# Test the API
echo "[4/4] Testing Ollama API..."
RESPONSE=$(curl -s http://localhost:11434/api/generate -d '{
  "model": "llama3.2:3b",
  "prompt": "Say hello in exactly 3 words",
  "stream": false
}')

if echo "$RESPONSE" | grep -q "response"; then
    echo "Ollama API test successful!"
    echo ""
    echo "=============================================="
    echo "  Ollama Setup Complete!"
    echo "=============================================="
    echo ""
    echo "Available models:"
    ollama list
    echo ""
    echo "API endpoint: http://localhost:11434"
else
    echo "Error: Ollama API test failed"
    echo "Response: $RESPONSE"
    exit 1
fi
