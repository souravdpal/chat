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




    const themes = ['light', 'dark', 'blue'];
    let currentThemeIndex = 0;

    // Load theme from localStorage if available
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && themes.includes(savedTheme)) {
      currentThemeIndex = themes.indexOf(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      currentThemeIndex = themes.indexOf('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    function toggleTheme() {
      currentThemeIndex = (currentThemeIndex + 1) % themes.length;
      const newTheme = themes[currentThemeIndex];
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    }

    // Navbar animations
    document.addEventListener('DOMContentLoaded', () => {
      const logo = document.querySelector('.logo');
      const navLinks = document.querySelectorAll('.nav-link');

      // Logo hover effect
      logo.addEventListener('mouseenter', () => {
        logo.style.transform = 'scale(1.1)';
      });
      logo.addEventListener('mouseleave', () => {
        logo.style.transform = 'scale(1)';
      });

      // Nav links hover effect
      navLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
          link.style.transform = 'scale(1.05)';
        });
        link.addEventListener('mouseleave', () => {
          link.style.transform = 'scale(1)';
        });
      });
    });






// Available models (placeholder messages)
const avail_models = [
  "server: **note: models are not available in this version, but you can use them in the future**",
  "**because we have Hina and she is working fine in every aspect, we will soon add task-specific models**"
];

// Track loaded messages
const loadedMessages = new Set();
let isHistoryLoaded = false;

// Generate unique message ID
function generateMessageId(msg) {
  const { timestamp, username, message, reply } = msg;
  const content = message || reply || '';
  return `${new Date(timestamp || Date.now()).toISOString()}|${username || 'unknown'}|${content}`;
}

function personalizeText(text) {
  if (!text) return '';
  let result = text;
  result = result.replace(/[{]+(name)[}]+/gi, "name");
  if (name1) {
    result = result.replace(/[{]+(user)[}]+/gi, name1);
  }
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/{{2,}([^{}]+)}{2,}/g, '$1');
  result = result.replace(/{+([^{}]+)}+/g, '$1');
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

  const messageId = generateMessageId(msg);
  if (loadedMessages.has(messageId)) return;
  loadedMessages.add(messageId);

  const message = document.createElement('div');
  const chatType = msg.type || 'other';
  const sender = isUser ? user : msg.username || msg.from || 'Hina';
  let content = msg.reply || msg.message || '';

  if (chatType === 'personalchat') return;

  message.className = `message ${isUser ? 'user' : sender === 'Hina' ? 'ai' : 'other'}`;

  if (content.includes('here are list of commands')) {
    message.innerHTML = `
      Ok, *${name1}*, here are the commands:
      <ul class="command-list">
         <li><span class="command">/custom</span> = add your custom prompts and make hina what you like her too!</li>
        <li><span class="command">/r</span> = Clear chat</li>
        <li><span class="command">/wiki</span> = Wiki search</li>
        <li><span class="command">/save</span> = Save chat</li>
        <li><span class="command">/invite</span> = Invite friend</li>
        <li><span class="command">/f</span> = Chat with friend</li>
        <li><span class="command">/m</span> = List models</li>
      </ul>
    `;
  } else if (content === avail_models.join('\n')) {
    message.innerHTML = `
      <ul class="command-list">
        ${avail_models.map(model => `<li><span class="message">${model}</span></li>`).join('')}
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
    content = content.replace(/(https?:\/\/[^\s"'>]+)/g, (url) => {
      if (/<a[^>]*href=['"]?[^'">]*$/.test(content.slice(0, content.indexOf(url)))) return url;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
    content = content.replace(/\*\*(.*?)\*\*|\*(.*?)\*/g, '<strong>$1$2</strong>');
    content = content.replace(/^\/\n([\s\S]*?)\n\/$/gm, (match, code) => {
      return `<div class="code-wrapper"><pre><code>${code}</code></pre><button class="copy-btn" aria-label="Copy code to clipboard">Copy Code</button></div>`;
    });
    content = content.replace(/"""([\s\S]*?).../g, (match, code) => {
      return `<div class="code-wrapper"><pre><code>${code}</code></pre><button class="copy-btn" aria-label="Copy code to clipboard">Copy Code</button></div>`;
    });
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<div class="code-wrapper"><pre><code class="language-${lang || 'text'}">${code}</code></pre><button class="copy-btn" aria-label="Copy code to clipboard">Copy Code</button></div>`;
    });
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
    if (!isHistoryLoaded) fetchChatHistory();
  });

  socket.on('reconnect', (attempt) => {
    console.log(`✅ Reconnected after ${attempt} attempts`);
    socket.emit('auth', { user });
    socket.emit('chat message2', { user });
    fetchFriendRequests();
  });

  socket.on('error', ({ message }) => {
    console.error('Socket error:', message);
    alert(`Socket Error: ${message}`);
  });

  socket.on('ai message', ({ type, username, message, timestamp }) => {
    console.log('Received AI message:', { type, username, message, timestamp });
    type.innerText = '';
    addMessage({ type, username, message, timestamp }, username === user);
  });

  socket.on('wiki message', ({ username, reply, timestamp }) => {
    console.log('Received wiki message:', { username, reply, timestamp });
    type.innerText = '';
    addMessage({ type: 'msg', username, message: reply, timestamp }, false);
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

// Fetch AI chat history
async function fetchChatHistory(retries = 3) {
  if (!ins || isHistoryLoaded) return;
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'message other';
  loadingMsg.textContent = `Loading AI chat history...`;
  ins.appendChild(loadingMsg);
  ins.scrollTop = ins.scrollHeight;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`/chat_history?type=msg&user1=${encodeURIComponent(user)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      loadingMsg.remove();

      if (response.ok && Array.isArray(data.messages)) {
        data.messages.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
        data.messages.forEach(msg => {
          addMessage({
            type: 'msg',
            username: msg.username,
            message: msg.message,
            timestamp: msg.timestamp
          }, msg.username === user);
          if (msg.reply) {
            addMessage({
              type: 'msg',
              username: 'Hina',
              message: msg.reply,
              timestamp: msg.timestamp
            }, false);
          }
        });
        isHistoryLoaded = true;
        return;
      } else {
        throw new Error(`Invalid AI history response: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error(`Attempt ${attempt} failed to fetch AI history:`, err.message);
      if (attempt === retries) {
        loadingMsg.textContent = `Failed to load AI history after ${retries} attempts.`;
        setTimeout(() => loadingMsg.remove(), 3000);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
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

  if (msg_box === '/custom') {
    ins.innerHTML += `<div class="message other"><div class="command-example">Hey ${name1}, adding custom prompts is coming soon!</div></div>`;
    input.value = '';
    return;
  }

  if (msg_box === '/n') {
    alert(`Logged in as: ${name1} (${user})`);
    input.value = '';
    return;
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
    ins.innerHTML = '';
    loadedMessages.clear();
    isHistoryLoaded = false;
    input.value = '';
    joiner.innerHTML = `${name1} joined, welcome to chat!`;
    ins.innerHTML += `<div class="message other"><div class="command-example">Hey ${name1}, how are you? Enter "/" to see commands!</div></div>`;
    return;
  } else if (msg_box === '/wiki') {
    const for_wiki = prompt('What do you want to ask Wiki?')?.trim();
    if (!for_wiki) return;
    const wikiMsg = {
      type: 'msg',
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
        body: JSON.stringify({ msg: for_wiki, user, username: user, name: name1 }),
      });
      const data = await response.json();
      if (response.ok && data.reply) {
        /*addMessage({
          type: 'msg',
          username: 'Hina',
          message: data.reply,
          timestamp: new Date().toISOString()
        }, false);*/
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
    if (friend === name1) {
      alert("Oops, you can't invite yourself!");
      input.value = '';
      return;
    }
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

  if (msg_box.startsWith('/')) {
    alert('Model-specific prompts are not supported in this version. Use /m to see details.');
    input.value = '';
    return;
  }

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
    const response = await fetch(`/msghome?user=${encodeURIComponent(user)}&name=${encodeURIComponent(name1)}&msg=${encodeURIComponent(msg_box)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
    const response2 = await fetch('/msghome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg: msg_box, user, username: user, name: name1 }),
    });
    const data2 = await response2.json();
    if (response2.ok && data2.reply) {
     /* addMessage({
        type: 'msg',
        username: 'Hina',
        message: data2.reply,
        timestamp: new Date().toISOString()
      }, false);*/
    } else {
      console.error('AI error:', { status: response2.status, data: data2 });
      alert(`AI Error: ${data2.error || 'Failed to get AI response.'}`);
    }
  } catch (err) {
    console.error('AI fetch error:', err.message);
    //alert('Failed to get AI response. Please check your connection.');
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