// Initialize Socket.IO
const socket = io();

// Get user and recipient from localStorage or URL
const user_name = localStorage.getItem("user");
const urlParams = new URLSearchParams(window.location.search);
const recipient = urlParams.get("to") || localStorage.getItem("chat_with");

// Update header with recipient's name and avatar
const recipientNameEl = document.getElementById("recipient-name");
const recipientAvatarEl = document.getElementById("recipient-avatar");
if (recipient) {
  recipientNameEl.textContent = recipient;
  recipientAvatarEl.textContent = recipient.slice(0, 2).toUpperCase(); // Add initials to avatar
  localStorage.setItem("chat_with", recipient); // Store for persistence
} else {
  recipientNameEl.textContent = "Unknown";
  recipientAvatarEl.textContent = "??";
  alert("No recipient specified. Please select a friend to chat with.");
  window.location.href = "home.html"; // Redirect to home
}

// Validate user login
if (!user_name) {
  alert("Please log in to continue.");
  window.location.href = "login.html"; // Redirect to login page
}

// Theme handling
const themes = ["light", "dark"];
let currentThemeIndex = 0;
const savedTheme = localStorage.getItem("theme");
if (savedTheme && themes.includes(savedTheme)) {
  currentThemeIndex = themes.indexOf(savedTheme);
  document.documentElement.setAttribute("data-theme", savedTheme);
} else {
  document.documentElement.setAttribute("data-theme", themes[currentThemeIndex]);
}

function toggleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  const newTheme = themes[currentThemeIndex];
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
}

// Chat functionality
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

function addMessage(text, isUser, from) {
  const message = document.createElement("div");
  message.classList.add("message", isUser ? "user" : "other");
  message.textContent = text;
  message.setAttribute(
    "data-time",
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send auth on connect and reconnect
socket.on("connect", () => {
  console.log("✅ Connected to server with ID:", socket.id);
  if (user_name) {
    socket.emit("auth", { user: user_name });
    socket.emit("chat message2", { user: user_name });
  } else {
    console.warn("⚠️ No user found in localStorage");
    alert("Please log in to continue.");
    window.location.href = "login.html";
  }
});

// Handle reconnect attempts
socket.on("reconnect", (attempt) => {
  console.log(`✅ Reconnected to server after ${attempt} attempts`);
  if (user_name) {
    socket.emit("auth", { user: user_name });
    socket.emit("chat message2", { user: user_name });
  }
});

// Handle incoming private messages
socket.on("private message", ({ from, message, isSender }) => {
  if (from === recipient || isSender) {
    addMessage(message, isSender, from);
  }
});

// Handle server errors
socket.on("error", (data) => {
  console.error("Server error:", data.message);
  alert(data.message);
});

// Handle incoming chat requests
socket.on("incoming-request", ({ from, mode }) => {
  if (mode === "text") {
    alert(`${from} wants to chat with you!`);
    localStorage.setItem("chat_with", from);
    recipientNameEl.textContent = from;
    recipientAvatarEl.textContent = from.slice(0, 2).toUpperCase();
    // No redirect needed if already on text.html
  }
});

// Send message
function sendPrivateMessage() {
  const text = messageInput.value.trim();
  if (text && recipient && user_name) {
    socket.emit("private message", {
      from: user_name,
      to: recipient,
      message: text,
    });
    messageInput.value = "";
  } else if (!text) {
    alert("Please type a message.");
  } else if (!recipient) {
    alert("No recipient specified. Redirecting to home.");
    window.location.href = "home.html";
  } else {
    alert("Please log in to send messages.");
    window.location.href = "login.html";
  }
}

sendBtn.addEventListener("click", sendPrivateMessage);

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendPrivateMessage();
  }
}); 