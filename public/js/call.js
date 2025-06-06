const userName = localStorage.getItem('user')?.toLowerCase();
if (!userName) {
  console.warn('No user found in localStorage');
  window.location.href = 'login.html';
}
alert('sorry but calling feature not ready yet!')
// Initialize Socket.IO with the correct ngrok URL
const socket = io(' https://hina-ai.onrender.com', { // Update to the latest ngrok URL
  transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  extraHeaders: {
    'ngrok-skip-browser-warning': 'true',
  },
});

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
let iceTimeout;
let isNegotiating = false; // Flag to track negotiation state

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const toUser = urlParams.get('to')?.toLowerCase();
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

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message, err.stack);
    alert('Failed to connect to server. Check network, server status, or ngrok tunnel.');
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
    if (to.toLowerCase() !== userName) return;
    console.log(`Received offer from ${from}, SDP:`, offer.sdp);
    try {
      peerConnection = createPeerConnection();
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localAudio.srcObject = localStream;
      localAudio.muted = true;
      localAudio.volume = 1.0;
      localStream.getAudioTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
        console.log('Added local track:', track, 'Enabled:', track.enabled);
      });
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', { from: userName, to: from, answer });
      console.log(`Sending answer to ${from}, SDP:`, answer.sdp);
      callActive = true;
      updateUI();
      showStartAudioButton();
    } catch (err) {
      console.error('Error handling offer:', err.name, err.message);
      alert('Failed to process call. Check microphone permissions.');
      endCall();
    }
  });

  socket.on('answer', async ({ from, to, answer }) => {
    if (to.toLowerCase() !== userName) return;
    console.log(`Received answer from ${from}, SDP:`, answer.sdp);
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error handling answer:', err.name, err.message);
    }
  });

  socket.on('iceCandidate', async ({ from, to, candidate }) => {
    if (to.toLowerCase() !== userName) return;
    console.log(`Received ICE candidate from ${from}:`, candidate);
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error adding ICE candidate:', err.name, err.message);
    }
  });

  socket.on('endCall', ({ from, to }) => {
    if (to.toLowerCase() !== userName) return;
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
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  });

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      console.log('Sending ICE candidate:', candidate);
      socket.emit('iceCandidate', { from: userName, to: toUser, candidate });
    }
  };

  pc.ontrack = (event) => {
    console.log('Received remote track:', event.track, 'Stream:', event.streams[0]);
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteAudio.srcObject = remoteStream;
    }
    event.streams[0].getTracks().forEach((track) => {
      console.log('Adding remote track:', track, 'Enabled:', track.enabled);
      remoteStream.addTrack(track);
    });
    remoteAudio.muted = false;
    remoteAudio.volume = 1.0;
    remoteAudio.play().then(() => {
      console.log('Remote audio playing');
    }).catch((err) => {
      console.error('Remote audio play error:', err.name, err.message);
      showStartAudioButton();
    });
  };

  pc.oniceconnectionstatechange = () => {
    console.log('ICE Connection State:', pc.iceConnectionState);
    console.log('Signaling State:', pc.signalingState);
    if (pc.iceConnectionState === 'failed') {
      console.warn('ICE connection failed, restarting...');
      pc.restartIce();
    } else if (pc.iceConnectionState === 'disconnected') {
      console.warn('ICE disconnected');
      endCall();
    } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      console.log('ICE connection established successfully');
      clearTimeout(iceTimeout);
    }
  };

  pc.onnegotiationneeded = async () => {
    try {
      if (isNegotiating || pc.signalingState !== 'stable') {
        console.log('Negotiation already in progress or signaling state not stable, skipping...');
        return; // Skip if already negotiating or not in a stable state
      }
      isNegotiating = true;
      const offer = await pc.createOffer();
      console.log('Negotiation Offer SDP:', offer.sdp);
      await pc.setLocalDescription(offer);
      socket.emit('offer', { from: userName, to: toUser, offer });
      console.log(`Sending offer to ${toUser} on renegotiation`);
    } catch (err) {
      console.error('Negotiation error:', err.name, err.message);
    } finally {
      isNegotiating = false;
    }
  };

  pc.onsignalingstatechange = () => {
    console.log('Signaling State Changed:', pc.signalingState);
    isNegotiating = false; // Reset negotiating flag when signaling state stabilizes
  };

  return pc;
}

// Initiate call (caller only)
async function initiateCall() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInput = devices.find((device) => device.kind === 'audioinput');
    if (!audioInput) {
      throw new Error('No audio input device found');
    }
    console.log('Audio input device:', audioInput);

    peerConnection = createPeerConnection();
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localAudio.srcObject = localStream;
    localAudio.muted = true;
    localAudio.volume = 1.0;
    localStream.getAudioTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
      console.log('Added local track:', track, 'Enabled:', track.enabled);
    });
    const offer = await peerConnection.createOffer();
    console.log('Initial Offer SDP:', offer.sdp);
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { from: userName, to: toUser, offer });
    console.log(`Sending offer to ${toUser}`);
    callActive = true;
    updateUI();
    showStartAudioButton();

    iceTimeout = setTimeout(() => {
      if (peerConnection.iceConnectionState !== 'connected' && peerConnection.iceConnectionState !== 'completed') {
        console.error('ICE connection timed out');
        alert('Failed to establish call connection. Check network or try again.');
        endCall();
      }
    }, 30000);
  } catch (err) {
    console.error('Error initiating call:', err.name, err.message);
    alert(`Failed to start call: ${err.message}. Check microphone permissions and audio device.`);
    endCall();
  }
}

// End call
function endCall() {
  clearTimeout(iceTimeout);
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
    localAudio.srcObject = null;
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop());
    remoteStream = null;
    remoteAudio.srcObject = null;
  }
  callActive = false;
  isMuted = false;
  isNegotiating = false;
  updateUI();
  socket.emit('endCall', { from: userName, to: toUser });
  console.log('Call ended');
  setTimeout(() => {
    window.location.href = '/f';
  }, 500);
}

// Show manual start audio button
function showStartAudioButton() {
  if (document.getElementById('startAudio')) return;
  const startBtn = document.createElement('button');
  startBtn.id = 'startAudio';
  startBtn.textContent = 'Start Call Audio';
  startBtn.className = 'control-btn';
  try {
    document.querySelector('.call-controls').appendChild(startBtn);
  } catch (err) {
    console.error('Error appending start audio button:', err);
  }
  startBtn.onclick = () => {
    remoteAudio.muted = false;
    remoteAudio.volume = 1.0;
    remoteAudio.play().then(() => {
      console.log('Audio played manually');
      startBtn.remove();
    }).catch((err) => console.error('Manual play error:', err.name, err.message));
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
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
      console.log(`Microphone track enabled: ${track.enabled}`);
    });
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