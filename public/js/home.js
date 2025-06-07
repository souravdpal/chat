const socket = window.socket || io('/', { autoConnect: true });
const ins = document.getElementById('here');
const name1 = localStorage.getItem('name');
const user = localStorage.getItem('user');
const way = document.getElementById('btn');
const input = document.getElementById('take');
const joiner = document.getElementById('join');
const themeToggleBtn = document.getElementById('themeToggleBtn');

if (!ins) {
  console.error('Element with ID "here" not found in the DOM.');
  alert('Error: Missing required DOM element "here". Please check the HTML structure.');
  throw new Error('Missing DOM element: here');
}

// Theme Handling
themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const icon = themeToggleBtn.querySelector('i');
  icon.classList.toggle('fa-moon');
  icon.classList.toggle('fa-sun');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});

const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleBtn.querySelector('i').classList.replace('fa-moon', 'fa-sun');
  } else {
    document.body.classList.remove('dark-mode');
    themeToggleBtn.querySelector('i').classList.replace('fa-sun', 'fa-moon');
  }
}

// Available models
const avail_models = [
  "server: **note: models are not available in this version, but you can use them in the future**",
  "**because we have Hina and she is working fine in every aspect, we will soon add task-specific models**"
];

const loadedMessages = new Set();
let isHistoryLoaded = false;

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

// Word-by-Word Typing Animation for Plain Text
function typeMessage(element, words, callback) {
  let index = 0;

  function typeWord() {
    if (index < words.length) {
      element.innerHTML += (index > 0 ? ' ' : '') + words[index];
      index++;
      ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
      setTimeout(typeWord, 100); // 100ms delay per word
    } else if (callback) {
      callback();
    }
  }

  typeWord();
}

// Fallback for copying text when Clipboard API is unavailable
function copyTextFallback(content, copyButton) {
  const textArea = document.createElement('textarea');
  textArea.value = content;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    copyButton.textContent = 'Copied!';
    copyButton.classList.add('copied');
    setTimeout(() => {
      copyButton.textContent = 'Copy Code';
      copyButton.classList.remove('copied');
    }, 2000);
  } catch (err) {
    copyButton.textContent = 'Copy Failed';
    console.error('Fallback copy failed:', err);
  } finally {
    document.body.removeChild(textArea);
  }
}

// Display Message with HTML Parsing
function displayMessage(messageElement, content, isCode = false, skipAnimation = false) {
  if (isCode) {
    const container = document.createElement('div');
    container.className = 'code-block-container';

    const codeElement = document.createElement('div');
    codeElement.className = 'code-block';
    codeElement.textContent = content;

    const copyButton = document.createElement('button');
    copyButton.className = 'copy-code-btn';
    copyButton.textContent = 'Copy Code';
    copyButton.addEventListener('click', () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(content).then(() => {
          copyButton.textContent = 'Copied!';
          copyButton.classList.add('copied');
          setTimeout(() => {
            copyButton.textContent = 'Copy Code';
            copyButton.classList.remove('copied');
          }, 2000);
        }).catch(err => {
          console.error('Clipboard API failed:', err);
          copyTextFallback(content, copyButton);
        });
      } else {
        copyTextFallback(content, copyButton);
      }
    });

    container.appendChild(codeElement);
    container.appendChild(copyButton);
    messageElement.appendChild(container);
  } else {
    // Parse content to separate HTML elements and plain text
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${content}</div>`, 'text/html');
    const segments = [];
    let currentText = '';

    doc.body.firstChild.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        currentText += node.textContent;
      } else {
        if (currentText.trim()) {
          segments.push({ type: 'text', content: currentText.trim() });
          currentText = '';
        }
        const div = document.createElement('div');
        div.appendChild(node.cloneNode(true));
        segments.push({ type: 'html', content: div.innerHTML });
      }
    });

    if (currentText.trim()) {
      segments.push({ type: 'text', content: currentText.trim() });
    }

    // Render segments
    let index = 0;
    function renderSegment() {
      if (index >= segments.length) {
        return;
      }

      const segment = segments[index];
      const span = document.createElement('span');
      messageElement.appendChild(span);

      if (segment.type === 'text') {
        if (skipAnimation) {
          // Render text directly without animation
          span.textContent = segment.content;
          ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
          index++;
          renderSegment();
        } else {
          // Apply word-by-word animation
          const words = segment.content.split(' ');
          typeMessage(span, words, () => {
            index++;
            renderSegment();
          });
        }
      } else {
        span.innerHTML = segment.content;
        ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
        index++;
        setTimeout(renderSegment, 100);
      }
    }

    renderSegment();
  }
}

function processHinaResponse(hinaMessage, content, callback, skipAnimation = false) {
  let reply = content.replace(/^Hina: Hina: Sir, Hello, sir!\s*/, 'Hina: ');
  reply = reply.replace(/<strong>(.*?)<\/strong>/g, '<b>$1</b>');
  reply = reply.replace(/\*(.*?)\*/g, '<i>$1</i>');
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  reply = reply.replace(/It's a lovely evening/g, `It's ${currentTime} IST on June 07, 2025`);
  reply = reply.replace(/href="([^"]+)"\s*target="_blank"(?:\s*rel="noopener noreferrer")*>([^<]+)(?=!?)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>');
  const urlRegex = /(https?:\/\/[^\s<]+|[a-zA-Z0-9-]+\.github\.io\/[^\s<]*)(?![^<]*>|[^<>]*<\/a>)/g;
  reply = reply.replace(urlRegex, url => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
  reply = reply.replace(/\* ([^\*]+)(?=\n|$)/g, '<li>$1</li>');
  reply = reply.replace(/(<li>[^\*]+<\/li>)/g, '<ul>$1</ul>');
  reply = reply.replace(/<\/ul>\s*<ul>/g, '');

  const codeBlockRegex = /```([\s\S]*?)```/g;
  const parts = reply.split(codeBlockRegex);
  const messageBubble = hinaMessage;
  let index = 0;

  function processPart() {
    if (index >= parts.length) {
      callback?.();
      return;
    }

    const part = parts[index].trim();
    const isCode = index % 2 === 1;

    if (part) {
      displayMessage(messageBubble, part, isCode, skipAnimation);
      ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
    }

    index++;
    setTimeout(processPart, part && !isCode ? 500 : 0);
  }

  processPart();
}

function addMessage(msg, isUser, skipAnimation = false) {
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
  message.setAttribute('data-sender', sender);
  message.setAttribute('data-content', content);

  if (content.includes('here are list of commands')) {
    message.innerHTML = `
      <div>
        Ok, <strong>${name1}</strong>, here are the commands:
        <ul class="command-list">
          <li><span class="command">/CUSTOM</span> = add your custom prompts and make Hina what you like her to be!</li>
          <li><span class="command">/R</span> = Clear chat</li>
          <li><span class="command">/WIKI</span> = Wiki search</li>
          <li><span class="command">/SAVE</span> = Save chat</li>
          <li><span class="command">/INVITE</span> = Invite friend</li>
          <li><span class="command">/F</span> = Chat with friend</li>
          <li><span class="command">/M</span> = List models</li>
        </ul>
      </div>
    `;
  } else if (content === avail_models.join('\n')) {
    message.innerHTML = `
      <div>
        <ul class="command-list">
          ${avail_models.map(model => `<li><span class="message">${model}</span></li>`).join('')}
        </ul>
      </div>
    `;
  } else {
    if (sender === 'Hina') {
      processHinaResponse(message, content, () => {
        ins.scrollTop = ins.scrollHeight;
      }, skipAnimation);
    } else {
      message.innerHTML = `<div><strong>${sender}:</strong> </div>`;
      displayMessage(message.querySelector('div'), content, false, skipAnimation);
    }
  }

  ins.appendChild(message);
  ins.scrollTop = ins.scrollHeight;
}

if (!user || !name1) {
  alert('Please log in to continue.');
  window.location.href = '/page.html';
}

if (!ins || !way || !input || !joiner) {
  console.error('Missing DOM elements:', { ins, way, input, joiner });
  alert('Error in page setup. Please check the HTML structure.');
  throw new Error('Missing required DOM elements');
}

joiner.innerHTML = `${name1} joined, welcome to chat!`;
ins.innerHTML += `
  <div class="message other">
    <div>Hey ${name1}, how are you? Enter "/" to see commands!</div>
  </div>
`;

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
    if (!isHistoryLoaded) fetchChatHistory();
  });

  socket.on('error', ({ message }) => {
    console.error('Socket error:', message);
    alert(`Socket Error: ${message}`);
  });

  socket.on('ai message', ({ type, username, message, timestamp }) => {
    console.log('Received AI message:', { type, username, message, timestamp });
    addMessage({ type, username, message, timestamp }, username === user);
  });

  socket.on('wiki message', ({ username, reply, timestamp }) => {
    console.log('Received wiki message:', { username, reply, timestamp });
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

async function fetchChatHistory(retries = 3) {
  if (!ins || isHistoryLoaded) return;
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'message other';
  loadingMsg.innerHTML = `<div>Loading AI chat history...</div>`;
  ins.appendChild(loadingMsg);
  ins.scrollTop = ins.scrollHeight;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`/chat_history?type=msg&user1=${encodeURIComponent(user)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON, but received ${contentType || 'unknown content type'}`);
      }

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
          }, msg.username === user, true); // Skip animation for history messages
          if (msg.reply) {
            addMessage({
              type: 'msg',
              username: 'Hina',
              message: msg.reply,
              timestamp: msg.timestamp
            }, false, true); // Skip animation for history replies
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
        loadingMsg.innerHTML = `<div>Failed to load AI history after ${retries} attempts: ${err.message}</div>`;
        setTimeout(() => loadingMsg.remove(), 3000);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

function addFriendRequest(fr1) {
  const requestId = `req-${fr1.replace(/\s+/g, '_')}`;
  if (document.getElementById(requestId)) return;

  const acceptId = `accept-${fr1.replace(/\s+/g, '_')}`;
  const rejectId = `reject-${fr1.replace(/\s+/g, '_')}`;

  ins.innerHTML += `
    <div class="cleaner friend-request-container message other" id="${requestId}">
      <div>
        <span class="friend-request-text"><strong>${fr1}</strong> sent you a friend request.</span>
        <div class="friend-request-buttons">
          <button class="btn-accept" id="${acceptId}"><i class="fas fa-check"></i> Accept</button>
          <button class="btn-reject" id="${rejectId}"><i class="fas fa-times"></i> Reject</button>
        </div>
      </div>
    </div>
  `;

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

async function work() {
  const msg_box = input.value.trim();
  if (!msg_box) return;

  input.disabled = true;
  way.disabled = true;
  way.classList.add('loading');

  if (msg_box === '/CUSTOM') {
    ins.innerHTML += `<div class="message other"><div>Hey ${name1}, adding custom prompts is coming soon!</div></div>`;
    input.value = '';
    input.disabled = false;
    way.disabled = false;
    way.classList.remove('loading');
    return;
  }

  if (msg_box === '/N') {
    alert(`Logged in as: ${name1} (${user})`);
    input.value = '';
    input.disabled = false;
    way.disabled = false;
    way.classList.remove('loading');
    return;
  }

  if (msg_box === '/') {
    addMessage({
      type: 'other',
      message: 'here are list of commands',
      timestamp: new Date().toISOString()
    }, false);
    input.value = '';
    input.disabled = false;
    way.disabled = false;
    way.classList.remove('loading');
    return;
  } else if (msg_box === '/R') {
    ins.innerHTML = `
      <div class="notification" id="join">${name1} joined, welcome to chat!</div>
      <div class="message other">
        <div>Hey ${name1}, how are you? Enter "/" to see commands!</div>
      </div>
    `;
    loadedMessages.clear();
    isHistoryLoaded = false;
    input.value = '';
    input.disabled = false;
    way.disabled = false;
    way.classList.remove('loading');
    return;
  } else if (msg_box === '/WIKI') {
    const for_wiki = prompt('What do you want to ask Wiki?')?.trim();
    if (!for_wiki) {
      input.disabled = false;
      way.disabled = false;
      way.classList.remove('loading');
      return;
    }
    const wikiMsg = {
      type: 'msg',
      username: user,
      message: for_wiki,
      timestamp: new Date().toISOString()
    };
    addMessage(wikiMsg, true);
    input.value = '';

    try {
      const response = await fetch('/wiki_cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg: for_wiki, user, username: user, name: name1 }),
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
        console.error('Wiki error:', data);
        alert(`Wiki Error: ${data.error || 'Failed to get wiki response.'}`);
      }
    } catch (err) {
      console.error('Wiki fetch error:', err.message);
      alert('Failed to get wiki response.');
    } finally {
      input.disabled = false;
      way.disabled = false;
      way.classList.remove('loading');
    }
    return;
  } else if (msg_box === '/M') {
    input.value = '';
    addMessage({
      type: 'other',
      message: avail_models.join('\n'),
      timestamp: new Date().toISOString()
    }, false);
    input.disabled = false;
    way.disabled = false;
    way.classList.remove('loading');
    return;
  } else if (msg_box === '/INVITE') {
    const friend = prompt('Enter friend username to invite:')?.trim();
    if (!friend) {
      input.disabled = false;
      way.disabled = false;
      way.classList.remove('loading');
      return;
    }
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
    input.disabled = false;
    way.disabled = false;
    way.classList.remove('loading');
    return;
  } else if (msg_box === '/SAVE') {
    input.value = '';
    alert('This feature is coming soon.');
    input.disabled = false;
    way.disabled = false;
    way.classList.remove('loading');
    return;
  } else if (msg_box === '/F') {
    const friend = prompt('Enter friend username to chat with:')?.trim();
    if (!friend) {
      input.disabled = false;
      way.disabled = false;
      way.classList.remove('loading');
      return;
    }
    if (friend === name1) {
      alert("Oops, you can't invite yourself!");
      input.value = '';
      input.disabled = false;
      way.disabled = false;
      way.classList.remove('loading');
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
    input.disabled = false;
    way.disabled = false;
    way.classList.remove('loading');
    return;
  }

  if (msg_box.startsWith('/')) {
    alert('Model-specific prompts are not supported in this version. Use /M to see details.');
    input.value = '';
    input.disabled = false;
    way.disabled = false;
    way.classList.remove('loading');
    return;
  }

  // Send message to server and rely on Socket.IO for display
  input.value = '';

  try {
    const url = `/msghome?msg=${encodeURIComponent(msg_box)}&user=${encodeURIComponent(user)}&name=${encodeURIComponent(name1)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON, but received ${contentType || 'unknown content type'}`);
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`AI Error: ${data.error || 'Failed to get AI response.'}`);
    }
    // Message display is handled via Socket.IO 'ai message' event
  } catch (err) {
    console.error('AI fetch error:', err.message);
    const errorMessage = document.createElement('div');
    errorMessage.className = 'message ai';
    errorMessage.innerHTML = '<div></div>';
    ins.appendChild(errorMessage);
    displayMessage(errorMessage.querySelector('div'), `Hina: ${err.message} Try again later or visit <a href="https://hina-ai.onrender.com" target="_blank" rel="noopener noreferrer">~HINA</a>`);
    ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
  } finally {
    input.disabled = false;
    way.disabled = false;
    way.classList.remove('loading');
    input.focus();
  }
}

way.addEventListener('click', work);
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    work();
  }
});

// Handle sliding navbar and input box on mobile
let lastScrollTop = 0;
const navbar = document.querySelector('.navbar');
const chatInput = document.querySelector('.chat-input');
const chatMessages = document.querySelector('.chat-messages');

// Only apply sliding behavior on mobile (screen width <= 768px)
const isMobile = window.matchMedia("(max-width: 768px)").matches;

if (isMobile) {
  chatMessages.addEventListener('scroll', () => {
    let scrollTop = chatMessages.scrollTop;

    if (scrollTop > lastScrollTop) {
      // Scrolling down - hide navbar and input
      navbar.style.transform = 'translateY(-100%)';
      chatInput.style.transform = 'translateY(100%)';
    } else {
      // Scrolling up - show navbar and input
      navbar.style.transform = 'translateY(0)';
      chatInput.style.transform = 'translateY(0)';
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // Prevent negative scroll
  });
}

initSocket();