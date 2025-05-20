from flask import Flask, request, jsonify
import ollama

app = Flask(__name__)

# List of allowed models that are downloaded
allowed_models = ['gemma3:4b', 'deepseek-r1:1.5b']
default_model = 'gemma3:4b'  # Set gemma as default

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    raw_prompt = data.get("prompt", "")
    print("Raw prompt:", raw_prompt)

    model = default_model
    prompt = raw_prompt.strip()

    if prompt.startswith("/"):
        parts = prompt.split(" ", 1)
        if len(parts) == 2:
            requested_model = parts[0][1:].strip()
            prompt = parts[1].strip()
            if requested_model in allowed_models:
                model = requested_model
            else:
                return jsonify({
                    "error": f"Model '{requested_model}' not available. Available: {allowed_models}"
                }), 400
        else:
            return jsonify({"error": "Invalid format. Use /model your prompt"}), 400

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    try:
        response = ollama.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        return jsonify({"reply": response['message']['content'], "model": model})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=6000, host='0.0.0.0')
