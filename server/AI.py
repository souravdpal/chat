import asyncio
import os
import re
import logging
from flask import Flask, request, jsonify
from cachetools import TTLCache
import ollama
from functools import lru_cache

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration from environment variables
OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'localhost:11434')
PORT = int(os.getenv('PORT', 6000))
HOST = os.getenv('HOST', '0.0.0.0')
ALLOWED_MODELS = os.getenv('ALLOWED_MODELS', 'gemma3:4b,deepseek-r1:1.5b').split(',')
DEFAULT_MODEL = os.getenv('DEFAULT_MODEL', 'gemma3:4b')

# In-memory cache for responses (TTL: 1 hour, max 1000 entries)
cache = TTLCache(maxsize=1000, ttl=3600)

# Response filters
def apply_filters(response_text):
    """Apply filters to ensure response quality and personalization."""
    # Politeness filter: Ensure professional tone and end with a period
    response_text = response_text.strip()
    if not response_text.endswith('.'):
        response_text += '.'

    # Length filter: Truncate to 500 characters if too long
    if len(response_text) > 500:
        response_text = response_text[:497] + '...'

    # Safety filter: Remove potentially offensive words
    offensive_words = ['offensive', 'inappropriate']  # Add more as needed
    for word in offensive_words:
        response_text = re.sub(rf'\b{word}\b', '[REDACTED]', response_text, flags=re.IGNORECASE)

    # Tone filter: Replace overly casual phrases
    response_text = response_text.replace('yo ', 'Hello ')

    # Personalization filter: Ensure "Hina" is used, remove model names
    response_text = re.sub(r'\b(Gemma|DeepSeek)\b', 'I', response_text, flags=re.IGNORECASE)
    if 'Hina' not in response_text:
        response_text = f"Hello Hina, {response_text.lower()[0] + response_text[1:]}"

    # Add creator acknowledgment if not present
    if 'Sourav' not in response_text:
        response_text += f" This app was created by Sourav to assist you, Hina."

    return response_text

# Cache Ollama responses
@lru_cache(maxsize=500)
def cached_ollama_chat(model, prompt):
    """Cached Ollama chat function to avoid redundant calls."""
    try:
        response = ollama.chat(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "dont tell user all time that you are hina created by sourav and dont mention too much hina you have tell user you are hina created by sourav only if user say any greeting words or asking about you exaple 'hi','hello','who are you"
                        "your work to guide tell and tell users what they ask for and rember you are hina"
                        "dont mention hina just say user i am hina and how can i assit you today and let user ask his/her question"
                        "always adress user like  'i am hina how can assit you'"
                        "your i identity is hina you are hina"
                        "your name for this process is given is hina you are hina your name is hina"
                        "You are a helpful AI assistant created by Sourav. "
                        "Address the user that you are hina not any model you are polite and try to sound like human , and avoid mentioning model names like Gemma or DeepSeek. "
                        "Respond concisely, politely, and professionally."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            options={
                'num_ctx': 1024,  # Smaller context window for speed
                'temperature': 0.5,  # Less randomness for faster responses
                'top_p': 0.9,  # Narrower sampling for efficiency
                'seed': 42  # Consistent responses
            },
            stream=False
        )
        return response['message']['content']
    except Exception as e:
        logger.error(f"Ollama error: {str(e)}")
        raise

@app.route('/chat', methods=['POST'])
async def chat():
    try:
        data = request.get_json()
        if not data or not isinstance(data, dict):
            return jsonify({"error": "Invalid JSON payload"}), 400

        raw_prompt = data.get("prompt", "")
        logger.info(f"Received raw prompt: {raw_prompt}")

        model = DEFAULT_MODEL
        prompt = raw_prompt.strip()

        # Handle model selection
        if prompt.startswith("/"):
            parts = prompt.split(" ", 1)
            if len(parts) == 2:
                requested_model = parts[0][1:].strip()
                prompt = parts[1].strip()
                if requested_model in ALLOWED_MODELS:
                    model = requested_model
                else:
                    return jsonify({
                        "error": f"Model '{requested_model}' not available. Available: {ALLOWED_MODELS}"
                    }), 400
            else:
                return jsonify({"error": "Invalid format. Use /model your prompt"}), 400

        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400

        # Check cache first
        cache_key = f"{model}:{prompt}"
        if cache_key in cache:
            logger.info("Returning cached response")
            response_text = cache[cache_key]
        else:
            # Call Ollama with cached function
            response_text = await asyncio.to_thread(cached_ollama_chat, model, prompt)
            response_text = apply_filters(response_text)
            cache[cache_key] = response_text
            logger.info("Generated new response and cached it")

        return jsonify({"reply": response_text, "model": model})

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=6000, host=HOST)