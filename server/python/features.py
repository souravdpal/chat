import wikipedia
from wikipedia.exceptions import DisambiguationError, PageError
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/wiki', methods=['POST'])
def chat():
    data = request.get_json()
    query = data.get('prompt', '').strip()
    print("Raw query:", query)

    if not query:
        return jsonify({"error": "No prompt provided"}), 400

    # Default language
    lang = 'en'

    # Check for "/<lang>" at start
    if query.startswith('/'):
        parts = query.split(maxsplit=1)
        if len(parts) == 2 and len(parts[0]) == 3:
            lang_code = parts[0][1:]  # remove the '/'
            wikipedia.set_lang(lang_code)
            query = parts[1]  # update the prompt without the language code
            print(f"Language set to: {lang_code}")
        else:
            wikipedia.set_lang(lang)  # fallback to English
    else:
        wikipedia.set_lang(lang)  # default English

    try:
        # Try getting summary directly
        summary = wikipedia.summary(query, sentences=3)
        return jsonify({"reply": summary})

    except DisambiguationError as e:
        # Handle ambiguity: choose the first option
        best_option = e.options[0]
        summary = wikipedia.summary(best_option, sentences=3)
        return jsonify({
            "reply": summary,
            "note": f"Query was ambiguous. Using: {best_option}"
        })

    except PageError:
        return jsonify({"error": "Page not found."}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=4000, host='0.0.0.0')
