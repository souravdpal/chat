#!/usr/bin/env python3
import sys
import json
import wikipedia

def search_wikipedia(query):
    try:
        wikipedia.set_lang("en")
        # Try exact match first
        summary = wikipedia.summary(query, sentences=2, auto_suggest=False)
        return {"reply": summary}
    except wikipedia.exceptions.DisambiguationError as e:
        # Handle disambiguation by checking for 'Narendra Modi'
        if "Narendra Modi" in e.options:
            try:
                summary = wikipedia.summary("Narendra Modi", sentences=2, auto_suggest=False)
                return {"reply": summary}
            except Exception as ex:
                return {"error": str(ex)}
        # If Narendra Modi isn't an option, return options
        return {"reply": f"Multiple options found: {', '.join(e.options)}. Please specify (e.g., 'Narendra Modi')."}
    except wikipedia.exceptions.PageError:
        # Try auto-suggest if exact match fails
        try:
            summary = wikipedia.summary(query, sentences=2, auto_suggest=True)
            return {"reply": summary}
        except Exception as ex:
            return {"error": "Page not found"}
    except Exception as e:
        return {"error": str(e)}

def main():
    try:
        input_data = json.load(sys.stdin)
        prompt = input_data.get("prompt", "")
        if not prompt:
            print(json.dumps({"error": "No prompt provided"}))
            return
        result = search_wikipedia(prompt)
        print(json.dumps(result))
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON input"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()