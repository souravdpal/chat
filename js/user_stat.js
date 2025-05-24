const socket = io();

// Send user info on connect
socket.on("connect", () => {
  console.log("✅ Connected to server with ID:", socket.id);

  const user1 = localStorage.getItem("user");
  if (user1) {
    console.log("📤 Emitting user on connect:", user1);
    socket.emit("chat message2", { user: user1 });
  } else {
    console.warn("⚠️ No user found in localStorage");
  }
});

// Optional: send username manually via button
function sendMessage(user) {
  if (user) {
    console.log("📤 Emitting manual message:", user);
    socket.emit("chat message2", { user });
  } else {
    console.warn("⚠️ No user provided");
  }
}

// Optional: Button event listener (manual trigger)
document.addEventListener("DOMContentLoaded", () => {
  const sendBtn = document.getElementById("sendBtn");
  const userInput = document.getElementById("userInput");

  if (sendBtn && userInput) {
    sendBtn.addEventListener("click", () => {
      const value = userInput.value.trim();
      sendMessage(value);
    });
  } else {
    console.warn("⚠️ Button or input not found in DOM");
  }
});

// On disconnect
socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
});
