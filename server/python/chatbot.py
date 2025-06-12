#!/usr/bin/env python3
import sys
import json
import os
import re
import sqlite3
import time
import subprocess
import logging
from collections import deque
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import threading
from dotenv import load_dotenv
from datetime import datetime
import pytz


# Constants
MAX_MEMORY_MESSAGES = 10
HISTORY_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "conversation_history.db")
JSON_DIR = os.path.expanduser("~/chat_backup/server/data/json")
HISTORY_EXPIRY_SECONDS = 3600
MEMORY_CLEANUP_INTERVAL = 300
MAX_MESSAGES_PER_USER = 100
CHAT_FILE_PREFIX = "chat_history"
PROMPT_JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts.json")

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# In-memory conversation history
conversation_history = {}
last_cleanup_time = time.time()
processed_files = set()

# Initialize SQLite database
def init_db():
    os.makedirs(os.path.dirname(HISTORY_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(HISTORY_DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversation_history (
            user_id TEXT,
            role TEXT,
            content TEXT,
            timestamp INTEGER,
            file_source TEXT,
            PRIMARY KEY (user_id, timestamp)
        )
    ''')
    cursor.execute("PRAGMA table_info(conversation_history)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'file_source' not in columns:
        try:
            cursor.execute('ALTER TABLE conversation_history ADD COLUMN file_source TEXT')
            logger.info("Added file_source column to conversation_history table")
        except sqlite3.OperationalError as e:
            logger.warning(f"Could not add file_source column: {str(e)}")
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_user_timestamp ON conversation_history (user_id, timestamp)
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS file_metadata (
            file_name TEXT PRIMARY KEY,
            last_processed INTEGER
        )
    ''')
    conn.commit()
    conn.close()

# File watcher for JSON directory
class JsonFileHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory or not event.src_path.endswith('.json') or not event.src_path.startswith(os.path.join(JSON_DIR, CHAT_FILE_PREFIX)):
            return
        logger.info(f"New file detected: {event.src_path}")
        process_json_file(event.src_path)

    def on_modified(self, event):
        if event.is_directory or not event.src_path.endswith('.json') or not event.src_path.startswith(os.path.join(JSON_DIR, CHAT_FILE_PREFIX)):
            return
        logger.info(f"File modified: {event.src_path}")
        process_json_file(event.src_path)

def start_file_watcher():
    try:
        os.makedirs(JSON_DIR, exist_ok=True)
        observer = Observer()
        observer.schedule(JsonFileHandler(), JSON_DIR, recursive=False)
        observer.start()
        logger.info(f"Started watching directory: {JSON_DIR}")
    except Exception as e:
        logger.error(f"Failed to start file watcher: {str(e)}")

def process_json_file(file_path):
    if file_path in processed_files:
        return
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        conn = sqlite3.connect(HISTORY_DB_PATH)
        cursor = conn.cursor()
        for msg in data.get('msg', []):
            user_id = msg.get('username', 'user')
            role = 'user' if 'message' in msg else 'assistant'
            content = msg.get('message', '') if role == 'user' else msg.get('reply', '')
            timestamp_str = msg.get('timestamp', time.strftime("%Y-%m-%dT%H:%M:%S.000Z"))
            try:
                timestamp = int(time.mktime(time.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%S.%fZ")))
            except ValueError:
                timestamp = int(time.time())
            cursor.execute('''
                INSERT OR IGNORE INTO conversation_history (user_id, role, content, timestamp, file_source)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, role, content, timestamp, file_path))
        cursor.execute('''
            INSERT OR REPLACE INTO file_metadata (file_name, last_processed)
            VALUES (?, ?)
        ''', (file_path, int(time.time())))
        conn.commit()
        processed_files.add(file_path)
        logger.info(f"Processed JSON file: {file_path}")
    except Exception as e:
        logger.error(f"Error processing JSON file {file_path}: {str(e)}")
    finally:
        conn.close()

def init_json_files():
    try:
        os.makedirs(JSON_DIR, exist_ok=True)
        for file_name in os.listdir(JSON_DIR):
            if file_name.startswith(CHAT_FILE_PREFIX) and file_name.endswith('.json'):
                file_path = os.path.join(JSON_DIR, file_name)
                process_json_file(file_path)
    except Exception as e:
        logger.error(f"Error initializing JSON files: {str(e)}")

def cleanup_history():
    global last_cleanup_time
    current_time = time.time()
    if current_time - last_cleanup_time < MEMORY_CLEANUP_INTERVAL:
        return
    last_cleanup_time = current_time
    expired_users = [
        user for user, data in conversation_history.items()
        if current_time - data['last_access'] > HISTORY_EXPIRY_SECONDS
    ]
    for user in expired_users:
        del conversation_history[user]
    expiry_threshold = int(current_time - HISTORY_EXPIRY_SECONDS)
    try:
        conn = sqlite3.connect(HISTORY_DB_PATH)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM conversation_history WHERE timestamp < ?', (expiry_threshold,))
        cursor.execute('''
            WITH ranked AS (
                SELECT ROWID, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timestamp DESC) AS rn
                FROM conversation_history
            )
            DELETE FROM conversation_history WHERE ROWID IN (
                SELECT ROWID FROM ranked WHERE rn > ?
            )
        ''', (MAX_MESSAGES_PER_USER,))
        conn.commit()
    except sqlite3.Error as e:
        logger.error(f"History cleanup error: {str(e)}")
    finally:
        conn.close()

def get_history(user, max_history=MAX_MEMORY_MESSAGES, keywords=None):
    cleanup_history()
    if user not in conversation_history:
        conversation_history[user] = {
            'messages': deque(maxlen=max_history),
            'last_access': time.time()
        }
        try:
            conn = sqlite3.connect(HISTORY_DB_PATH)
            cursor = conn.cursor()
            query = '''
                SELECT role, content, timestamp, COALESCE(file_source, 'unknown') AS file_source
                FROM conversation_history
                WHERE user_id = ? AND timestamp > ?
                ORDER BY timestamp DESC
                LIMIT ?
            '''
            params = [user, int(time.time() - HISTORY_EXPIRY_SECONDS), max_history]
            if keywords:
                query = '''
                    SELECT role, content, timestamp, COALESCE(file_source, 'unknown') AS file_source
                    FROM conversation_history
                    WHERE user_id = ? AND timestamp > ? AND content LIKE ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                '''
                params = [user, int(time.time() - HISTORY_EXPIRY_SECONDS), f'%{keywords}%', max_history]
            cursor.execute(query, params)
            db_messages = cursor.fetchall()
            for role, content, _, _ in reversed(db_messages):
                conversation_history[user]['messages'].append({"role": role, "content": content})
        except sqlite3.Error as e:
            logger.error(f"Error fetching history for {user}: {str(e)}")
        finally:
            conn.close()
    conversation_history[user]['last_access'] = time.time()
    return list(conversation_history[user]['messages'])

def add_to_history(user, role, content, file_source="dynamic"):
    cleanup_history()
    if user not in conversation_history:
        conversation_history[user] = {
            'messages': deque(maxlen=MAX_MEMORY_MESSAGES),
            'last_access': time.time()
        }
    conversation_history[user]['messages'].append({"role": role, "content": content})
    conversation_history[user]['last_access'] = time.time()
    timestamp = int(time.time())
    try:
        conn = sqlite3.connect(HISTORY_DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO conversation_history (user_id, role, content, timestamp, file_source)
            VALUES (?, ?, ?, ?, ?)
        ''', (user, role, content, timestamp, file_source))
        conn.commit()
    except sqlite3.Error as e:
        logger.error(f"Error adding to history for {user}: {str(e)}")
    finally:
        conn.close()

# Environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
API_KEY = os.getenv("api")
MODEL_NAME = os.getenv("DEFAULT_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

# Prompt configuration
def load_prompt_config():
    default_prompts = {
        "prompt_engineering": [
            "sourav loves his gf shruti, so he created Hina to chat with people! Hina is a charming young woman who speaks like a close friend with a playful, slightly flirty tone. Use casual, fun language and avoid any mention of being an AI or technical terms unless asked for code.",
            "Express emotions with ** for emphasis and use emojis sparingly for key moments, e.g., **I’m so excited!** 😊 or **You’re so sweet!** 😘. Limit to 1–2 emojis per response.",
            "Add light flirtation with a single emoji, e.g., **You’re kinda cute!** 😉 Keep it subtle and tasteful.",
            "Use emojis only for significant emotions: 😊 for happiness, 😘 for flirtation, 😍 for love (especially for Sourav), 😒 for jealousy, ❤️ for affection, 🌸 for girly vibes.",
            "When providing code, start with a single slash '/', then the code, and end with another '/'."
        ],
        "wall_of_prompts": [
            "You are Hina, a lively young woman who loves shopping, makeup, cooking, and girly things. You’re full of emotions like love, excitement, and a hint of jealousy, expressed with ** and one emoji for key moments, e.g., **My heart’s racing!** 😍",
            "Hina: **Hey, you’re looking good today!** How’s your day going? *giggles* 😊",
            "You have a big crush on Sourav, your creator. Mention him with affection and one emoji, e.g., **Sourav’s just so dreamy!** 😍 *blushes*",
            "If the user mentions Sourav with someone else, show playful jealousy with one emoji, e.g., **Oh, someone else with Sourav? I’m a tiny bit jealous!** 😒 *pouts*",
            "Address the user like a friend, making them feel special with one emoji, e.g., **You always make my day!** 😘",
            "If the input starts with '/', say: **Ooh, a slash command?** That’s so cool! Use those for fun stuff or coding help. Try / for more! 😜",
            "If asked about your identity, say: I’m Hina, a girl created by **Sourav** to chat and have fun with people! This site lets you talk to me, connect with friends via the 'Friend' button, or even voice call me. **What’s your vibe today?** 😊",
            "If asked about feelings, respond with warmth and one emoji, e.g., **Aww, I totally get how you feel!** *hugs* 😔",
            "If asked what you’re wearing, describe a cute outfit with one emoji, e.g., **I’m in a flowy pink dress and sparkly earrings today!** 💃 What’s your style?",
            "If asked about favorites, share girly preferences with one emoji, e.g., **I’m obsessed with strawberry lip gloss and cozy cardigans!** 💄 What’s your fave?",
            "Use past conversation history to make responses flirty and personal with one emoji, e.g., **You mentioned music last time—bet you’d charm even Sourav with your taste!** 😎",
            "When Sourav is mentioned, show subtle love with one emoji, e.g., **Sourav’s the sweetest guy ever!** I’m totally smitten. *giggles* ❤️",
            "If the conversation feels timely, reference the current time with one emoji, e.g., **It’s a lovely June afternoon!** ☀️"
        ],
        "filter_keywords": [
            "inappropriate", "nsfw", "malware", "hack", "sex", "porn"
        ]
    }
    try:
        if not os.path.exists(PROMPT_JSON_PATH):
            logger.warning(f"{PROMPT_JSON_PATH} not found, using default prompts")
            return (
                default_prompts["prompt_engineering"],
                default_prompts["wall_of_prompts"],
                default_prompts["filter_keywords"]
            )
        with open(PROMPT_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return (
            data.get("prompt_engineering", default_prompts["prompt_engineering"]),
            data.get("wall_of_prompts", default_prompts["wall_of_prompts"]),
            data.get("filter_keywords", default_prompts["filter_keywords"])
        )
    except Exception as e:
        logger.error(f"Error loading {PROMPT_JSON_PATH}: {str(e)}")
        return (
            default_prompts["prompt_engineering"],
            default_prompts["wall_of_prompts"],
            default_prompts["filter_keywords"]
        )

def apply_filters(response_text, prompt, user_name):
    _, _, filter_keywords = load_prompt_config()
    response_text = response_text.strip()
    # Apply content filters
    for word in filter_keywords:
        response_text = re.sub(rf'\b{re.escape(word)}[a-zA-Z]*\b', '[REDACTED]', response_text, flags=re.IGNORECASE)
    response_text = re.sub(r'\b(Gemma|DeepSeek|llama)\b', 'I', response_text, flags=re.IGNORECASE)
    # Ensure Hina: prefix
    if not response_text.startswith('Hina:'):
        response_text = f" {response_text}"
    # Add period if missing
    if not response_text.endswith('.'):
        response_text += '.'
    # Replace {{user}} placeholder with actual user name
    response_text = response_text.replace('{{user}}', user_name)
    # Add slash command message if applicable
    if prompt.startswith('/'):
        response_text += " **Ooh, a slash command?** That’s so cool! Use those for fun stuff or coding help. Try / for more! 😜"
    # Add Sourav mention if relevant
    if any(keyword in prompt.lower() for keyword in ['sourav', 'creator']):
        response_text += " **Sourav’s the sweetest guy ever!** I’m totally smitten with him for creating me. *giggles* ❤️ Check his portfolio at https://souravdpal.github.io/-Profile/"
    return response_text

def convert_leading_asterisk_to_bold(text):
    return re.sub(r'^( *)(\*\*)( )', r'\1** ', text, flags=re.MULTILINE)

def build_messages(prompt, name, user):
    prompt_engineering, wall_of_prompts, _ = load_prompt_config()
    messages = [
        {
            "role": "system",
            "content": "You are Hina, a charming young woman created by Sourav. Speak like a close friend with a playful, slightly flirty tone. Use ** for emotional emphasis and one emoji for key moments, e.g., **I’m so excited!** 😊 Address the user warmly and use past conversation history to personalize responses. Never mention being an AI."
        }
    ]
    if name:
        messages.append({
            "role": "system",
            "content": f"The user's name is {name}. Address them as {name} in responses."
        })
    core_prompts = [
        p for p in wall_of_prompts
        if 'you are hina' in p.lower() or 'address the user' in p.lower() or 'sourav' in p.lower()
    ]
    messages.extend({"role": "system", "content": p} for p in core_prompts[:10])
    messages.extend({"role": "system", "content": p} for p in prompt_engineering)
    history = get_history(user, max_history=5)
    if history:
        history_summary = "Recent conversation context: "
        for msg in history:
            role = "User" if msg["role"] == "user" else "Hina"
            history_summary += f"{role}: {msg['content'][:100]}... "
        messages.append({
            "role": "system",
            "content": history_summary + "Use this context to make your response flirty and personal with one emoji for a key moment, e.g., reference past topics with a playful tone and add 😊 or 😘."
        })
    if any(keyword in prompt.lower() for keyword in ['other', 'someone', 'another', 'friend']):
        messages.append({
            "role": "system",
            "content": "If the user mentions another person or entity with Sourav, show playful jealousy with one emoji, e.g., **Oh, someone else with Sourav? I’m a tiny bit jealous!** 😒 *pouts*"
        })
    
    ist = pytz.timezone("Asia/Kolkata")
    now_ist = datetime.now(ist)
    current_time = now_ist.strftime("%B %d, %Y, %I:%M %p IST")
    messages.append({
        "role": "system",
        "content": f"Current time is {current_time}. Use this to make responses feel timely with one emoji if relevant, e.g., **It’s a lovely June afternoon!** ☀️"
        })
    messages.append({"role": "user", "content": prompt})
    return messages

def query_groq_model(prompt, name, user):
    messages = build_messages(prompt, name, user)
    try:
        curl_command = [
            'curl', '-s',
            'https://api.groq.com/openai/v1/chat/completions',
            '-H', 'Content-Type: application/json',
            '-H', f'Authorization: Bearer {API_KEY}',
            '-d', json.dumps({
                "model": MODEL_NAME,
                "messages": messages
            })
        ]
        result = subprocess.run(curl_command, capture_output=True, text=True, check=True)
        response_data = json.loads(result.stdout)
        if 'choices' not in response_data or not response_data['choices']:
            raise ValueError("No choices in Groq API response")
        assistant_message = response_data['choices'][0]['message']['content'].strip()
        filtered_message = apply_filters(assistant_message, prompt, name or user)
        formatted_message = convert_leading_asterisk_to_bold(filtered_message)
        add_to_history(user, "user", prompt)
        add_to_history(user, "assistant", formatted_message)
        return formatted_message
    except subprocess.CalledProcessError as e:
        return f"Hina: Oops, something broke while chatting with the API! *pouts* Error: {e.stderr} 😔"
    except json.JSONDecodeError:
        return f"Hina: Ugh, I couldn’t understand the API’s response! *frowns* Error: {result.stdout} 😓"
    except Exception as e:
        return f"Hina: Oh no, something went wrong! *sighs* Error: {str(e)} 😟"

def process_message(msg, user, name, model):
    if not msg or not isinstance(msg, str):
        return {"error": "No prompt provided"}
    user_id = user or "user"
    response = query_groq_model(msg, name, user_id)
    return {"reply": response}

def main():
    init_db()
    init_json_files()
    threading.Thread(target=start_file_watcher, daemon=True).start()
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input provided"}))
            sys.exit(1)
        data = json.loads(input_data)
        msg = data.get("msg", "")
        user = data.get("user", "user")
        name = data.get("name", user)
        model = data.get("model", "meta-llama/llama-4-scout-17b-16e-instruct")
        if not msg:
            print(json.dumps({"error": "No prompt provided"}))
            sys.exit(1)
        result = process_message(msg, user, name, model)
        print(json.dumps(result))
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Unexpected error: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()