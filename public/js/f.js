// Get username from localStorage
const user_name = localStorage.getItem("user");

// DOM Elements
const frInput = document.getElementById("add");
const addBtn = document.getElementById("add-btn");
const searchInput = document.getElementById("search");
const listContainer = document.getElementById("list");

// State
let friends = [];

// Helper: get initials for avatar
function getInitials(name) {
  return name.slice(0, 2).toUpperCase();
}

// Render friends list
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
    friendDiv.dataset.name = friend;

    friendDiv.innerHTML = `
      <div class="avatar">${getInitials(friend)}</div>
      <span>${friend}</span>
      <div class="status-dot status-offline"></div>
    `;

    friendDiv.addEventListener("click", () => {
      checkAndShowOptions(friend);
    });

    listContainer.appendChild(friendDiv);
  });

  updateFriendStatuses();
}

// Fetch friend list from server
function fetchFriends() {
  fetch("/get_fr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: user_name }),
  })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data.fr)) {
        friends = data.fr;
        renderFriends(searchInput.value);
      } else {
        console.error("Invalid response:", data);
      }
    })
    .catch(err => {
      console.error("Error fetching friends:", err);
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

  fetch("/get/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from: user_name, to: fr_name }),
  })
    .then(res => res.json())
    .then(data => {
      alert(data.msg || "Friend request sent!");
      frInput.value = "";
    })
    .catch(() => alert("Failed to send friend request."));
});

// Search input handler
searchInput.addEventListener("input", () => {
  renderFriends(searchInput.value);
});

// Fetch user online status from server
async function fetchUserStatus(username) {
  try {
    const response = await fetch(`/st?user=${encodeURIComponent(username)}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.st === true || data.st === "online";
  } catch {
    return false;
  }
}

// Update status dots
async function updateFriendStatuses() {
  const friendDivs = listContainer.querySelectorAll(".friend");

  for (let i = 0; i < friends.length; i++) {
    const friend = friends[i];
    const friendDiv = friendDivs[i];
    const statusDot = friendDiv.querySelector(".status-dot");

    const isOnline = await fetchUserStatus(friend);

    if (isOnline) {
      statusDot.classList.add("status-online");
      statusDot.classList.remove("status-offline");
    } else {
      statusDot.classList.add("status-offline");
      statusDot.classList.remove("status-online");
    }
  }
}

// Popup for Call or Text options
const optionsModal = document.getElementById("options-modal");
const friendNameEl = document.getElementById("friend-name");
const callBtn = document.getElementById("call-btn");
const textBtn = document.getElementById("text-btn");
const closeBtn = document.getElementById("close-btn"); // cross button

// Show popup if online else alert
async function checkAndShowOptions(friend) {
  const isOnline = await fetchUserStatus(friend);

  if (isOnline) {
    friendNameEl.textContent = friend;
    optionsModal.style.display = "block";

    callBtn.onclick = () => {
      alert(`Calling ${friend}...`);
      optionsModal.style.display = "none";
      //here a fetch function send  chat req from to 
      window.location.href = 'call.html';
    
    };

    textBtn.onclick = () => {
      alert(`Texting ${friend}...`);
      optionsModal.style.display = "none";
      //here a fetch function send  chat req from to 
      window.location.href = 'chat.html';
    };
  } else {
    alert(`${friend} is offline.`);
  }
}

// Close popup on cross click
closeBtn.onclick = () => {
  optionsModal.style.display = "none";
};

// Close popup when clicking outside
window.onclick = (event) => {
  if (event.target === optionsModal) {
    optionsModal.style.display = "none";
  }
};

// Initial fetch and periodic refresh
fetchFriends();
setInterval(updateFriendStatuses, 5000);
