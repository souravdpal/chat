#!/bin/bash

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
sudo apt install node 
npm init -y 
npm install

# Prompt user for system type
echo "Enter your system type:"
echo "1. Low-end CPU"
echo "2. Medium system"
echo "3. High-end system with GPU"
read -p "Your choice: " choice

# Run models based on system type
if [ "$choice" == "1" ]; then
    ollama run deepseek-r1:latest
    ollama run gemma3:1b

elif [ "$choice" == "2" ]; then
    ollama run deepseek-r1:latest
    ollama run deepseek-coder:1.3b
    ollama run mistral-openorca:7b

elif [ "$choice" == "3" ]; then
    echo "If you mean high-end, I think you have a god GPU 😎"
    ollama run gemma3:4b
    ollama run deepseek-r1:7b
    ollama run llama3.2:3b

else
    echo "Invalid choice. Please run the script again and enter 1, 2, or 3."
    exit 1
fi

# Final messages
echo ""
echo "✅ Now go to the server section."
echo "Inside server.js and AI.py, you’ll find DeepSeek as the default model."
echo "You can replace it with the one you prefer (Gemma, Mistral, etc)."
echo ""
echo "💡 DeepSeek is best for most tasks."
echo "🧠 Mistral is great for chit-chat."
echo "🔥 Gemma is the latest and can do text-gen, but image-gen not yet supported."
