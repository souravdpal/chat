let ins = document.getElementById("here");
let name1 = localStorage.getItem("name");
let way = document.getElementById("btn");
let type = document.getElementById("type");
let avail_models = `
<ul class="command-list">
  <li><span class="command">1. deepseek-r1:1.5b</span></li>
  <li><span class="command">2. gemma3:4b</span></li>
</ul>
`;
let fr_cleaner = document.getElementById("cleaner");
let user = localStorage.getItem("user");

// Show join message once when the script runs
let joiner = document.getElementById("join");
joiner.innerHTML += `${name1} joined, welcome to chat!`;
ins.innerHTML = `<div class='message other'><div class="command-example">hey ${name1} how are you, enter "/" so I can guide you thoroughly!</div></div>`;

// Function to parse and format AI message content
function formatAIMessage(text) {
  let formattedText = text;

  // Handle bold text (**text**)
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Handle code blocks (```code```)
  if (formattedText.includes('```')) {
    formattedText = formattedText.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
      const cleanedCode = codeContent.trim();
      return `<pre><code>${cleanedCode}</code></pre>`;
    });
  }

  // Handle inline code (`code`)
  formattedText = formattedText.replace(/`([^`]+)`/g, '<code>$1</code>');

  return formattedText;
}

// Function to add messages to the chat
function addMessage(text, isUser, from) {
  const message = document.createElement("div");

  // Determine the message type
  if (isUser) {
    message.classList.add("message", "user");
  } else if (from === "ollama") {
    message.classList.add("message", "ai");
  } else {
    message.classList.add("message", "other");
  }

  // Handle special cases (e.g., command list or AI response)
  if (text.includes("here are list of commands")) {
    message.innerHTML = `
      ok ${name1} here are list of commands
      <ul class="command-list">
        <li><span class="command">/r</span> = clear chat!</li>
        <li><span class="command">/wiki</span> = to do a wiki search also if you want answer in special language just do ex: <span class="command-example">/(language first two words small letter)(prompt)</span> after entering <span class="command">/wiki</span></li>
        <li><span class="command">/(model name)(prompt)</span> = answers in specific model made for</li>
        <li><span class="command">/save</span> = save your chat</li>
        <li><span class="command">/invite</span> = invite to talk with you</li>
        <li><span class="command">/f</span> = talk personally to friend in your friend list</li>
        <li>if enter anything else then special commands our model will answer it</li>
        <li><span class="command">/m</span> = to see available models for your AI</li>
      </ul>
    `;
  } else if (from === "ollama") {
    // Format AI message with bold and code blocks
    message.innerHTML = formatAIMessage(text);
  } else if (text === avail_models) {
    // Handle the /m command response
    message.innerHTML = text;
  } else {
    message.textContent = text;
  }

  // Add timestamp
  message.setAttribute(
    "data-time",
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );

  // Append to chat
  ins.appendChild(message);
  ins.scrollTop = ins.scrollHeight;
}

// Main function to handle sending and receiving
let input = document.getElementById("take");
let work = async () => {
  let msg_box = input.value.trim();

  if (!msg_box) return; // Prevent empty messages

  // Handle commands
  if (msg_box === "/") {
    addMessage(`ok ${name1} here are list of commands`, false, "other");
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
    addMessage(for_wiki, true, user);
    type.innerHTML = "wiki answering...";
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
        addMessage(data.reply || JSON.stringify(data), false, "ollama");
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
      console.log("no rm");
    }
    addMessage(avail_models, false, "other");
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
    window.location.href = "freinds.html";
    return;
  }

  // Handle model-specific prompts (e.g., /(model name)(prompt))
  if (msg_box.startsWith("/")) {
    const modelMatch = msg_box.match(/^\/([^\/]+)(.*)$/);
    if (modelMatch) {
      const model = modelMatch[1];
      const prompt = modelMatch[2].trim();
      if (prompt) {
        addMessage(msg_box, true, user);
        type.innerHTML = "Typing...";
        input.value = "";
        if (fr_cleaner) {
          fr_cleaner.innerHTML = "";
        } else {
          console.log("no rm");
        }

        let msg = { msg: prompt, model: model };
        try {
          let response = await fetch("/msg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(msg),
          });

          let data = await response.json();
          if (response.ok) {
            type.innerHTML = "";
            addMessage(data.reply || JSON.stringify(data), false, "ollama");
            if (fr_cleaner) {
              fr_cleaner.innerHTML = "";
            } else {
              console.log("no rm");
            }
          } else {
            console.error("Server error:", data);
            type.innerHTML = "";
          }
        } catch (error) {
          console.error("Fetch error:", error);
          type.innerHTML = "";
        }
        return;
      }
    }
  }

  // Handle regular messages
  addMessage(msg_box, true, user);
  type.innerHTML = "Typing...";
  input.value = "";
  if (fr_cleaner) {
    fr_cleaner.innerHTML = "";
  } else {
    console.log("no rm");
  }

  let msg = { msg: msg_box };
  try {
    let response = await fetch("/msg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });

    let data = await response.json();
    if (response.ok) {
      type.innerHTML = "";
      addMessage(data.reply || JSON.stringify(data), false, "ollama");
      if (fr_cleaner) {
        fr_cleaner.innerHTML = "";
      } else {
        console.log("no rm");
      }
    } else {
      console.error("Server error:", data);
      type.innerHTML = "";
    }
  } catch (error) {
    console.error("Fetch error:", error);
    type.innerHTML = "";
  }
};

// Friend request handler
let giver = () => {
  fetch("/fr_await", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, i: 1 }),
  })
    .then((res) => res.json())
    .then((data) => {
      const awaitList = data.awaiter;

      if (!awaitList || awaitList.length === 0) {
        return;
      }

      awaitList.forEach((fr1, index) => {
        const requestId = `req-${fr1.replace(/\s+/g, "_")}`;
        const acceptId = `accept-${fr1.replace(/\s+/g, "_")}`;
        const rejectId = `reject-${fr1.replace(/\s+/g, "_")}`;

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

// Call giver every 900ms
setInterval(giver, 900);

// Event listener for send button
way.addEventListener("click", work);

// Event listener for Enter key
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    work();
  }
});