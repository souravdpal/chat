const socket = window.socket || io('/'); // Use shared socket or create new
const ins = document.getElementById('here');
const name1 = localStorage.getItem('name');
const user = localStorage.getItem('user');
const way = document.getElementById('btn');
const type = document.getElementById('type');
const input = document.getElementById('take');
const joiner = document.getElementById('join');

const avail_models = `
<ul class="command-list">
  <li><span class="command">1. deepseek-r1:1.5b</span></li>
  <li><span class="command">2. gemma3:4b</span></li>
  <li><span class="command">2. deepseek-r1:latest</span></li>
  <li><span class="command">2.  llama3.1:8b </span></li>
  <li><span class="command">2. gemma3:1b</span></li>
</ul>
`;

// Redirect if not logged in
if (!user || !name1) {
  alert('Please log in to continue.');
  window.location.href = 'login.html';
}

// Show join message
joiner.innerHTML = `${name1} joined, welcome to chat!`;
ins.innerHTML += `<div class='message other'><div class="command-example">hey ${name1} how are you, enter "/" so I can guide you thoroughly!</div></div>`;

// Initialize socket
function initSocket() {
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    socket.emit('auth', { user });
    socket.emit('chat message2', { user }); // For compatibility with server
    fetchFriendRequests();
  });

  socket.on('reconnect', (attempt) => {
    console.log(`✅ Reconnected after ${attempt} attempts`);
    socket.emit('auth', { user });
    socket.emit('chat message2', { user });
    fetchFriendRequests();
  });

  socket.on('error', ({ message }) => {
    console.error('Server error:', message);
    alert(`Error: ${message}`);
  });

  socket.on('friendRequest', ({ from }) => {
    console.log(`New friend request from ${from}`);
    addFriendRequest(from);
  });

  socket.on('friendRequestAccepted', ({ from }) => {
    alert(`${from} has accepted your friend request!`);
  });

  socket.on('privateMessage', ({ from, message, isSender }) => {
    addMessage(message, isSender, from);
  });
}

// Format AI message content
function formatAIMessage(text) {
  let formattedText = text;
  // Replace double stars **text** with <strong>text</strong>
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Replace single stars *text* with <strong>text</strong>
  formattedText = formattedText.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  
  if (formattedText.includes('```')) {
    formattedText = formattedText.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
      const cleanedCode = codeContent.trim();
      return `<pre><code>${cleanedCode}</code></pre>`;
    });
  }
  
  formattedText = formattedText.replace(/`([^`]+)`/g, '<code>$1</code>');
  return formattedText;
}

// Add message to chat
function addMessage(text, isUser, from) {
  const message = document.createElement('div');
  if (isUser) {
    message.classList.add('message', 'user');
  } else if (from === 'ollama') {
    message.classList.add('message', 'ai');
  } else {
    message.classList.add('message', 'other');
  }

  if (text.includes('here are list of commands')) {
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
  } else if (from === 'ollama') {
    message.innerHTML = formatAIMessage(text);
  } else if (text === avail_models) {
    message.innerHTML = text;
  } else {
    message.textContent = text;
  }

  message.setAttribute(
    'data-time',
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  ins.appendChild(message);
  ins.scrollTop = ins.scrollHeight;
}

// Add friend request to UI

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
// Handle sending messages and commands
async function work() {
  const msg_box = input.value.trim();
  if (!msg_box) return;

  if (msg_box === '/') {
    addMessage('ok ${name1} here are list of commands', false, 'other');
    input.value = '';
    return;
  } else if (msg_box === '/r') {
    window.location.reload();
    input.value = '';
    return;
  } else if (msg_box === '/wiki') {
    const for_wiki = prompt('What do you want to ask Wiki?')?.trim();
    if (!for_wiki) return;
    addMessage(for_wiki, true, user);
    type.innerText = 'wiki answering...';
    input.value = '';

    try {
      const response = await fetch('/wiki_cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg: for_wiki })
      });
      const data = await response.json();
      type.innerText = '';
      if (response.ok) {
        addMessage(data.reply, false, 'ollama');
        } else {
        console.error('Wiki error:', data);
        alert('Failed to get wiki response.');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      type.innerText = '';
      alert('Failed to get wiki response.');
    }
    return;
  } else if (msg_box === '/m') {
    input.value = '';
    addMessage(avail_models, false, 'other');
    return;
  } else if (msg_box === '/invite') {
    input.value = '';
    alert('This feature is coming soon.');
    return;
  } else if (msg_box === '/save') {
    input.value = '';
    alert('This feature is coming soon.');
    return;
  } else if (msg_box === '/f') {
    window.location.href = 'f.html';
    return;
  }

  // Handle model-specific prompts
  if (msg_box.startsWith('/')) {
    const modelMatch = msg_box.match(/^\/([^\/]+)(.*)$/);
    if (modelMatch) {
      const model = modelMatch[1];
      const prompt = modelMatch[2].trim();
      if (prompt) {
        addMessage(msg_box, true, user);
        type.innerText = 'Typing...';
        input.value = '';

        try {
          const response = await fetch('/msghome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg: prompt, model }),
          });
          const data = await response.json();
          type.innerText = '';
          if (response.ok) {
            addMessage(data.reply, false, 'ollama');
          } else {
            console.error('Server error:', data);
            alert('Failed to get AI response.');
          }
        } catch (error) {
          console.error('Fetch error:', error);
          type.innerText = '';
          alert('Failed to get AI response.');
        }
        return;
      }
    }
  }

  // Handle regular AI messages
  addMessage(msg_box, true, user);
  type.innerText = 'Typing...';
  input.value = '';

  try {
    const response = await fetch('/msghome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg: msg_box }),
    });
    const data = await response.json();
    type.innerText = '';
    if (response.ok) {
      addMessage(data.reply, false, 'ollama');
    } else {
      console.error('Server error:', data);
      alert('Failed to get AI response.');
    }
  } catch (error) {
    console.error('Fetch error:', error);
    type.innerText = '';
    alert('Failed to get AI response.');
  }
}

// Event listeners
way.addEventListener('click', work);
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') work();
});
initSocket();