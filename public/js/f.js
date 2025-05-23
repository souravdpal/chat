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

  const filtered = friends.filter((friend) =>
    friend.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    listContainer.innerHTML = `<p class="empty-message">No friends found.</p>`;
    return;
  }

  filtered.forEach((friend) => {
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
  if (friends.includes(fr_name)) {
    alert("This friend is already in your list.");
    return;
  }

  // Send friend request
  fetch("/get/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: user_name, to: fr_name }),
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.msg || "Friend request sent!");
      frInput.value = "";
    })
    .catch((err) => {
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
    body: JSON.stringify({ user: user_name }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data.fr)) {
        friends = data.fr;
        renderFriends(searchInput.value);
      } else {
        console.error("Invalid response format:", data);
      }
    })
    .catch((err) => {
      console.error("Error fetching friends:", err);
    });
}

// Search input handler
searchInput.addEventListener("input", () => {
  renderFriends(searchInput.value);
});

// Initial fetch and periodic refresh
fetchFriends();
setInterval(fetchFriends, 500);

let ans_send_ans = () => {
  fetch("/ans/res")
    .then((response1) => response1.json())
    .then((data1) => {
      if (data1.length > 0 && user_name == data1[0].user_from) {
        console.log("Received data:", data1[0]);
        alert(data1[0].msg);
      }
    });
};

setInterval(ans_send_ans, 500);
// Function to fetch status for a single user and return the status string
async function fetchUserStatus(username) {
  try {
    const response = await fetch(`/st?user=${encodeURIComponent(username)}`);
    if (!response.ok) {
      console.warn(`Status fetch failed for ${username}`, response.status);
      return null;
    }
    const data = await response.json();
    return data.st; // e.g. "online" or "offline"
  } catch (error) {
    console.error("Error fetching status for", username, error);
    return null;
  }
}

// Update friend status dots based on fetched status
async function updateFriendStatuses() {
  // Fetch status for each friend in parallel
  const statusPromises = friends.map(fetchUserStatus);
  const statuses = await Promise.all(statusPromises);

  // Now update DOM elements
  const friendDivs = listContainer.querySelectorAll(".friend");
  friendDivs.forEach((friendDiv, i) => {
    const statusDot = friendDiv.querySelector(".status-dot");
    const status = statuses[i];

    if (status === true) {
      statusDot.classList.add("status-online");
      statusDot.classList.remove("status-offline");
    } else {
      statusDot.classList.add("status-offline");
      statusDot.classList.remove("status-online");
    }
  });
}

// Modify renderFriends to add default offline class first
function renderFriends(filter = "") {
  listContainer.innerHTML = "";

  const filtered = friends.filter((friend) =>
    friend.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    listContainer.innerHTML = `<p class="empty-message">No friends found.</p>`;
    return;
  }

  filtered.forEach((friend) => {
    const friendDiv = document.createElement("div");
    friendDiv.className = "friend";

    friendDiv.innerHTML = `
      <div class="avatar">${getInitials(friend)}</div>
      <span>${friend}</span>
      <div class="status-dot status-offline"></div> <!-- default offline -->
    `;

    listContainer.appendChild(friendDiv);
  });

  // After rendering, update statuses
  updateFriendStatuses();
}

// Call updateFriendStatuses periodically to refresh status dots
setInterval(updateFriendStatuses, 5000); // every 10 seconds
