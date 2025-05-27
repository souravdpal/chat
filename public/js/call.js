const userName = localStorage.getItem("user");
if (!userName) {
  console.warn('No user found in localStorage');
  window.location.href = 'login.html';
}
const socket = window.socket || io('/'); // Use shared socket or create new

// DOM elements
const localAudio = document.getElementById('localAudio');
const remoteAudio = document.getElementById('remoteAudio');
const callBtn = document.getElementById('callBtn');
const endBtn = document.getElementById('endBtn');
const muteBtn = document.getElementById('muteBtn');
const themeToggle = document.getElementById('themeToggle');

// WebRTC variables
let peerConnection;
let localStream;
let remoteStream;
let isMuted = false;
let callActive = false;

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const toUser = urlParams.get('to');
const isCallee = urlParams.get('opcode') === 'true';

if (!toUser) {
  console.error('No recipient specified in URL');
  alert('Invalid call. Redirecting...');
  window.location.href = 'friends.html';
}

// Initialize socket
function initSocket() {
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    socket.emit('auth', { user: userName });
    setupSocketEvents();
    if (!isCallee) initiateCall();
  });

  socket.on('reconnect', (attempt) => {
    console.log(`✅ Reconnected after ${attempt} attempts`);
    socket.emit('auth', { user: userName });
    if (!isCallee) initiateCall();
  });

  socket.on('error', ({ message }) => {
    console.error('Server error:', message);
    alert(`Error: ${message}`);
    endCall();
  });
}

// Set up socket event listeners
function setupSocketEvents() {
  socket.on('offer', async ({ from, to, offer }) => {
    if (to !== userName) return;
    console.log(`Received offer from ${from}`);
    try {
      peerConnection = createPeerConnection();
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localAudio.srcObject = localStream;
      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', { from: userName, to: from, answer });
      console.log(`Sending answer to ${from}`);
      callActive = true;
      updateUI();
    } catch (err) {
      console.error('Error handling offer:', err);
      alert('Failed to process call.');
      endCall();
    }
  });

  socket.on('answer', async ({ from, to, answer }) => {
    if (to !== userName) return;
    console.log(`Received answer from ${from}`);
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  });

  socket.on('iceCandidate', async ({ from, to, ice }) => {
    if (to !== userName) return;
    console.log(`Received ICE candidate from ${from}`);
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(ice));
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  });

  socket.on('endCall', ({ from, to }) => {
    if (to !== userName) return;
    console.log(`Call ended by ${from}`);
    endCall();
  });
}

// Create WebRTC peer connection
function createPeerConnection() {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN server if available
    ],
  });

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      console.log('Sending ICE candidate');
      socket.emit('iceCandidate', { from: userName, to: toUser, ice: candidate });
    }
  };

  pc.ontrack = (event) => {
    console.log('Received remote event:', event);
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteAudio.srcObject = remoteStream;
    }
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
      console.log('Remote audio stream added');
    });
    remoteAudio.play().catch((err) => {
      console.error('Remote audio play error:', err);
      showPlayButton();
    });
  };

  pc.oniceconnectionstatechange = () => {
    console.log('ICE Connection State:', pc.iceConnectionState);
    if (pc.iceConnectionState === 'failed') {
      console.warn('ICE connection failed, restarting...');
      pc.restartIce();
    } else if (pc.iceConnectionState === 'disconnected') {
      console.warn('ICE disconnected');
      endCall();
    }
  };

  pc.onnegotiationneeded = async () => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { from: userName, to: toUser, offer });
      console.log(`Sending offer to ${toUser} on renegotiation`);
    } catch (err) {
      console.error('Negotiation error:', err);
    }
  };

  return pc;
}

// Initiate call (caller only)
async function initiateCall() {
  try {
    peerConnection = createPeerConnection();
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localAudio.srcObject = localStream;
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { from: userName, to: toUser, offer });
    console.log(`Sending offer to ${toUser}`);
    callActive = true;
    updateUI();
  } catch (err) {
    console.error('Error initiating call:', err);
    alert('Failed to start call. Check microphone permissions.');
    endCall();
  }
}

// End call
function endCall() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop());
    remoteStream = null;
  }
  callActive = false;
  isMuted = false;
  updateUI();
  socket.emit('endCall', { from: userName, to: toUser });
  console.log('Call ended');
  setTimeout(() => {
    window.location.href = 'f.html';
  }, 500);
}

// Show manual play button for mobile audio
function showPlayButton() {
  if (document.getElementById('playAudio')) return;
  const playBtn = document.createElement('button');
  playBtn.id = 'playAudio';
  playBtn.textContent = 'Play Call Audio';
  playBtn.className = 'control-btn';
  document.querySelector('.call-controls').appendChild(playBtn);
  playBtn.onclick = () => {
    remoteAudio.play().then(() => {
      console.log('Audio played manually');
      playBtn.remove();
    }).catch((err) => console.error('Manual play error:', err));
  };
}

// Update UI based on call state
function updateUI() {
  callBtn.disabled = callActive || isCallee;
  endBtn.disabled = !callActive;
  muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
  muteBtn.disabled = !callActive;
}

// Event Listeners
callBtn.addEventListener('click', initiateCall);
endBtn.addEventListener('click', endCall);
muteBtn.addEventListener('click', () => {
  if (localStream) {
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach((track) => (track.enabled = !isMuted));
    muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    console.log(`Microphone ${isMuted ? 'muted' : 'unmuted'}`);
  }
});

themeToggle.addEventListener('click', () => {
  const themes = ['light', 'dark', 'cosmic'];
  let currentTheme = document.body.getAttribute('data-theme') || 'light';
  let nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
  document.body.setAttribute('data-theme', nextTheme);
  themeToggle.textContent = `Switch to ${themes[(themes.indexOf(nextTheme) + 1) % themes.length]} Theme`;
  localStorage.setItem('theme', nextTheme);
  console.log(`Switched to ${nextTheme} theme`);
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.setAttribute('data-theme', savedTheme);
themeToggle.textContent = `Switch to ${savedTheme === 'light' ? 'dark' : savedTheme === 'dark' ? 'cosmic' : 'light'} Theme`;

// Initialize
initSocket();