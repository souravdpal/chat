const socket = window.socket || io('/', { autoConnect: true });
const ins = document.getElementById('here');
if (!ins) {
  console.error('Element with ID "here" not found in the DOM.');
  alert('Error: Missing required DOM element "here". Please check the HTML structure.');
}
const name1 = localStorage.getItem('name');
const user = localStorage.getItem('user');
const way = document.getElementById('btn');
const type = document.getElementById('type');
const input = document.getElementById('take');
const joiner = document.getElementById('join');


// Available models for validation
const avail_models = [
  ...["Anonymous"].filter(name => name !== "Anonymous"),
  "server : **note : models are not available in this version, but you can use them in the future**",
  "**because we have Hina and she is working fine in every aspect, we will soon add task-specific models**",
  /*'deepseek-r1:1.5b',
  'gemma3:4b',
  'deepseek-r1:latest',
  'llama3.1:8b'*/
];

function personalizeText(text) {
  if (!text) return '';

  let result = text;

  // Replace {diya}, {{diya}} (any number of curly braces) with "I don't know your diya"
  result = result.replace(/[{]+(name)[}]+/gi, "name");

  // Replace {user}, {{user}}, {name}, {{name}} (any number of curly braces) with name1
  if (name1) {
    result = result.replace(/[{]+(user)[}]+/gi, name1);
  }

  // Bold text between **...**
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Remove any remaining curly brackets around text (handles {{{text}}}, etc.)
  result = result.replace(/{{2,}([^{}]+)}{2,}/g, '$1');
  result = result.replace(/{+([^{}]+)}+/g, '$1');

  // Make social/dev URLs clickable as redirect links
  result = result.replace(
    /(?:https?:\/\/)?((?:github\.com|github\.io|instagram\.com|facebook\.com|twitter\.com|linkedin\.com|tiktok\.com|youtube\.com|reddit\.com|medium\.com|dev\.to|discord\.gg|discord\.com|t\.me|telegram\.me|twitch\.tv|snapchat\.com|pinterest\.com|tumblr\.com|bitbucket\.org|gitlab\.com|stackoverflow\.com|codepen\.io|jsfiddle\.net|replit\.com|notion\.so|substack\.com|patreon\.com|buymeacoffee\.com|ko-fi\.com|producthunt\.com|dribbble\.com|behance\.net|fiverr\.com|upwork\.com|freelancer\.com|angel\.co|crunchbase\.com|about\.me|blogspot\.com|wordpress\.com|soundcloud\.com|bandcamp\.com)(\/[^\s<]*)?)/gi,
    (match, domain, path) => {
      let url = match.startsWith('http') ? match : `https://${match}`;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${domain}${path || ''}</a>`;
    }
  );

  return result;
}
// Add message to chat
function addMessage(msg, isUser) {
  if (!msg) return;
  if (typeof msg.message === 'string') {
    msg.message = personalizeText(msg.message);
  }
  if (typeof msg.reply === 'string') {
    msg.reply = personalizeText(msg.reply);
  }

  const message = document.createElement('div');
  const chatType = msg.type || 'other';
  const sender = msg.username || msg.from || 'Anonymous';
  let content = msg.reply || msg.message || '';

  // Skip private messages
  if (chatType === 'personalchat') return;

  // Assign classes
  message.className = `message ${isUser ? 'user' : chatType === 'msg' && sender === 'Hina' ? 'ai' : chatType === 'worldchat' && msg.reply ? 'ai' : 'other'}`;

  // Handle special content
  if (content.includes('here are list of commands')) {
    message.innerHTML = `
      Ok, *${name1}*, here are the commands:
      <ul class="command-list">
        <li><span class="command">/r</span> = Clear chat</li>
        <li><span class="command">/wiki</span> = Wiki search</li>
        <li><span class="command">/(model) (prompt)</span> = Use specific model</li>
        <li><span class="command">/save</span> = Save chat</li>
        <li><span class="command">/invite</span> = Invite friend</li>
        <li><span class="command">/f</span> = Chat with friend</li>
        <li><span class="command">/m</span> = List models</li>
      </ul>
    `;
  } else if (content === avail_models.join('\n')) {
    message.innerHTML = `
      <ul class="command-list">
        ${avail_models.map(model => `<li><span class="command">${model}</span></li>`).join('')}
      </ul>
    `;
  } else {
    message.innerHTML = `<strong>${sender}:</strong> ${formatAIMessage(content)}`;
  }

  message.setAttribute('data-time', new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  ins.appendChild(message);
  ins.scrollTop = ins.scrollHeight;
}

// Format AI message content
function formatAIMessage(text) {
  let content = text || '';
  try {
    // Fix malformed URLs
    content = content.replace(/(https?:\/\/[^\s"'>]+)/g, (url) => {
      if (/<a[^>]*href=['"]?[^'">]*$/.test(content.slice(0, content.indexOf(url)))) return url;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
    // Bold markdown
    content = content.replace(/\*\*(.*?)\*\*|\*(.*?)\*/g, '<strong>$1$2</strong>');
    // Code blocks with / delimiter
    content = content.replace(/^\/\n([\s\S]*?)\n\/$/gm, (match, code) => {
      return `<div class="code-wrapper"><pre><code>${code}</code></pre><button class="copy-btn" aria-label="Copy code to clipboard">Copy Code</button></div>`;
    });
    // Standard code blocks
    content = content.replace(/"""([\s\S]*?).../g, (match, code) => {
      return `<div class="code-wrapper"><pre><code>${code}</code></pre><button class="copy-btn" aria-label="Copy code to clipboard">Copy Code</button></div>`;
    });
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<div class="code-wrapper"><pre><code class="language-${lang || 'text'}">${code}</code></pre><button class="copy-btn" aria-label="Copy code to clipboard">Copy Code</button></div>`;
    });
    // Inline code
    content = content.replace(/`([^`<>]+)`/g, '<code>$1</code>');
  } catch (e) {
    console.error('Error formatting AI message:', e);
  }
  return content;
}

// Redirect if not logged in
if (!user || !name1) {
  alert('Please log in to continue.');
  window.location.href = '/page.html';
}

// Validate DOM elements
if (!ins || !way || !input || !type || !joiner) {
  console.error('Missing DOM elements:', { ins, way, input, type, joiner });
  alert('Error in page setup. Please check the HTML structure.');
}

// Show join message
joiner.innerHTML = `${name1} joined, welcome to chat!`;
ins.innerHTML += `<div class="message other"><div class="command-example">Hey ${name1}, how are you? Enter "/" to see commands!</div></div>`;

// Initialize socket
function initSocket() {
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    socket.emit('auth', { user });
    socket.emit('chat message2', { user });
    fetchFriendRequests();
    fetchChatHistory('msg');
    fetchChatHistory('worldchat');
  });

  socket.on('reconnect', (attempt) => {
    console.log(`✅ Reconnected after ${attempt} attempts`);
    socket.emit('auth', { user });
    socket.emit('chat message2', { user });
    fetchFriendRequests();
    fetchChatHistory('msg');
    fetchChatHistory('worldchat');
  });

  socket.on('error', ({ message }) => {
    console.error('Socket error:', message);
    alert(`Socket Error: ${message}`);
  });

  socket.on('ai message', ({ type, username, message, timestamp }) => {
    console.log('Received AI message:', { type, username, message, timestamp });
    type.innerText = '';
    addMessage({ type, username: username || 'Hina', message, timestamp }, username === user);
  });

  socket.on('world message', ({ type, username, message, reply, timestamp }) => {
    console.log('Received world message:', { type, username, message, reply, timestamp });
    type.innerText = '';
    const msg = { type, username, message, timestamp };
    if (reply) msg.reply = reply;
    addMessage(msg, username === user);
  });

  socket.on('friendRequest', ({ from }) => {
    console.log(`New friend request from ${from}`);
    addFriendRequest(from);
  });

  socket.on('friendRequestAccepted', ({ from }) => {
    alert(`${from} has accepted your friend request!`);
  });

  socket.on('incomingRequest', ({ from, mode }) => {
    if (mode === 'text') {
      if (confirm(`${from} wants to chat with you! Accept?`)) {
        window.location.href = `/text.html?to=${encodeURIComponent(from)}`;
      }
    } else if (mode === 'call') {
      if (confirm(`${from} is calling you! Accept?`)) {
        window.location.href = `/call.html?to=${encodeURIComponent(from)}&opcode=true`;
      } else {
        socket.emit('endCall', { from: user, to: from });
      }
    }
  });
}

// Fetch chat history
async function fetchChatHistory(chatType) {
  try {
    const response = await fetch(`/chat_history?type=${encodeURIComponent(chatType)}&user1=${encodeURIComponent(user)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (response.ok && Array.isArray(data.messages)) {
      data.messages.forEach(msg => {
        if (chatType === 'msg' && msg.username === user) {
          addMessage({
            type: 'msg',
            username: msg.username,
            message: msg.message,
            timestamp: msg.timestamp
          }, true);
          if (msg.reply) {
            addMessage({
              type: 'msg',
              username: 'Hina',
              message: msg.reply,
              timestamp: msg.timestamp
            }, false);
          }
        } else if (chatType === 'worldchat') {
          addMessage(msg, msg.username === user);
        }
      });
    } else {
      console.error(`Invalid ${chatType} history response:`, data);
    }
  } catch (err) {
    console.error(`Error fetching ${chatType} history:`, err.message);
  }
}

// Copy code button functionality
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('copy-btn')) {
    const button = e.target;
    const codeElement = button.previousElementSibling.querySelector('code');
    const codeText = codeElement.textContent;

    navigator.clipboard.writeText(codeText).then(() => {
      button.textContent = 'Copied!';
      button.classList.add('copied');
      setTimeout(() => {
        button.textContent = 'Copy Code';
        button.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy code:', err);
      button.textContent = 'Error';
    });
  }
});

// Add friend request to UI
function addFriendRequest(fr1) {
  const requestId = `req-${fr1.replace(/\s+/g, '_')}`;
  if (document.getElementById(requestId)) return;

  const acceptId = `accept-${fr1.replace(/\s+/g, '_')}`;
  const rejectId = `reject-${fr1.replace(/\s+/g, '_')}`;

  ins.innerHTML += `
    <div class="cleaner friend-request-container" id="${requestId}">
      <div class="friend-request">
        <span class="friend-request-text"><strong>${fr1}</strong> sent you a friend request.</span>
        <div class="friend-request-buttons">
          <button class="btn-accept" id="${acceptId}">Accept</button>
          <button class="btn-reject" id="${rejectId}">Reject</button>
        </div>
      </div>
    </div>
  `;

  // Add CSS styles dynamically
  const style = document.createElement('style');
  style.textContent = `
    .friend-request-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      margin: 10px 0;
      border: 1px solid #ccc;
      border-radius: 8px;
      background-color: #f9f9f9;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .friend-request-text {
      font-size: 16px;
      color: #333;
    }
    .friend-request-buttons {
      display: flex;
      gap: 10px;
    }
    .btn-accept, .btn-reject {
      padding: 5px 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-accept {
      background-color: #4caf50;
      color: white;
    }
    .btn-accept:hover {
      background-color: #45a049;
    }
    .btn-reject {
      background-color: #f44336;
      color: white;
    }
    .btn-reject:hover {
      background-color: #e53935;
    }
  `;
  document.head.appendChild(style);

  setTimeout(() => {
    const acceptBtn = document.getElementById(acceptId);
    const rejectBtn = document.getElementById(rejectId);
    if (acceptBtn) {
      acceptBtn.addEventListener('click', async () => {
        try {
          const response = await fetch('/fr_response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'accept', from: fr1, to: user }),
          });
          const data = await response.json();
          if (response.ok) {
            alert(`Accepted friend request from ${fr1}.`);
            document.getElementById(requestId)?.remove();
            socket.emit('friendRequestAccepted', { from: user, to: fr1 });
          } else {
            console.error('Accept friend request error:', data);
            alert(`Error: ${data.error || 'Failed to accept friend request.'}`);
          }
        } catch (err) {
          console.error('Fetch error:', err.message);
          alert('Failed to accept friend request.');
        }
      });
    }
    if (rejectBtn) {
      rejectBtn.addEventListener('click', async () => {
        try {
          const response = await fetch('/fr_response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject', from: fr1, to: user }),
          });
          const data = await response.json();
          if (response.ok) {
            alert(`Rejected friend request from ${fr1}.`);
            document.getElementById(requestId)?.remove();
          } else {
            console.error('Reject friend request error:', data);
            alert(`Error: ${data.error || 'Failed to reject friend request.'}`);
          }
        } catch (err) {
          console.error('Fetch error:', err.message);
          alert('Failed to reject friend request.');
        }
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
      data.requests.forEach(fr => addFriendRequest(fr));
    } else {
      console.error('Invalid friend requests response:', data);
    }
  } catch (err) {
    console.error('Error fetching friend requests:', err.message);
  }
}

// Handle sending messages and commands
async function work() {
  const msg_box = input.value.trim();
  if (!msg_box) return;
  if(msg_box=='/n'){
    alert(name1)
  }
  if (msg_box === '/') {
    addMessage({
      type: 'other',
      message: 'here are list of commands',
      timestamp: new Date().toISOString()
    }, false);
    input.value = '';
    return;
  } else if (msg_box === '/r') {
    window.location.reload();
    input.value = '';
    return;
  } else if (msg_box === '/wiki') {
    const for_wiki = prompt('What do you want to ask Wiki?')?.trim();
    if (!for_wiki) return;
    const wikiMsg = {
      type: 'worldchat',
      username: user,
      message: for_wiki,
      timestamp: new Date().toISOString()
    };
    addMessage(wikiMsg, true);
    type.innerText = 'Wiki answering...';
    input.value = '';

    try {
      const response = await fetch('/wiki_cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg: for_wiki, user, name: name1 }),
      });
      const data = await response.json();
      if (response.ok && data.reply) {
        addMessage({
          type: 'worldchat',
          username: 'Hina',
          reply: data.reply,
          timestamp: new Date().toISOString()
        }, false);
      } else {
        console.error('Wiki error:', data);
        alert(`Wiki Error: ${data.error || 'Failed to get wiki response.'}`);
      }
    } catch (err) {
      console.error('Wiki fetch error:', err.message);
      alert('Failed to get wiki response.');
    } finally {
      type.innerText = '';
    }
    return;
  } else if (msg_box === '/m') {
    input.value = '';
    addMessage({
      type: 'other',
      message: avail_models.join('\n'),
      timestamp: new Date().toISOString()
    }, false);
    return;
  } else if (msg_box === '/invite') {
    const friend = prompt('Enter friend username to invite:')?.trim();
    if (!friend) return;
    try {
      const response = await fetch(`/initiate?user=${encodeURIComponent(user)}&to=${encodeURIComponent(friend)}&mode=text`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        alert(`Invitation sent to ${friend}.`);
      } else {
        console.error('Invite error:', data);
        alert(`Error: ${data.error || 'Failed to send invitation.'}`);
      }
    } catch (err) {
      console.error('Invite fetch error:', err.message);
      alert('Failed to send invitation.');
    }
    input.value = '';
    return;
  } else if (msg_box === '/save') {
    input.value = '';
    alert('This feature is coming soon.');
    return;
  } else if (msg_box === '/f') {
    const friend = prompt('Enter friend username to chat with:')?.trim();
    if (!friend) return;
    try {
      const response = await fetch(`/initiate?user=${encodeURIComponent(user)}&to=${encodeURIComponent(friend)}&mode=text`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        window.location.href = `/text.html?to=${encodeURIComponent(friend)}`;
      } else {
        console.error('Text initiation error:', data);
        alert(`Error: ${data.error || 'Failed to initiate chat.'}`);
      }
    } catch (err) {
      console.error('Text fetch error:', err.message);
      alert('Failed to initiate chat.');
    }
    input.value = '';
    return;
  }

  // Handle model-specific prompts
  if (msg_box.startsWith('/')) {
    const modelMatch = msg_box.match(/^\/([^\/]+)\s*(.*)$/);
    if (modelMatch) {
      const model = modelMatch[1];
      const prompt = modelMatch[2].trim();
      if (prompt && avail_models.includes(model)) {
        const userMsg = {
          type: 'msg',
          username: user,
          message: msg_box,
          timestamp: new Date().toISOString()
        };
        addMessage(userMsg, true);
        type.innerText = 'Typing...';
        input.value = '';

        try {
          const response = await fetch('/msghome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg: prompt, user, name: name1, model }),
          });
          const data = await response.json();
          if (response.ok && data.reply) {
            addMessage({
              type: 'msg',
              username: 'Hina',
              message: data.reply,
              timestamp: new Date().toISOString()
            }, false);
          } else {
            console.error('AI model error:', { status: response.status, data });
            alert(`AI Error: ${data.error || 'Invalid response from AI.'}`);
          }
        } catch (err) {
          console.error('AI model fetch error:', err.message);
          alert('Failed to get AI response. Please try again.');
        } finally {
          type.innerText = '';
        }
        return;
      } else if (prompt) {
        alert(`Invalid model: ${model}. Use /m to see available models.`);
        input.value = '';
        return;
      }
    }
  }

  // Handle regular AI messages
  const userMsg = {
    type: 'msg',
    username: user,
    message: msg_box,
    timestamp: new Date().toISOString()
  };
  addMessage(userMsg, true);
  type.innerText = 'Typing...';
  input.value = '';

  try {
    const response = await fetch('/msghome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg: msg_box, user, name: name1, model: 'meta-llama/llama-4-scout-17b-16e-instruct' }),
    });
    const data = await response.json();
    if (response.ok && data.reply) {
      addMessage({
        type: 'msg',
        username: 'Hina',
        message: data.reply,
        timestamp: new Date().toISOString()
      }, false);
    } else {
      console.error('AI error:', { status: response.status, data });
      alert(`AI Error: ${data.error || 'Failed to get AI response.'}`);
    }
  } catch (err) {
    console.error('AI fetch error:', err.message);
    alert('Failed to get AI response. Please check your connection.');
  } finally {
    type.innerText = '';
  }
}

// Event listeners
way.addEventListener('click', work);
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') work();
});

initSocket();