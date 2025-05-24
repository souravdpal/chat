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

let giver = () => {
  fetch("/fr_await", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, i: 1 }),
  })
    .then((res) => res.json())
    .then((data) => {
      const awaitList = data.awaiter;
      if (!awaitList || awaitList.length === 0) return;

      awaitList.forEach((fr1) => {
        const requestId = `req-${fr1.replace(/\s+/g, "_")}`;
        const acceptId = `accept-${fr1.replace(/\s+/g, "_")}`;
        const rejectId = `reject-${fr1.replace(/\s+/g, "_")}`;

        if (document.getElementById(requestId)) return;

        ins.innerHTML += `
          <div class="cleaner" id="${requestId}">
            <div class="friend-request">
              <span><strong>${fr1}</strong> sent you a friend request.</span><br><br>
              <button class="btn-accept" id="${acceptId}">Accept</button>
              <button class="btn-reject" id="${rejectId}">Reject</button>
            </div>
          </div>
        `;

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

              const el = document.getElementById(requestId);
              if (el) el.remove();
            });
          }
        }, 0);
      });
    })
    .catch((err) => console.error(err));
};

// Call giver every 300ms
setInterval(giver, 300);
