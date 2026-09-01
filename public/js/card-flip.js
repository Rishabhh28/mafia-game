function revealRoleCard(role, factionMembers) {
  const card = document.querySelector('#role-card .card');
  const front = document.getElementById('card-front');
  if (!card || !front) return;

  const roleData = {
    mafia: { icon: '🔪', label: 'Mafia', desc: 'Kill by night. Lie by day.', cls: 'role-mafia' },
    doctor: { icon: '🩺', label: 'Doctor', desc: 'Protect the innocent.', cls: 'role-doctor' },
    innocent: { icon: '👁', label: 'Innocent', desc: 'Find the mafia.', cls: 'role-innocent' },
  }[role] || { icon: '?', label: 'Unknown', desc: '', cls: 'role-innocent' };

  card.classList.remove('flipped');
  front.className = `card-face card-front ${roleData.cls}`;
  front.innerHTML = `
    <div class="card-role-icon">${roleData.icon}</div>
    <div class="card-role-name">${roleData.label}</div>
    <div class="card-role-desc">${roleData.desc}</div>
    ${factionMembers && factionMembers.length
      ? `<div class="card-faction">Your team: ${factionMembers.map(escapeHtml).join(', ')}</div>`
      : ''}
  `;

  setTimeout(() => { card.classList.add('flipped'); }, 2000);
}

function revealEliminatedCard(role, name) {
  const overlay = document.getElementById('reveal-overlay');
  const nameEl = document.getElementById('reveal-name');
  if (nameEl) nameEl.textContent = name || '';
  if (overlay) overlay.classList.remove('hidden');
  revealRoleCard(role, []);
}
