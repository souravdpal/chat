let ins = document.getElementById("here");
let name1 = localStorage.getItem("name");
let way = document.getElementById("btn");
let type = document.getElementById("type");

fetch('/f' ,{
  method :'POST'
})
.then(response=>response.json())
.then(data=>{
  let from  = data.from
  if(data.to == name1 ){
    let ask = prompt(`${from} send you freind req enter y/n`)
    console.log(ask)
    if(ask == 'y' || 'Y'){
      let ans1= "ok"
      fetch('/f_res', {
        method : "POST",
        headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ans : ans1})
      })
    }else if (ask  === 'n' && 'N'){
      let ans1 = "denied"
      fetch('/f_res', {
        method : "POST",
        headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ans : ans1})
      })
  
  
  
  
    }
  }else {
    console.log('no this is not that user!')

  }
  
})
// Show join message once when the script runs
let joiner = document.getElementById("join");
joiner.innerHTML += `${name1} joined the chat!`;

// Main function to handle sending and receiving
let work = async () => {
  let input = document.getElementById("take");
  let msg_box = input.value.trim();

  if (!msg_box) return; // prevent empty messages

  // Handle commands first
  if (msg_box == "/") {
    ins.innerHTML += `<div class="message other">ok ${name1} here are list of commands <br><br> 
      1. /r = clear chat! <br><br><br>
      2. /wiki = to do a wiki search <br><br><br>
      3. /model = change ollama models <br><br><br>
      4. /save = save your chat <br><br><br>
      5. /invite = invite to talk with you<br><br><br>
      6. /w = talk all world chat talk anyone who is online in world chat<br><br><br>
      7. /f  = talk personally to friend in your friend list<br><br><br>
    </div>`;
    input.value = "";
    return;
  } else if (msg_box == "/r") {
    window.location.reload();
    input.value = "";
    return;
  } else if (msg_box == "/wiki") {
    input.value = "";
    alert('this feature coming soon');
    return;
  } else if (msg_box == "/w") {
    input.value = "";
    window.location.href = 'world.html';
    return;
  } else if (msg_box == "/model") {
    input.value = "";
    alert('this feature coming soon');
    return;
  } else if (msg_box == "/invite") {
    input.value = "";
    alert('this feature coming soon');
    return;
  } else if (msg_box == "/save") {
    input.value = "";
    alert('this feature coming soon');
    return;
  }else if (msg_box=='/f'){
    window.location.href = 'freinds.html'
  }

  // If no commands matched, show sent message
  ins.innerHTML += `<div class="message user">${msg_box}</div>`;
  type.innerHTML = "Typing...";

  // Scroll to bottom
  ins.scrollTop = ins.scrollHeight;

  // Clear input box
  input.value = "";

  // Prepare and send message to backend
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
      ins.innerHTML += `<div class="message other">${data.reply || JSON.stringify(data)}</div>`;

      // Scroll again after reply
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
