const socket = window.socket || io('/', { autoConnect: true });
const ins = document.getElementById('here');
const name1 = localStorage.getItem('name');
const user = localStorage.getItem('user');
const way = document.getElementById('btn');
const input = document.getElementById('take');
const joiner = document.getElementById('join');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const voiceToggleBtn = document.getElementById('voiceToggleBtn');
const voiceSelect = document.getElementById('voiceSelect');
const scrollBtn = document.getElementById('scrollBtn');

console.log('localStorage values:', { user, name: name1 });

if (!ins || !way || !input || !joiner) {
  console.error('Missing DOM elements:', { ins, way, input, joiner });
  alert('Error: Missing required DOM elements.');
  throw new Error('Missing required DOM elements');
}

const verifiedUsers = ['~hina', '~sourav'];

// Initialize SpeechSynthesis for TTS
const synth = window.speechSynthesis;
let voicesLoaded = false;
let voices = [];
let autoTTS = localStorage.getItem('autoTTS') === 'true';
let selectedVoiceName = localStorage.getItem('selectedVoice') || '';

function loadVoices() {
  return new Promise((resolve, reject) => {
    voices = synth.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      console.log('Voices loaded:', voices.map(v => ({ name: v.name, lang: v.lang })));
      populateVoiceSelect();
      resolve(voices);
    } else {
      synth.onvoiceschanged = () => {
        voices = synth.getVoices();
        voicesLoaded = true;
        console.log('Voices loaded:', voices.map(v => ({ name: v.name, lang: v.lang })));
        populateVoiceSelect();
        resolve(voices);
      };
      setTimeout(() => {
        if (!voicesLoaded) {
          console.warn('Voices failed to load within 5 seconds.');
          reject(new Error('Voices not loaded'));
        }
      }, 5000);
    }
  });
}

function populateVoiceSelect() {
  if (!voiceSelect) return;
  voiceSelect.innerHTML = '<option value="">Select a voice</option>';
  const femaleVoices = voices.filter(voice => {
    const nameLower = voice.name.toLowerCase();
    return (
      voice.lang.startsWith('en') &&
      (nameLower.includes('female') ||
       nameLower.includes('woman') ||
       nameLower.includes('natural') ||
       ['Google UK English Female', 'Google US English', 'Microsoft Zira Online (Natural)', 'Microsoft Jenny Online (Natural)', 'Samantha'].includes(voice.name))
    );
  });
  femaleVoices.forEach(voice => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    if (voice.name === selectedVoiceName) option.selected = true;
    voiceSelect.appendChild(option);
  });
  if (femaleVoices.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No female voices available';
    option.disabled = true;
    voiceSelect.appendChild(option);
  }
}

loadVoices().catch(err => console.error('Voice loading error:', err));

if (voiceSelect) {
  voiceSelect.addEventListener('change', () => {
    selectedVoiceName = voiceSelect.value;
    localStorage.setItem('selectedVoice', selectedVoiceName);
    console.log('Selected voice:', selectedVoiceName);
  });
}

function getFemaleVoice() {
  if (!voicesLoaded || voices.length === 0) {
    console.warn('Voices not loaded or unavailable.');
    return null;
  }

  const preferredVoices = [
    'Google UK English Female',
    'Google US English',
    'Microsoft Zira Online (Natural)',
    'Microsoft Jenny Online (Natural)',
    'Samantha'
  ];

  let femaleVoice = null;
  if (selectedVoiceName) {
    femaleVoice = voices.find(voice => voice.name === selectedVoiceName);
  }
  if (!femaleVoice) {
    femaleVoice = voices.find(voice => {
      const nameLower = voice.name.toLowerCase();
      return (
        preferredVoices.includes(voice.name) ||
        nameLower.includes('female') ||
        nameLower.includes('woman') ||
        (voice.lang.startsWith('en') && nameLower.includes('natural'))
      );
    });
  }
  if (!femaleVoice) {
    femaleVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    console.warn('No female voice found, using fallback:', femaleVoice?.name);
  }

  return femaleVoice || null;
}

function playTTS(text, playButton = null) {
  if (!text) return;
  if (!window.speechSynthesis) {
    console.error('SpeechSynthesis not supported in this browser.');
    alert('Text-to-speech is not supported in your browser.');
    return;
  }

  synth.cancel();
  if (!voicesLoaded) {
    console.warn('Voices not loaded, attempting to load.');
    loadVoices()
      .then(() => speak(text, playButton))
      .catch(() => {
        if (playButton) {
          playButton.innerHTML = '<i class="fas fa-play"></i>';
          playButton.setAttribute('aria-label', 'Play message as audio');
        }
        alert('Unable to load voices for text-to-speech.');
      });
  } else {
    speak(text, playButton);
  }
}

function speak(text, playButton) {
  const utterance = new SpeechSynthesisUtterance(text);
  const femaleVoice = getFemaleVoice();
  if (!femaleVoice) {
    console.error('No voices available for TTS.');
    alert('No suitable voice available for text-to-speech. Try Chrome or Edge.');
    if (playButton) {
      playButton.innerHTML = '<i class="fas fa-play"></i>';
      playButton.setAttribute('aria-label', 'Play message as audio');
    }
    return;
  }

  utterance.voice = femaleVoice;
  utterance.rate = 1.0;
  utterance.pitch = 1.3;
  utterance.volume = 1.0;

  utterance.onend = () => {
    if (playButton) {
      playButton.innerHTML = '<i class="fas fa-play"></i>';
      playButton.setAttribute('aria-label', 'Play message as audio');
    }
  };

  utterance.onerror = (event) => {
    console.error('TTS error:', event.error);
    if (playButton) {
      playButton.innerHTML = '<i class="fas fa-play"></i>';
      playButton.setAttribute('aria-label', 'Play message as audio');
    }
  };

  synth.speak(utterance);
  if (playButton) {
    playButton.innerHTML = '<i class="fas fa-stop"></i>';
    playButton.setAttribute('aria-label', 'Stop audio');
  }
}

// Scroll button functionality (mobile-only)
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function initScrollButton() {
  if (!scrollBtn || !ins) return;

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  if (isMobile) {
    scrollBtn.classList.add('mobile-only');
  } else {
    scrollBtn.classList.remove('mobile-only');
    scrollBtn.style.display = 'none';
    return;
  }

  const updateScrollButton = debounce(() => {
    const { scrollTop, scrollHeight, clientHeight } = ins;
    const isAtTop = scrollTop <= 10;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

    if (isAtTop && isAtBottom) {
      scrollBtn.style.display = 'none';
    } else {
      scrollBtn.style.display = 'flex';
      if (scrollTop + clientHeight / 2 < scrollHeight / 2) {
        scrollBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
        scrollBtn.setAttribute('aria-label', 'Scroll to bottom');
        scrollBtn.setAttribute('title', 'Scroll to bottom');
      } else {
        scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        scrollBtn.setAttribute('aria-label', 'Scroll to top');
        scrollBtn.setAttribute('title', 'Scroll to top');
      }
    }
  }, 100);

  ins.addEventListener('scroll', updateScrollButton);

  scrollBtn.addEventListener('click', () => {
    const { scrollTop, scrollHeight, clientHeight } = ins;
    if (scrollTop + clientHeight / 2 < scrollHeight / 2) {
      ins.scrollTo({ top: scrollHeight, behavior: 'smooth' });
    } else {
      ins.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Initial check
  updateScrollButton();

  // Handle window resize
  window.addEventListener('resize', () => {
    const isNowMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isNowMobile) {
      scrollBtn.classList.add('mobile-only');
      updateScrollButton();
    } else {
      scrollBtn.classList.remove('mobile-only');
      scrollBtn.style.display = 'none';
      ins.removeEventListener('scroll', updateScrollButton);
    }
  });
}

initScrollButton();

function renderUsername(username) {
  if (!username) return `<span><strong>Unknown</strong></span>`;
  const normalizedUsername = username.trim().toLowerCase();
  const isVerified = verifiedUsers.includes(normalizedUsername);
  const imagePath = 'h.png';
  if (username.toLowerCase() === 'hina') {
    return isVerified
      ? `<span class="hina-label verified-user">${username}<img src="${imagePath}" alt="Verified" class="verified-emoji" style="width:20px;height:20px;vertical-align:middle;margin-bottom:2px;"></span>`
      : `<span class="hina-label">${username}</span>`;
  }
  return isVerified
    ? `<span class="verified-user">${username}<img src="${imagePath}" alt="Verified" class="verified-emoji" style="width:20px;height:20px;vertical-align:middle;margin-bottom:2px;"></span>`
    : `<span><strong>${username}</strong></span>`;
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggleBtn.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-moon');
      icon.classList.toggle('fa-sun');
    }
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  });
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.body.classList.add('dark-mode');
  const icon = themeToggleBtn?.querySelector('i');
  if (icon) icon.classList.replace('fa-moon', 'fa-sun');
} else {
  document.body.classList.remove('dark-mode');
  const icon = themeToggleBtn?.querySelector('i');
  if (icon) icon.classList.replace('fa-sun', 'fa-moon');
}

if (voiceToggleBtn) {
  voiceToggleBtn.innerHTML = autoTTS ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
  voiceToggleBtn.setAttribute('aria-label', autoTTS ? 'Disable auto text-to-speech' : 'Enable auto text-to-speech');
  voiceToggleBtn.classList.toggle('active', autoTTS);

  voiceToggleBtn.addEventListener('click', () => {
    autoTTS = !autoTTS;
    localStorage.setItem('autoTTS', autoTTS);
    voiceToggleBtn.innerHTML = autoTTS ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    voiceToggleBtn.setAttribute('aria-label', autoTTS ? 'Disable auto text-to-speech' : 'Enable auto text-to-speech');
    voiceToggleBtn.classList.toggle('active', autoTTS);
  });
}

const avail_models = [
  "server: *note: models are not available in this version*",
  "*Hina is working fine in every aspect, more models coming soon!*"
];

const loadedMessages = new Set();
let isHistoryLoaded = false;

function generateMessageId(msg) {
  const { timestamp, username, message, reply } = msg;
  const content = message || reply || '';
  return `${new Date(timestamp || Date.now()).toISOString()}|${username || 'unknown'}|${content}`;
}

function personalizeText(text, name1 = 'user') {
  if (!text) return '';

  const tempDiv = document.createElement('div');
  tempDiv.textContent = text;

  let result = tempDiv.innerHTML;

  result = result.replace(/{{user}}|{user}|user/gi, name1);

  result = result.replace(
    /\b(https?:\/\/)([^\s<>"']+)/gi,
    (match, protocol, url) => `<a href="https://${url}" target="_blank" rel="noopener noreferrer">https://${url}</a>`
  );

  result = result.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');

  result = result.replace(/{{2,}([^{}]+)}{2,}/g, '$1')
                 .replace(/{+([^{}]+)}+/g, '$1');

  result = result.replace(/href="[^"]*ಸಾಕಾರಿತಕ್ಕೆ href="[^"]*"/gi, '')
                 .replace(/target="_blank"/gi, '')
                 .replace(/rel="noopener noreferrer"/gi, '')
                 .replace(/<[a-zA-Z/][^>]*>/g, '');

  result = result.replace(
    /\b(https?:\/\/)([^\s<>"']+)/gi,
    (match, protocol, url) => `<a href="https://${url}" target="_blank" rel="noopener noreferrer">https://${url}</a>`
  );

  return result;
}

function typeMessage(element, words, callback) {
  let index = 0;
  function typeWord() {
    if (index < words.length) {
      element.innerHTML += (index > 0 ? ' ' : '') + words[index];
      index++;
      ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
      setTimeout(typeWord, 100);
    } else if (callback) {
      callback();
    }
  }
  typeWord();
}

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

function autoDetectLang(content) {
  if (/^\s*(import|def|class|from)\b/.test(content)) return 'python';
  if (/^\s*(fun|class|val|var)\b/.test(content)) return 'kotlin';
  return 'plaintext';
}

function displayMessage(messageElement, content, isCode = false, language = '', skipAnimation = false) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  const plainText = tempDiv.textContent;

  const container = document.createElement('div');
  container.className = 'message-content-container';

  if (isCode) {
    const codeContainer = document.createElement('div');
    codeContainer.className = 'code-block-container';
    const pre = document.createElement('pre');
    pre.setAttribute('data-lang', language || autoDetectLang(content));
    const code = document.createElement('code');
    code.className = `language-${language || 'plaintext'}`;
    code.textContent = content;
    pre.appendChild(code);
    codeContainer.appendChild(pre);
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-code-btn';
    copyButton.textContent = 'Copy Code';
    copyButton.setAttribute('aria-label', 'Copy code to clipboard');
    copyButton.addEventListener('click', () => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(content).then(() => {
          copyButton.textContent = 'Copied!';
          copyButton.classList.add('copied');
          setTimeout(() => {
            copyButton.textContent = 'Copy Code';
            copyButton.classList.remove('copied');
          }, 2000);
        }).catch(() => {
          copyTextFallback(content, copyButton);
        });
      } else {
        copyTextFallback(content, copyButton);
      }
    });
    codeContainer.appendChild(copyButton);
    container.appendChild(codeContainer);
    if (window.hljs) hljs.highlightElement(code);
  } else {
    const span = document.createElement('div');
    span.style.marginBottom = '8px';
    if (skipAnimation || /<a\s+href=/i.test(content)) {
      span.innerHTML = content;
      container.appendChild(span);
    } else {
      typeMessage(span, content.split(/(?=\s)/), () => {
        ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
      });
      container.appendChild(span);
    }
  }

  if (plainText.trim() && !autoTTS) {
    const playButton = document.createElement('button');
    playButton.className = 'tts-play-btn';
    playButton.innerHTML = '<i class="fas fa-play"></i>';
    playButton.setAttribute('aria-label', 'Play message as audio');
    playButton.addEventListener('click', () => {
      if (synth.speaking) {
        synth.cancel();
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        playButton.setAttribute('aria-label', 'Play message as audio');
      } else {
        playTTS(plainText, playButton);
      }
    });
    container.appendChild(playButton);
  }

  messageElement.appendChild(container);
  if (!skipAnimation) {
    ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
  }

  return plainText.trim();
}

function processHinaResponse(hinaMessage, content, callback, skipAnimation = false) {
  let reply = content.replace(/^Hina: Hina: Sir, Hello, sir!\s*/, 'Hina: ');
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  reply = reply.replace(/It's a lovely evening/g, `It's ${currentTime} IST on June 12, 2025`);

  const parts = [];
  const codeBlockRegex = /(?:```|''')(\w+)?\n([\s\S]*?)\n(?:```|''')/g;
  let lastIndex = 0;
  let codeMatch;

  while ((codeMatch = codeBlockRegex.exec(reply)) !== null) {
    const lang = codeMatch[1]?.toLowerCase() || autoDetectLang(content);
    const codeContent = codeMatch[2].trim();

    if (codeMatch.index > lastIndex) {
      const textBefore = reply.substring(lastIndex, codeMatch.index).trim();
      if (textBefore) parts.push({ type: 'text', content: personalizeText(textBefore, name1) });
    }

    parts.push({ type: 'code', language: lang, content: codeContent });
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < reply.length) {
    const remainingText = reply.substring(lastIndex).trim();
    if (remainingText) parts.push({ type: 'text', content: personalizeText(remainingText, name1) });
  }

  const finalParts = [];
  const pointerRegex = /^\*\s+([^\n]*)/gm;

  parts.forEach(part => {
    if (part.type === 'code') {
      finalParts.push(part);
    } else {
      let text = part.content;
      let pointerMatch;
      let lastPointerIndex = 0;

      while ((pointerMatch = pointerRegex.exec(text)) !== null) {
        if (pointerMatch.index > lastPointerIndex) {
          const before = text.slice(lastPointerIndex, pointerMatch.index).trim();
          if (before) finalParts.push({ type: 'text', content: before });
        }
        finalParts.push({ type: 'pointer', content: personalizeText(pointerMatch[1].trim(), name1) });
        lastPointerIndex = pointerMatch.index + pointerMatch[0].length;
      }

      if (lastPointerIndex < text.length) {
        const after = text.slice(lastPointerIndex).trim();
        if (after) finalParts.push({ type: 'text', content: after });
      }
    }
  });

  let index = 0;
  const ttsTextParts = [];

  function processPart() {
    if (index >= finalParts.length) {
      if (autoTTS && ttsTextParts.length > 0) {
        playTTS(ttsTextParts.join(' '));
      }
      callback?.();
      return;
    }
    const part = finalParts[index];
    if (part.type === 'pointer') {
      const pointerDiv = document.createElement('div');
      pointerDiv.className = 'hina-pointer';
      pointerDiv.innerHTML = part.content;
      hinaMessage.appendChild(pointerDiv);
      ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
      if (autoTTS) ttsTextParts.push(part.content.replace(/<[^>]+>/g, ''));
      index++;
      setTimeout(processPart, 100);
    } else if (part.type === 'code') {
      displayMessage(hinaMessage, part.content, true, part.language, skipAnimation);
      ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
      index++;
      setTimeout(processPart, 0);
    } else {
      const plainText = displayMessage(hinaMessage, part.content, false, '', skipAnimation);
      ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
      if (autoTTS && plainText) ttsTextParts.push(plainText.replace(/<[^>]+>/g, ''));
      index++;
      setTimeout(processPart, part.content ? 500 : 0);
    }
  }
  processPart();
}

function addFriendRequest(from) {
  const existingRequest = document.querySelector(`.friend-request-container[data-from="${from}"]`);
  if (existingRequest) return;
  const container = document.createElement('div');
  container.className = 'friend-request-container';
  container.setAttribute('data-from', from);
  container.innerHTML = `
    <span class="friend-request-text">Friend request from ${renderUsername(from)}</span>
    <div class="friend-request-buttons">
      <button class="btn-accept">Accept</button>
      <button class="btn-reject">Reject</button>
    </div>
  `;
  ins.appendChild(container);
  ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
  container.querySelector('.btn-accept').addEventListener('click', () => {
    socket.emit('acceptFriendRequest', { from, to: user });
    container.remove();
    alert(`Friend request from ${from} accepted!`);
  });
  container.querySelector('.btn-reject').addEventListener('click', () => {
    socket.emit('rejectFriendRequest', { from, to: user });
    container.remove();
  });
}

function addMessage(msg, isUser, skipAnimation = false) {
  if (!msg) return;
  if (typeof msg.message === 'string') msg.message = personalizeText(msg.message, name1);
  if (typeof msg.reply === 'string') msg.reply = personalizeText(msg.reply, name1);
  const messageId = generateMessageId(msg);
  if (loadedMessages.has(messageId)) return;
  loadedMessages.add(messageId);
  const message = document.createElement('div');
  const chatType = msg.type || 'other';
  const sender = isUser ? name1 : msg.username || msg.from || 'Hina';
  let content = msg.reply || msg.message || '';
  if (chatType === 'personalchat') return;
  message.className = `message ${isUser ? 'user' : sender === 'Hina' ? 'ai' : 'other'}`;
  message.setAttribute('data-sender', sender);
  message.setAttribute('data-content', content);
  if (content.includes('here are list of commands')) {
    message.innerHTML = `
      <div>
        <div class="command-header">${name1}, 💡 Here's what you can do:</div>
        <div class="hina-pointer"><span class="command">/CUSTOM</span> = Add custom prompts!</div>
        <div class="hina-pointer"><span class="command">/R</span> = Clear chat</div>
        <div class="hina-pointer"><span class="command">/WIKI</span> = Wiki search</div>
        <div class="hina-pointer"><span class="command">/SAVE</span> = Save chat</div>
        <div class="hina-pointer"><span class="command">/INVITE</span> = Invite friend</div>
        <div class="hina-pointer"><span class="command">/F</span> = Chat with friend</div>
        <div class="hina-pointer"><span class="command">/M</span> = List models</div>
      </div>
    `;
  } else if (content === avail_models.join('\n')) {
    message.innerHTML = `
      <div>
        ${avail_models.map(model => `<div class="hina-pointer"><span class="message">${model}</span></div>`).join('')}
      </div>
    `;
  } else {
    message.innerHTML = `<div>${renderUsername(sender)}: </div>`;
    if (sender === 'Hina') {
      processHinaResponse(message, content, () => {
        ins.scrollTop = ins.scrollHeight;
      }, skipAnimation);
    } else {
      displayMessage(message.querySelector('div'), content, false, '', skipAnimation);
    }
  }
  ins.appendChild(message);
  ins.scrollTop = ins.scrollHeight;
}

if (!user || !name1) {
  alert('Please log in to continue.');
  window.location.href = '/login';
  throw new Error('User not authenticated');
}

joiner.innerHTML = `${renderUsername(name1)} joined, welcome to chat!`;
ins.innerHTML += `
  <div class="message other">
    <div>Hey ${renderUsername(name1)}, how are you? Enter "/" to see commands!</div>
  </div>
`;

function setActiveNavLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });
}

function initSocket() {
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    socket.emit('auth', { user, name: name1 });
    socket.emit('chat message2', { user });
    fetchFriendRequests();
    if (!isHistoryLoaded) fetchChatHistory();
    setActiveNavLink();
  });
  socket.on('reconnect', (attempt) => {
    console.log(`✅ Reconnected after ${attempt} attempts`);
    socket.emit('auth', { user, name: name1 });
    socket.emit('chat message2', { user });
    fetchFriendRequests();
    if (!isHistoryLoaded) fetchChatHistory();
    setActiveNavLink();
  });
  socket.on('error', ({ message }) => {
    console.error('Socket error:', message);
    const errorMessage = document.createElement('div');
    errorMessage.className = 'message other';
    errorMessage.innerHTML = `<div>Socket Error: ${message}. Please try again later.</div>`;
    ins.appendChild(errorMessage);
    ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
  });
  socket.on('ai message', ({ type, username, message, timestamp }) => {
    const displayUsername = username === user ? name1 : username;
    addMessage({ type, username: displayUsername, message, timestamp }, username === user);
  });
  socket.on('wiki message', ({ username, reply, timestamp }) => {
    const displayUsername = username === user ? name1 : username;
    addMessage({ type: 'msg', username: displayUsername, message: reply, timestamp }, false);
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
  loadingMsg.className = 'message other loading';
  loadingMsg.innerHTML = `<div>Loading chat history... <span class="spinner"></span></div>`;
  ins.appendChild(loadingMsg);
  ins.scrollTop = ins.scrollHeight;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`/chat_history?type=msg&user1=${encodeURIComponent(user)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (Array.isArray(data.messages)) {
        loadingMsg.remove();
        data.messages.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
        for (const msg of data.messages) {
          const displayUsername = msg.username === user ? name1 : msg.username;
          if (msg.message) {
            addMessage(
              { type: 'msg', username: displayUsername, message: msg.message, timestamp: msg.timestamp },
              msg.username === user,
              true
            );
          }
          if (msg.reply) {
            addMessage(
              { type: 'msg', username: 'Hina', reply: msg.reply, timestamp: msg.timestamp },
              false,
              true
            );
          }
        }
        isHistoryLoaded = true;
        return;
      }
    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message);
      if (attempt === retries) {
        loadingMsg.innerHTML = `<div>Failed to load chat history: ${err.message}.</div>`;
        setTimeout(() => loadingMsg.remove(), 5000);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
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
    }
  } catch (err) {
    console.error('Error fetching friend requests:', err.message);
    const errorMessage = document.createElement('div');
    errorMessage.className = 'message other';
    errorMessage.innerHTML = `<div>Failed to fetch friend requests: ${err.message}.</div>`;
    ins.appendChild(errorMessage);
    ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
  }
}

async function work() {
  const msg_box = input.value.trim();
  if (!msg_box) return;
  input.disabled = true;
  way.disabled = true;
  way.classList.add('loading');
  try {
    if (msg_box === '/CUSTOM') {
      ins.innerHTML += `<div class="message other"><div>Hey ${renderUsername(name1)}, custom prompts coming soon!</div></div>`;
      input.value = '';
      return;
    }
    if (msg_box === '/N') {
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
    }
    if (msg_box === '/R') {
      ins.innerHTML = `
        <div class="notification" id="join">${renderUsername(name1)} joined, welcome to chat!</div>
        <div class="message other">
          <div>Hey ${renderUsername(name1)}, how are you? Enter "/" to see commands!</div>
        </div>
      `;
      loadedMessages.clear();
      isHistoryLoaded = false;
      fetchChatHistory();
      input.value = '';
      return;
    }
    if (msg_box === '/WIKI') {
      const for_wiki = prompt('What do you want to ask Wiki?')?.trim();
      if (!for_wiki) return;
      const wikiMsg = {
        type: 'msg',
        username: name1,
        message: for_wiki,
        timestamp: new Date().toISOString()
      };
      addMessage(wikiMsg, true);
      input.value = '';
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
        alert(`Wiki Error: ${data.error || 'Failed to get wiki response.'}`);
      }
      return;
    }
    if (msg_box === '/M') {
      input.value = '';
      addMessage({
        type: 'other',
        message: avail_models.join('\n'),
        timestamp: new Date().toISOString()
      }, false);
      return;
    }
    if (msg_box === '/INVITE') {
      const friend = prompt('Enter friend username to invite:')?.trim();
      if (!friend) return;
      const response = await fetch(`/initiate?user=${encodeURIComponent(user)}&to=${encodeURIComponent(friend)}&mode=text`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        alert(`Invitation sent to ${friend}.`);
      } else {
        alert(`Error: ${data.error || 'Failed to send invitation.'}`);
      }
      input.value = '';
      return;
    }
    if (msg_box === '/SAVE') {
      input.value = '';
      alert('This feature is coming soon.');
      return;
    }
    if (msg_box === '/F') {
      const friend = prompt('Enter friend username to chat with:')?.trim();
      if (!friend) return;
      if (friend === name1) {
        alert("Oops, you can't invite yourself!");
        input.value = '';
        return;
      }
      const response = await fetch(`/initiate?user=${encodeURIComponent(user)}&to=${encodeURIComponent(friend)}&mode=text`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        window.location.href = `/text.html?to=${encodeURIComponent(friend)}`;
      } else {
        alert(`Error: ${data.error || 'Failed to initiate chat.'}`);
      }
      input.value = '';
      return;
    }
    if (msg_box.startsWith('/')) {
      alert('Model-specific prompts are not supported. Use /M to see details.');
      input.value = '';
      return;
    }
    input.value = '';
    const url = `/msghome?msg=${encodeURIComponent(msg_box)}&user=${encodeURIComponent(user)}&name=${encodeURIComponent(name1)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`AI Error: ${data.error || 'Failed to get AI response.'}`);
    }
    if (data.message) {
      addMessage({
        type: 'msg',
        username: 'Hina',
        message: data.message,
        timestamp: new Date().toISOString()
      }, false);
    }
  } catch (err) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'message ai';
    errorMessage.innerHTML = '<div></div>';
    ins.appendChild(errorMessage);
    displayMessage(errorMessage.querySelector('div'), `HINA: ${err.message} Try again later or visit <a href="https://hina-ai.onrender.com" target="_blank" rel="noopener noreferrer">~HINA</a>`);
    ins.scrollTo({ top: ins.scrollHeight, behavior: 'smooth' });
  } finally {
    input.disabled = false;
    way.disabled = false;
    way.classList.remove('loading');
    input.focus();
  }
}

if (way) way.addEventListener('click', work);
if (input) {
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      work();
    }
  });
}

const isMobile = window.matchMedia("(max-width: 768px)").matches;
if (isMobile) {
  const navbar = document.querySelector('.navbar');
  const chatInput = document.querySelector('.chat-input');
  const chatMessages = document.querySelector('.chat-messages');
  let lastScrollTop = 0;
  let isScrolling;
  if (chatMessages) {
    chatMessages.addEventListener('scroll', () => {
      clearTimeout(isScrolling);
      isScrolling = setTimeout(() => {
        let scrollTop = chatMessages.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 100) {
          if (navbar) navbar.style.transform = 'translateY(-100%)';
          if (chatInput) chatInput.style.transform = 'translateY(100%)';
        } else {
          if (navbar) navbar.style.transform = 'translateY(0)';
          if (chatInput) chatInput.style.transform = 'translateY(0)';
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
      }, 150);
    });
  }
}

initSocket();