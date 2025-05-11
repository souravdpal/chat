from flask import Flask, request, jsonify
import ollama

app = Flask(__name__)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    prompt = data.get("prompt", "")
    model = data.get("model", "deepseek-r1:1.5b ")
    print(prompt)

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    try:
        response = ollama.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        return jsonify({"reply": response['message']['content']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, host='0.0.0.0')
