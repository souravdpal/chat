# Local Chat Web App with User Authentication

This is a Node.js-based web application for user registration, login, and chatting with a locally hosted AI model (e.g., DeepSeek). It supports secure user handling via bcrypt hashing and communicates with a Python server for AI responses.

---

## 🌐 Features

* ✅ User signup and login with bcrypt-hashed passwords.
<<<<<<< HEAD
* ✅ Data stored locally in a JSON file (`user.json`).
=======
* ✅ Data stored locally in a JSON file (`mongo server`).
>>>>>>> 5fe94b9 (adding we socket.ignored)
* ✅ Public frontend served with HTML (`signup.html`).
* ✅ Integration with a local Python server to send and receive AI-generated replies.
* ✅ Error handling and status messaging.

---

## 📁 Folder Structure

```
chat/
├── public/           # Contains HTML files (e.g., signup.html)
├── data/             # Contains user data (user.json)
├── server.js         # Main Node.js server file (your code)
```

---

## 🚀 How to Run

### 1. Clone the Repo

```bash
git clone https://github.com/souravdpal/chat.git
cd chat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Local Python AI Server

Ensure you have a Python server running on `http://localhost:5000/chat` that accepts POST requests with a `prompt` and `model` key and responds with a `reply`.

> Example expected request:
>
> ```json
> { "prompt": "Hello", "model": "deepseek-r1:1.5b" }
> ```

### 4. Run the Node Server

```bash
node server.js
```

The app will be available at:
`http://localhost:3000`

---

## 🔐 API Endpoints

### `POST /user`

* Registers a user.
* Request:

  ```json
  {
    "name": "Sourav",
    "user": "sourav123",
    "key": "your_password"
  }
  ```

### `POST /cred`

* Logs in a user.
* Request:

  ```json
  {
    "user": "sourav123",
    "key": "your_password"
  }
  ```

### `GET /get_user`

* Fetches all registered users (for testing/debugging).

### `POST /msg`

* Sends a message to the AI and receives a reply.
* Request:

  ```json
  {
    "msg": "Hello AI"
  }
  ```
* Response:

  ```json
  {
    "reply": "AI: Hello, human!"
  }
  ```

---

## 🔧 Technologies Used

* Node.js
* Express.js
* bcrypt (password hashing)
* fs / path
* Axios (API call to Python server)
* CORS

---

## 🧠 Local AI Server (Required)

This app expects a local AI server running at:

```
http://localhost:5000/chat
```

Make sure your Python server (e.g., using Flask or FastAPI) is running and able to receive the prompt and return AI replies.

---

## 📄 License

MIT License – free to use and modify.

---

---

## 👤 Author

**Sourav**
Learning MERN stack with a focus on React and Node.js.
Built this project to understand authentication, backend APIs, and password hashing.
