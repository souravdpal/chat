
// Initial empty friends array
let friends = [
  { id: 1, name: "Alice", online: true },
  { id: 2, name: "Bob", online: false },
  { id: 3, name: "Charlie", online: true },
];
let user_name = localStorage.getItem("name");
// DOM Elements
const addInput = document.getElementById("add");
const addBtn = document.getElementById("add-btn");
const searchInput = document.getElementById("search");
const listContainer = document.getElementById("list");

// Generate unique ID (simple incrementing)
let idCounter = 4; // Changed to 4 since we already have 3 friends

// Helper: Get initials from name (first letters)
function getInitials(name) {
  const words = name.trim().split(" ");
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  } else {
    return words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase();
  }
}

// Render friend list based on filter
function renderList(filter = "") {
  listContainer.innerHTML = "";

  // Filter friends by name includes filter (case insensitive)
  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.classList.add("empty-message");
    emptyMsg.textContent =
      friends.length === 0 ? "No friends yet. Add some!" : "No friends found.";
    listContainer.appendChild(emptyMsg);
    return;
  }

  filtered.forEach((friend) => {
    const friendDiv = document.createElement("div");
    friendDiv.className = "friend";

    // Avatar circle with initials
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = getInitials(friend.name);
    friendDiv.appendChild(avatar);

    // Friend name
    const nameSpan = document.createElement("span");
    nameSpan.className = "friend-name";
    nameSpan.textContent = friend.name;
    friendDiv.appendChild(nameSpan);

    // Status dot
    const statusDot = document.createElement("div");
    statusDot.className =
      "status-dot " + (friend.online ? "status-online" : "status-offline");
    friendDiv.appendChild(statusDot);

    // Optional: On click alert friend name (you can replace with actual action)
    friendDiv.addEventListener("click", () => {
      alert(`You clicked on ${friend.name}`);
    });

    listContainer.appendChild(friendDiv);
  });
}

// Add friend function
function addFriend() {
  const name = addInput.value.trim(); // Changed from name1 to name to match usage below
  if (!name) {
    alert("Please enter a friend's name.");
    return;
  }

  // Prevent duplicate names (case insensitive)
  if (friends.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
    alert("This friend already exists!");
    return;
  }

  if (name == user_name) {
    alert("you cant send yourself a request");
    return;
  }
  let data_send = {
    name: name,
    s: user_name,
  };
  fetch("/f", {
    // Fixed typo in '/freind' to '/friend'
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data_send),

    // Changed from name1 to name
  });

  let get_user_res = async () => {
    feth("/f_res", {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.msg === "ok") {
          alert(`${name} accept your request!`);
          const online = Math.random() < 0.5;
          let name = data.name;
          friends.push({
            id: idCounter++,
            name,
            online,
          });

          addInput.value = "";
          renderList(searchInput.value);
        } else if (data.msg === "denied") {
          alert(`${name}  denied to be a freind`);
          return;
        } else {
          alert("db error!");
          return;
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  // Event listeners
  addBtn.addEventListener("click", addFriend);
  addInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addFriend();
    }
  });

  searchInput.addEventListener("input", () => {
    renderList(searchInput.value);
  });

  // Initial render
  renderList();
}

fetch("/f", {
  method: "POST",
})
  .then((response) => response.json())
  .then((data) => {
    let from = data.from;
    if (data.to == name1) {
      let ask = prompt(`${from} send you freind req enter y/n`);
      console.log(ask);
      if (ask == "y" || "Y") {
        let ans1 = "ok";
        fetch("/f_res", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ans: ans1 }),
        });
      } else if (ask === "n" && "N") {
        let ans1 = "denied";
        fetch("/f_res", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ans: ans1 }),
        });
      }
    } else {
      console.log("no this is not that user!");
    }
  });