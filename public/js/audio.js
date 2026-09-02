/* global Peer */

let peer;
let localStream;
const connections = {};
let analyser;
let speakRaf;
let audioAllowed = false;
let audioCtx;

function resumeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch((e) => console.warn('AudioContext resume failed', e));
  }
}

// Global listener to un-suspend browser audio context on first user interaction
if (typeof window !== 'undefined') {
  ['click', 'touchstart', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, resumeAudioContext, { passive: true });
  });
}

async function initAudio(myId, socketInstance) {
  if (peer) return;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    setupAnalyser(localStream, myId);
  } catch (err) {
    console.warn('Microphone unavailable or permission denied:', err);
    return;
  }

  peer = new Peer(myId, {
    debug: 1,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
    },
  });

  peer.on('open', (id) => {
    console.log('PeerJS connected with ID:', id);
    if (socketInstance) {
      socketInstance.emit('peer:register', { peerId: id });
    }
  });

  peer.on('call', (call) => {
    if (!localStream) return;
    call.answer(localStream);
    call.on('stream', (remoteStream) => {
      playStream(call.peer, remoteStream);
    });
    call.on('error', (err) => console.warn('Peer call error:', err));
    connections[call.peer] = call;
  });

  peer.on('error', (err) => {
    console.warn('PeerJS error:', err);
  });
}

function setupAnalyser(stream, id) {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const el = document.getElementById(`speaking-${id}`);
      if (el) el.classList.toggle('active', avg > 18 && audioAllowed);
      speakRaf = requestAnimationFrame(tick);
    };
    tick();
  } catch (err) {
    console.warn('Audio analyser setup failed:', err);
  }
}

function callPeer(peerId) {
  if (!peer || !localStream || peerId === peer.id || connections[peerId]) return;
  try {
    const call = peer.call(peerId, localStream);
    if (!call) return;
    call.on('stream', (remoteStream) => playStream(peerId, remoteStream));
    call.on('error', (err) => console.warn('Call error to peer ' + peerId, err));
    connections[peerId] = call;
  } catch (e) {
    console.warn('Failed calling peer:', peerId, e);
  }
}

function playStream(peerId, stream) {
  let audio = document.getElementById(`audio-${peerId}`);
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = `audio-${peerId}`;
    audio.autoplay = true;
    audio.playsInline = true;
    audio.style.display = 'none';
    document.body.appendChild(audio);
  }
  audio.srcObject = stream;
  audio.muted = !audioAllowed;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // Retry playing on user gesture if autoplay policy blocked it initially
      const retry = () => {
        audio.play().catch(() => {});
        window.removeEventListener('click', retry);
        window.removeEventListener('touchstart', retry);
      };
      window.addEventListener('click', retry, { once: true });
      window.addEventListener('touchstart', retry, { once: true });
    });
  }
}

function setRemoteAudioMuted(muted) {
  document.querySelectorAll('audio[id^="audio-"]').forEach((el) => {
    el.muted = muted;
  });
}

function toggleMute(muted) {
  if (localStream) {
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }
}

function connectToAllPeers(peerIds) {
  (peerIds || []).forEach((id) => {
    if (peer && id !== peer.id && !connections[id]) {
      callPeer(id);
    }
  });
}

function setAudioPhase(on) {
  audioAllowed = on;
  resumeAudioContext();
  setRemoteAudioMuted(!on);
  toggleMute(!on);
}

function destroyAudio() {
  if (speakRaf) cancelAnimationFrame(speakRaf);
  Object.values(connections).forEach((c) => {
    try { c.close(); } catch (_) { /* ignore */ }
  });
  if (peer) {
    try { peer.destroy(); } catch (_) { /* ignore */ }
  }
  peer = null;
}
