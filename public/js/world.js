const socket = io();

// DOM elements
const ins = document.getElementById('here');
const form = document.getElementById('btn');
const input = document.getElementById('take');
const name1 = localStorage.getItem('name') // fallback
let joiner = document.getElementById("join");
joiner.innerHTML += `${name1} joined the world chat!`;

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
// Send message
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
