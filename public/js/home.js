let ins = document.getElementById('here');
let name1 = localStorage.getItem('name');
let way = document.getElementById('btn');

// Show join message
let joiner  =  document.getElementById('join')
joiner.innerHTML+=`${name1} joined the chat!`

// Main function to handle sending and receiving
let work = async () => {
  let input = document.getElementById('take');
  let msg_box = input.value.trim();
  if (!msg_box) return; // prevent empty

  // Show sent message
  ins.innerHTML += `<div class="message user" >${msg_box}</div>`

  // Scroll to bottom
  ins.scrollTop = ins.scrollHeight;

  // Clear input box
  input.value = "";

  // Prepare and send message to backend
  let msg = { msg: msg_box };

  try {
    let response = await fetch('/msg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });

    let data = await response.json();

    if (response.ok) {
      ins.innerHTML += `      <div class="message other" > ${data.reply || JSON.stringify(data)}</div>`

      // Scroll again after reply
      ins.scrollTop = ins.scrollHeight;
    } else {
      console.error('Server error:', data);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
};
