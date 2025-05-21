// Get username from localStorage
const user_name = localStorage.getItem("user");

// DOM Elements
const frInput = document.getElementById("add");
const addBtn = document.getElementById("add-btn");
const searchInput = document.getElementById("search");
const listContainer = document.getElementById("list");

// State
let friends = [];

// Helper to create avatar initials
function getInitials(name) {
  return name.slice(0, 2).toUpperCase();
}

// Render friend list to the DOM
function renderFriends(filter = "") {
  listContainer.innerHTML = "";

  const filtered = friends.filter(friend =>
    friend.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    listContainer.innerHTML = `<p class="empty-message">No friends found.</p>`;
    return;
  }

  filtered.forEach(friend => {
    const friendDiv = document.createElement("div");
    friendDiv.className = "friend";

    friendDiv.innerHTML = `
      <div class="avatar">${getInitials(friend)}</div>
      <span>${friend}</span>
      <div class="status-dot status-online"></div>
    `;

    listContainer.appendChild(friendDiv);
  });
}

// Add friend handler
addBtn.addEventListener("click", () => {
  const fr_name = frInput.value.trim();

  if (fr_name === "") {
    alert("Oops! You forgot to fill in the friend's name.");
    return;
  }
  if (fr_name === user_name) {
    alert("You can't add yourself as a friend!");
    return;
  }

  // Send friend request
  alert(user)
  fetch("/fr_send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: user_name, to: fr_name }),
  })
    .then(res => res.json())
    .then(data => {
      alert(data.msg || "Friend request sent!");
      frInput.value = "";
    })
    .catch(err => {
      console.error("Error sending friend request:", err);
      alert("Failed to send friend request.");
    });
});

// Fetch friends from server
function fetchFriends() {
  fetch("/get_fr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user  : user_name }),
  })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data.fr)) {
        friends = data.fr;
        renderFriends(searchInput.value);
      } else {
        console.error("Invalid response format:", data);
      }
    })
    .catch(err => {
      console.error("Error fetching friends:", err);
    });
}

// Search event
searchInput.addEventListener("input", () => {
  renderFriends(searchInput.value);
});

// Initial fetch and refresh every 100 seconds
fetchFriends();
setInterval(fetchFriends, 100000);
