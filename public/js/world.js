//const socket = io();
let user = localStorage.getItem("user");
const ins = document.getElementById("here");
const form = document.getElementById("btn");
const input = document.getElementById("take");
const name1 = localStorage.getItem("name");

let joiner = document.getElementById("join");
joiner.innerHTML += `${name1} joined the world chat!`;

// Convert to 12-hour format without seconds
function formatTime(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // convert 0 to 12
  minutes = minutes < 10 ? "0" + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

const myButton = document.getElementById("btn");


form.addEventListener("click", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const data1 = {
    sender: name1,
    text: text,
    time: formatTime(new Date()),
  };

  socket.emit("chat message", data1); // Send to server
  showMessage(data1, "user"); // Show own
  input.value = "";
});

socket.on("chat message", (data) => {
  if (data.sender !== name1) {
    showMessage(data, "other"); // Show others
  }
});

function showMessage(data, type) {
  if (data.sender === undefined) {
    return console.log("normal user log of sockets!");
  }
  ins.innerHTML += `
    <div class="message ${type}">
      <strong>${data.sender}:</strong> ${data.text}
      <br><small>${data.time}</small>
    </div>
  `;
  ins.scrollTop = ins.scrollHeight;
}

function addFriendRequest(fr1) {
  const requestId = `req-${fr1.replace(/\s+/g, '_')}`;
  if (document.getElementById(requestId)) return;

  const acceptId = `accept-${fr1.replace(/\s+/g, '_')}`;
  const rejectId = `reject-${fr1.replace(/\s+/g, '_')}`;

  ins.innerHTML += `
    <div class="cleaner" id="${requestId}">
      <div class="friend-request">
        <span><strong>${fr1}</strong> sent you a friend request.</span>
        <button class="btn-accept" id="${acceptId}">Accept</button>
        <button class="btn-reject" id="${rejectId}">Reject</button>
      </div>
    </div>
  `;

  setTimeout(() => {
    const acceptBtn = document.getElementById(acceptId);
    const rejectBtn = document.getElementById(rejectId);
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        fetch('/fr_response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accept', from: fr1, to: user }),
        })
          .then((res) => res.json())
          .then((data) => {
            alert(`Accepted friend request from ${fr1}.`);
            document.getElementById(requestId)?.remove();
            socket.emit('friendRequestAccepted', { from: user, to: fr1 });
          })
          .catch((err) => {
            console.error('Error accepting friend request:', err);
            alert('Failed to accept friend request.');
          });
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        fetch('/fr_response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', from: fr1, to: user }),
        })
          .then((res) => res.json())
          .then((data) => {
            alert(`Rejected friend request from ${fr1}.`);
            document.getElementById(requestId)?.remove();
          })
          .catch((err) => {
            console.error('Error rejecting friend request:', err);
            alert('Failed to reject friend request.');
          });
      });
    }
  }, 0);
}

// Fetch friend requests
async function fetchFriendRequests() {
  try {
    const response = await fetch(`/fr_requests?user=${encodeURIComponent(user)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (response.ok && Array.isArray(data.requests)) {
      data.requests.forEach((fr) => addFriendRequest(fr));
    } else {
      console.error('Invalid friend requests response:', data);
    }
  } catch (err) {
    console.error('Error fetching friend requests:', err);
  }
}


setInterval(fetchFriendRequests, 1000);