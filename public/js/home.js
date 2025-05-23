let ins = document.getElementById("here");
let name1 = localStorage.getItem("name");
let way = document.getElementById("btn");
let type = document.getElementById("type");
let avail_models = `
1. deepseek-r1:1.5b <br><br><br>
2. gemma3:4b
`;
let fr_cleaner = document.getElementById("cleaner");

let user = localStorage.getItem("user");
// Show join message once when the script runs
let joiner = document.getElementById("join");
joiner.innerHTML += `${name1} joined, welcome to chat!`;
ins.innerHTML = `<div class='message other'>hey ${name1} how are you , enter "/" so i can guide you thorugly!</div>`;

// Main function to handle sending and receiving
let input = document.getElementById("take");
let work = async () => {
  let msg_box = input.value.trim();

  if (!msg_box) return; // prevent empty messages

  // Handle commands
  if (msg_box === "/") {
    ins.innerHTML += `<div class="message other">ok ${name1} here are list of commands <br><br> 
      1. /r = clear chat! <br><br><br>
      2. /wiki = to do a wiki search also if <br>you want answer in special language  just do ex:  /(language first two words small letter )(prompt) after entering /wiki<br><br><br>
      3. /(model name)(prompt) = answers in specifc model made for  <br><br><br>
      4. /save = save your chat <br><br><br>
      5. /invite = invite to talk with you<br><br><br>
      6. /f  = talk personally to friend in your friend list<br><br><br>
      7. if enter anyting else then special commands our model will answer it <br><br><br>
      8. /m  = to see available models for your AI 
    </div>`;
    input.value = "";
    if (fr_cleaner) {
      fr_cleaner.innerHTML = "";
    } else {
      console.log("no rm");
    }

    return;
  } else if (msg_box === "/r") {
    window.location.reload();
    input.value = "";
    if (fr_cleaner) {
      fr_cleaner.innerHTML = "";
    } else {
      console.log("no rm");
    }

    return;
  } else if (msg_box === "/wiki") {
    let for_wiki1 = prompt("What do you want to ask Wiki?");
    if (!for_wiki1) return;
    let for_wiki = for_wiki1.trim();
    ins.innerHTML += `<div class="message user">${for_wiki}</div>`;
    type.innerHTML = "wiki answering...";
    ins.scrollTop = ins.scrollHeight;
    input.value = "";
    if (fr_cleaner) {
      fr_cleaner.innerHTML = "";
    } else {
      console.log("no rm");
    }

    let wiki_msg = { msg: for_wiki };
    try {
      let response = await fetch("/wiki_cmd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wiki_msg, null, 2),
      });

      let data = await response.json();
      if (response.ok) {
        type.innerHTML = "";
        ins.innerHTML += `<div class="message other">${
          data.reply || JSON.stringify(data)
        }</div>`;
        ins.scrollTop = ins.scrollHeight;
        if (fr_cleaner) {
          fr_cleaner.innerHTML = "";
        } else {
          console.log("no rm");
        }
      } else {
        console.error("Server error:", data);
        type.innerHTML = "";
        if (fr_cleaner) {
          fr_cleaner.innerHTML = "";
        } else {
          console.log("no rm");
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
      type.innerHTML = "";
      if (fr_cleaner) {
        fr_cleaner.innerHTML = "";
      } else {
        console.log("no rm");
      }
    }
    return;
  } else if (msg_box === "/m") {
    input.value = "";
    if (fr_cleaner) {
  fr_cleaner.innerHTML = "";
} else {
  console.log('no rm');
}

    ins.innerHTML += `<div class="message other">${avail_models}</div>`;
    return;
  } else if (msg_box === "/invite") {
    input.value = "";
    alert("This feature is coming soon.");
    return;
  } else if (msg_box === "/save") {
    input.value = "";
    alert("This feature is coming soon.");
    return;
  } else if (msg_box === "/f") {
    return (window.location.href = "freinds.html");
  }
  ins.innerHTML += `<div class="message user">${msg_box}</div>`;
  type.innerHTML = "Typing...";
  ins.scrollTop = ins.scrollHeight;
  input.value = "";
  if (fr_cleaner) {
    fr_cleaner.innerHTML = "";
  } else {
    console.log("no rm");
  }

  let msg = { msg: msg_box };
  console.log(msg.msg);
  try {
    let response = await fetch("/msg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });

    let data = await response.json();
    if (response.ok) {
      type.innerHTML = "";
      if (fr_cleaner) {
        fr_cleaner.innerHTML = "";
      } else {
        console.log("no rm");
      }

      ins.innerHTML += `<div class="message other">${
        data.reply || JSON.stringify(data)
      }</div>`;
      ins.scrollTop = ins.scrollHeight;
    } else {
      console.error("Server error:", data);
      type.innerHTML = "";
    }
  } catch (error) {
    console.error("Fetch error:", error);
    type.innerHTML = "";
  }
};

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
setInterval(giver, 900);
