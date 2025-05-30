import asyncio
import os
import re
import json
import logging
from flask import Flask, request, jsonify
from cachetools import TTLCache
from functools import lru_cache
import ollama

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Environment Config
OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'localhost:11434')
PORT = int(os.getenv('PORT', 6000))
HOST = os.getenv('HOST', '0.0.0.0')

# Default model settings
DEFAULT_MODEL = os.getenv('DEFAULT_MODEL', 'gemma3:1b')
default_models = 'gemma3:4b,deepseek-r1:1.5b,deepseek-r1:latest,gemma3:1b,llama3.1:8b,n'
ALLOWED_MODELS = os.getenv('ALLOWED_MODELS', default_models).split(',')

# In-memory cache for responses (TTL: 1 hour)
cache = TTLCache(maxsize=1000, ttl=3600)

# Load prompts from external JSON
PROMPT_JSON_PATH = "prompts.json"

def load_prompt_config():
    try:
        with open(PROMPT_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return (
            data.get("prompt_engineering", []),
            data.get("wall_of_prompts", []),
            data.get("filter_keywords", [])
        )
    except Exception as e:
        logger.error(f"Failed to load {PROMPT_JSON_PATH}: {str(e)}")
        return [], [], []

@lru_cache(maxsize=500)
def cached_ollama_chat(model, prompt):
    try:
        prompt_engineering, wall_of_prompts, _ = load_prompt_config()
        messages = []

        for wall_prompt in wall_of_prompts:
            messages.append({"role": "system", "content": wall_prompt})

        for pre_prompt in prompt_engineering:
            messages.append({"role": "system", "content": pre_prompt})

        messages.append({"role": "user", "content": prompt})

        response = ollama.chat(
            model=model,
            messages=messages,
            options={
                'num_ctx': 1024,
                'temperature': 0.5,
                'top_p': 0.9,
                'seed': 42
            },
            stream=False
        )
        return response['message']['content']
    except Exception as e:
        logger.error(f"Ollama error: {str(e)}")
        raise

def apply_filters(response_text):
    _, _, filter_keywords = load_prompt_config()

    response_text = response_text.strip()
    if not response_text.endswith('.'):
        response_text += '.'
    if len(response_text) > 500:
        response_text = response_text[:497] + '...'

    for word in filter_keywords:
        response_text = re.sub(rf'\b{re.escape(word)}\b', '[REDACTED]', response_text, flags=re.IGNORECASE)

    phrases_to_clean = ['how was your day', 'hello', 'umm!', 'wow!', 'how is going']
    for phrase in phrases_to_clean:
        response_text = re.sub(re.escape(phrase), 'yo ', response_text, flags=re.IGNORECASE)

    response_text = re.sub(r'\b(Gemma|DeepSeek|llama)\b', 'I', response_text, flags=re.IGNORECASE)

    if 'Hina' not in response_text:
        response_text = f"Hina:, {response_text}"

    if 'Sourav' not in response_text:
        response_text += " what else you want talk i and if need again feel free to ask."

    return response_text

def convert_leading_asterisk_to_bold(text):
    return re.sub(r'^( *)(\*)( )', r'\1** ', text, flags=re.MULTILINE)

@app.route('/chat', methods=['POST'])
async def chat():
    try:
        data = request.get_json()
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Invalid JSON payload"}), 400

        raw_prompt = data.get("prompt", "").strip()
        logger.info(f"Received raw prompt: {raw_prompt}")

        if not raw_prompt:
            return jsonify({"error": "No prompt provided"}), 400

        model = DEFAULT_MODEL
        prompt = raw_prompt

        if prompt.startswith("/"):
            parts = prompt.split(" ", 1)
            if len(parts) == 2:
                requested_model = parts[0][1:].strip()
                prompt = parts[1].strip()
                if requested_model in ALLOWED_MODELS:
                    model = requested_model
                else:
                    return jsonify({"error": f"Model '{requested_model}' not available. Available: {ALLOWED_MODELS}"}), 400
            else:
                return jsonify({"error": "Invalid format. Use /model your prompt"}), 400

        cache_key = f"{model}:{prompt}"
        if cache_key in cache:
            logger.info("Returning cached response")
            response_text = cache[cache_key]
        else:
            response_text = await asyncio.to_thread(cached_ollama_chat, model, prompt)
            response_text = apply_filters(response_text)
            response_text = convert_leading_asterisk_to_bold(response_text)
            cache[cache_key] = response_text
            logger.info("Generated new response and cached it")

        return jsonify({"reply": response_text, "model": model})

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=PORT, host=HOST)
