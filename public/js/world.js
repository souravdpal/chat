const socket = io();
let  user  = localStorage.getItem('user')
// DOM elements
const ins = document.getElementById('here');
const form = document.getElementById('btn');
const input = document.getElementById('take');
const name1 = localStorage.getItem('name') // fallback
let joiner = document.getElementById("join");
joiner.innerHTML += `${name1} joined the world chat!`;

form.addEventListener('click', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const data = {
    sender: name1,
    text: text,
    time: new Date().toLocaleTimeString()
  };

  socket.emit('chat message', data);  // Send to server
  showMessage(data, 'user');          // Show own
  input.value = '';
});

// Receive message
socket.on('chat message', (data) => {
  if (data.sender !== name1) {
    showMessage(data, 'other'); // Show others
  }
});

// Add message to screen
function showMessage(data, type) {
  ins.innerHTML += `
    <div class="message ${type}">
      <strong>${data.sender}:</strong> ${data.text}
      <br><small>${data.time}</small>
    </div>
  `;
  ins.scrollTop = ins.scrollHeight;
}
let giver = () => {
  fetch("/fr_await", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user , i:1 }),
  })
    .then((res) => res.json())
    .then((data) => {
      const awaitList = data.awaiter;

      if (!awaitList || awaitList.length === 0) {
        //console.log('no friend req yet');
        return;
      }

      awaitList.forEach((fr1, index) => {
        // Use friend name as unique id, replacing spaces with underscores
        const requestId = `req-${fr1.replace(/\s+/g, "_")}`;
        const acceptId = `accept-${fr1.replace(/\s+/g, "_")}`;
        const rejectId = `reject-${fr1.replace(/\s+/g, "_")}`;

        // Skip if this request is already shown
        if (document.getElementById(requestId)) {
          return;
        }

        ins.innerHTML += `
          <div class="cleaner" id="${requestId}">
            <div class="friend-request">
              <span><strong>${fr1}</strong> sent you a friend request.</span><br><br>
              <button class="btn-accept" id="${acceptId}">Accept</button>
              <button class="btn-reject" id="${rejectId}">Reject</button>
            </div>
          </div>
        `;

        // Attach event listeners after elements added
        setTimeout(() => {
          const acceptBtn = document.getElementById(acceptId);
          const rejectBtn = document.getElementById(rejectId);

          if (acceptBtn) {
            acceptBtn.addEventListener("click", () => {
              alert(`${fr1} is your friend now.`);

              fetch("/fr_u", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ res_user: "ok", from: fr1, to: user }),
              }).catch((err) => {
                console.log(err);
                alert("DB error");
              });

              // Remove friend request element after accept
              const el = document.getElementById(requestId);
              if (el) el.remove();
            });
          }

          if (rejectBtn) {
            rejectBtn.addEventListener("click", () => {
              alert(`${fr1} is denied!`);

              fetch("/fr_u", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ res_user: "no", from: fr1, to: user }),
              }).catch((err) => {
                console.log(err);
                console.log("DB error");
              });

              // Remove friend request element after reject
              const el = document.getElementById(requestId);
              if (el) el.remove();
            });
          }
        }, 0);
      });
    })
    .catch((err) => console.error(err));
};

// Call giver every 200ms
setInterval(giver, 300);
