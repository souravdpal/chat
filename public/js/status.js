// Connect to '/status' namespace explicitly
const statusSocket = io("/status");

// Make global for other scripts
window.statusSocket = statusSocket;

const user_name = localStorage.getItem("user");

if (!user_name) {
  alert("Please log in to continue.");
  //window.location.href = "/login";
} else {
  statusSocket.on("connect", () => {
    console.log("✅ Status socket connected:", statusSocket.id);
    statusSocket.emit("auth", { user: user_name });
  });

  statusSocket.on("status update", (data) => {
    console.log("Status update:", data);
  });

  statusSocket.on("reconnect", (attempt) => {
    console.log(`✅ Status socket reconnected after ${attempt} attempts`);
    statusSocket.emit("auth", { user: user_name });
  });

  statusSocket.on("error", (data) => {
    console.error("Status socket error:", data.message);
  });

  window.addEventListener("beforeunload", () => {
    statusSocket.disconnect();
  });
}
