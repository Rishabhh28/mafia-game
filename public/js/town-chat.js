(function () {
  let socketRef = null;

  function formatTime(ts) {
    const d = ts ? new Date(ts) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function appendMessage(msg) {
    const box = document.getElementById('town-messages');
    if (!box) return;

    const el = document.createElement('div');
    const timeStr = formatTime(msg.ts);

    if (msg.system) {
      el.className = 'town-msg town-system-msg';
      el.innerHTML = `<span class="town-sys-icon">📣</span> <span class="town-text">${escapeHtml(msg.text)}</span> <span class="town-time">${timeStr}</span>`;
    } else {
      const isSelf = msg.playerId === GameState.playerId;
      const isGhost = msg.isGhost;
      el.className = `town-msg ${isSelf ? 'self-msg' : ''} ${isGhost ? 'ghost-msg' : ''}`;
      
      const badge = isGhost ? '<span class="ghost-badge">👻 Ghost</span>' : '';
      el.innerHTML = `
        <div class="town-msg-meta">
          <span class="town-name">${escapeHtml(msg.name)}</span>
          ${badge}
          <span class="town-time">${timeStr}</span>
        </div>
        <div class="town-text">${escapeHtml(msg.text)}</div>
      `;
    }

    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }

  function sendTownMessage() {
    const input = document.getElementById('town-input');
    if (!input || !socketRef) return;
    const text = input.value.trim();
    if (!text) return;

    socketRef.emit('town:chat:message', {
      text,
      isGhost: !GameState.isAlive,
    });
    input.value = '';
  }

  window.initTownChat = function (socket) {
    socketRef = socket;
    const sendBtn = document.getElementById('town-send');
    const input = document.getElementById('town-input');

    if (sendBtn && !sendBtn.dataset.bound) {
      sendBtn.dataset.bound = 'true';
      sendBtn.addEventListener('click', sendTownMessage);
    }

    if (input && !input.dataset.bound) {
      input.dataset.bound = 'true';
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendTownMessage();
      });
    }

    // Quick phrase chip buttons
    document.querySelectorAll('.quick-chip').forEach((chip) => {
      if (!chip.dataset.bound) {
        chip.dataset.bound = 'true';
        chip.addEventListener('click', () => {
          if (input) {
            input.value = chip.dataset.text || chip.textContent.trim();
            sendTownMessage();
          }
        });
      }
    });

    if (!socket._townChatBound) {
      socket._townChatBound = true;

      socket.on('town:chat:message', (msg) => {
        appendMessage(msg);
      });

      socket.on('town:chat:system', (text) => {
        appendMessage({ system: true, text, ts: Date.now() });
      });

      socket.on('town:chat:history', (history) => {
        const box = document.getElementById('town-messages');
        if (box) box.innerHTML = '';
        (history || []).forEach((msg) => appendMessage(msg));
      });
    }
  };

  window.clearTownChat = function () {
    const box = document.getElementById('town-messages');
    if (box) box.innerHTML = '';
  };
})();
