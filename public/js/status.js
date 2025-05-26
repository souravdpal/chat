// Initialize Socket.IO
const socket = io();

// Get username from localStorage
const user_name1 = localStorage.getItem("user");

//r is not logged in, redirect to login (optional, depending on page)
if (!user_name1) {
  console.warn("⚠️ No user found in localStorage");
  window.location.href = "login.html"; // Redirect to login page
  // Optionally, you can show an alert  
  // Uncomment the following line if you want to redirect on all pages
  // window.location.href = "login.html";
} else {
  // Send auth on connect
  socket.on("connect", () => {
    console.log("✅ Connected to server with ID:", socket.id);
    socket.emit("auth", { user: user_name1 });
    socket.emit("chat message2", { user: user_name1 });
  });

  // Handle reconnect
  socket.on("reconnect", (attempt) => {
    console.log(`✅ Reconnected to server after ${attempt} attempts`);
    socket.emit("auth", { user: user_name1 });
    socket.emit("chat message2", { user: user_name1 });
  });

  // Handle server errors
  socket.on("error", (data) => {
    console.error("Server error:", data.message);
  });

  // Ensure status is updated to false when the user leaves the site
  window.addEventListener("beforeunload", () => {
    socket.disconnect(); // Trigger disconnect event on the server
  });
}