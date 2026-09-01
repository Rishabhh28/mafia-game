function initFactionChat(faction) {
  const panel = document.getElementById('faction-chat');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.classList.toggle('doctor', faction === 'doctor');
  const label = panel.querySelector('.faction-label');
  if (label) {
    label.textContent = faction === 'mafia' ? 'Mafia channel' : 'Doctor channel';
  }
}

function hideFactionChat() {
  const panel = document.getElementById('faction-chat');
  if (panel) panel.classList.add('hidden');
}

function appendFactionMessage(msg) {
  const box = document.getElementById('faction-messages');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'chat-msg';
  el.innerHTML = `<span class="chat-name">${escapeHtml(msg.name)}</span><span class="chat-text">${escapeHtml(msg.text)}</span>`;
  box.appendChild(el);
  el.scrollIntoView({ behavior: 'smooth' });
}

function clearFactionChat() {
  const box = document.getElementById('faction-messages');
  if (box) box.innerHTML = '';
}

function bindFactionChat(socket) {
  const send = document.getElementById('faction-send');
  const input = document.getElementById('faction-input');
  if (!send || !input) return;

  const submit = () => {
    const text = input.value.trim();
    if (!text || !GameState.role || GameState.role === 'innocent') return;
    socket.emit('faction:message', { faction: GameState.role, text });
    input.value = '';
  };

  send.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
}
