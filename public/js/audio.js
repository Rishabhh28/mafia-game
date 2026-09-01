/* global Peer */

let peer;
let localStream;
const connections = {};
let analyser;
let speakRaf;
let audioAllowed = false;

async function initAudio(myId) {
  if (peer) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    setupAnalyser(localStream, myId);
  } catch (err) {
    console.warn('Microphone unavailable', err);
    return;
  }

  peer = new Peer(myId, { debug: 0 });
  peer.on('call', (call) => {
    if (!localStream) return;
    call.answer(localStream);
    call.on('stream', (stream) => playStream(call.peer, stream));
    connections[call.peer] = call;
  });
}

function setupAnalyser(stream, id) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
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
  } catch (_) { /* ignore */ }
}

function callPeer(peerId) {
  if (!peer || !localStream || peerId === peer.id || connections[peerId]) return;
  const call = peer.call(peerId, localStream);
  if (!call) return;
  call.on('stream', (stream) => playStream(peerId, stream));
  connections[peerId] = call;
}

function playStream(peerId, stream) {
  let audio = document.getElementById(`audio-${peerId}`);
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = `audio-${peerId}`;
    audio.autoplay = true;
    document.body.appendChild(audio);
  }
  audio.srcObject = stream;
  audio.muted = !audioAllowed;
}

function setRemoteAudioMuted(muted) {
  document.querySelectorAll('audio[id^="audio-"]').forEach((el) => {
    el.muted = muted;
  });
}

function toggleMute(muted) {
  if (localStream) localStream.getAudioTracks().forEach((t) => { t.enabled = !muted; });
}

function connectToAllPeers(peerIds) {
  (peerIds || []).forEach((id) => {
    if (peer && id !== peer.id && !connections[id]) callPeer(id);
  });
}

function setAudioPhase(on) {
  audioAllowed = on;
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
