<<<<<<< HEAD
let ins = document.getElementById('here');
let name1 = localStorage.getItem('name');
let way = document.getElementById('btn');
let type  = document.getElementById('type')
// Show join message
let joiner  =  document.getElementById('join')
joiner.innerHTML+=`${name1} joined the chat!`

// Main function to handle sending and receiving
let work = async () => {
  let input = document.getElementById('take');
  let msg_box = input.value.trim();
  if (!msg_box) return; // prevent empty
  if(msg_box == "/"){
=======
let ins = document.getElementById("here");
let name1 = localStorage.getItem("name");
let way = document.getElementById("btn");
let type = document.getElementById("type");
// Show join message
let joiner = document.getElementById("join");
joiner.innerHTML += `${name1} joined the chat!`;

// Main function to handle sending and receiving
let work = async () => {
  let input = document.getElementById("take");
  let msg_box = input.value.trim();
  if (!msg_box) return; // prevent empty
  if (msg_box == "/") {
>>>>>>> 5fe94b9 (adding we socket.ignored)
    ins.innerHTML += `      <div class="message other" > ok ${name1} here are list of commands <br><br> 
    
    1 .  /r   = clear chat! <br><br><br>
    2.   /wiki  = to do a wiki search <br><br><br>
    3.   /model  = chnage ollama models <br><br><br>
    4.   /save  = save your chat <br><br><br>
    5.   /invite   = invite to talk with you<br><br><br>
<<<<<<< HEAD
    
    </div>`
    return 
  }else if(msg_box == '/r'){
    window.location.reload()
    return;
  }else if (msg_box == '/wiki'){
    fetch('/cmd' ,{
      method : 'POST',
      headers :{
        'Content-Type' : 'application/json'
      },
      body :  JSON.stringify({cmd : msg_box} , null , 2)
    })
  }
  // Show sent message
  ins.innerHTML += `<div class="message user" >${msg_box}</div>`
  type.innerHTML =  'Typing...'
=======
    6.   /w   =  talk all world chat talk anynone who is online in world chat<br><br><br>
    
    </div>`;
    return;
  } else if (msg_box == "/r") {
    window.location.reload();
    input.innerHTML=""
    return;
  } else if (msg_box == "/wiki") {
    input.innerHTML=""
    fetch("/cmd", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cmd: msg_box }, null, 2),
    });
  }else if (msg_box =="/w"){
    input.innerHTML=""
    window.location.href='world.html'
  }else {
    input.innerHTML=""
    // Show sent message
  ins.innerHTML += `<div class="message user" >${msg_box}</div>`;
  type.innerHTML = "Typing...";
>>>>>>> 5fe94b9 (adding we socket.ignored)
  // Scroll to bottom
  ins.scrollTop = ins.scrollHeight;

  // Clear input box
  input.value = "";

  // Prepare and send message to backend
  let msg = { msg: msg_box };

  try {
<<<<<<< HEAD
    let response = await fetch('/msg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });
    let data = await response.json();
    if (response.ok) {
     type.innerHTML =  ''
     ins.innerHTML += `      <div class="message other" > ${data.reply || JSON.stringify(data)}</div>`
=======
    let response = await fetch("/msg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    let data = await response.json();
    if (response.ok) {
      type.innerHTML = "";
      ins.innerHTML += `      <div class="message other" > ${
        data.reply || JSON.stringify(data)
      }</div>`;
>>>>>>> 5fe94b9 (adding we socket.ignored)

      // Scroll again after reply
      ins.scrollTop = ins.scrollHeight;
    } else {
<<<<<<< HEAD
      console.error('Server error:', data);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
=======
      console.error("Server error:", data);
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
    
  }
  
>>>>>>> 5fe94b9 (adding we socket.ignored)
};
