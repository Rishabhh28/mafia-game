(function () {
  const modalHtml = `
    <div class="rules-modal-overlay" id="rules-modal-overlay">
      <div class="rules-modal-container" role="dialog" aria-modal="true" aria-labelledby="rules-modal-title">
        <div class="rules-modal-header">
          <h2 id="rules-modal-title"><span>📖</span> How to Play & Game Rules</h2>
          <button class="rules-modal-close" id="rules-modal-close" title="Close (Esc)">&times;</button>
        </div>
        <div class="rules-modal-tabs">
          <button class="rules-tab-btn active" data-tab="overview">Overview</button>
          <button class="rules-tab-btn" data-tab="roles">Roles & Factions</button>
          <button class="rules-tab-btn" data-tab="phases">Night & Day</button>
          <button class="rules-tab-btn" data-tab="tips">Tips & Voice</button>
        </div>
        <div class="rules-modal-body">
          
          <!-- TAB 1: OVERVIEW -->
          <div class="rules-section active" id="tab-overview">
            <h4>Welcome to Mafia!</h4>
            <p>Mafia is a social deduction game of deception, trust, and survival. Players are split into two main sides: the <strong>Innocent Townspeople</strong> and the secret <strong>Mafia</strong>.</p>

            <div class="rules-highlight">
              <strong>Objective:</strong><br/>
              • <strong>Innocents & Doctor:</strong> Work together to identify and vote out all Mafia members.<br/>
              • <strong>Mafia:</strong> Secretly murder Townspeople at night and outnumber the innocent during the day.
            </div>

            <h4>Quick Game Loop</h4>
            <ul>
              <li><strong>1. Secret Role Assignment:</strong> Flip your card at the start to discover your role. Keep it secret!</li>
              <li><strong>2. Night Phase:</strong> The city sleeps. Mafia pick a target to eliminate. Doctors choose someone to save.</li>
              <li><strong>3. Day Discussion:</strong> The living meet to discuss who died, share suspicions via live voice/chat, and debate suspects.</li>
              <li><strong>4. Voting:</strong> Cast votes to exile the most suspicious player.</li>
            </ul>
          </div>

          <!-- TAB 2: ROLES -->
          <div class="rules-section" id="tab-roles">
            <h4>Character Roles</h4>
            
            <div class="role-detail-card mafia">
              <div class="role-detail-icon">🕵️</div>
              <div class="role-detail-info">
                <h5>Mafia (The Syndicate)</h5>
                <p>Knows who their fellow Mafia members are. During Night, vote together on a victim to eliminate. During Day, pretend to be innocent and divert suspicion.</p>
              </div>
            </div>

            <div class="role-detail-card doctor">
              <div class="role-detail-icon">🩺</div>
              <div class="role-detail-info">
                <h5>Doctor (The Savior)</h5>
                <p>During Night, pick one player to protect with medical aid. If the Mafia chooses that same player, their life is saved! Can protect themselves or others.</p>
              </div>
            </div>

            <div class="role-detail-card innocent">
              <div class="role-detail-icon">👤</div>
              <div class="role-detail-info">
                <h5>Innocent (The Town)</h5>
                <p>Has no special night power, but holds power in numbers. Listen carefully, notice inconsistencies in speech, and vote out suspicious players during the Day.</p>
              </div>
            </div>

            <h4>Role Ratios</h4>
            <p style="font-size:14px; color:var(--text-secondary);">
              • 4–7 Players: 1 Mafia, 1 Doctor, rest Innocents<br/>
              • 8–10 Players: 2 Mafia, 1 Doctor, rest Innocents<br/>
              • 11–14 Players: 2 Mafia, 2 Doctors, rest Innocents
            </p>
          </div>

          <!-- TAB 3: PHASES -->
          <div class="rules-section" id="tab-phases">
            <h4>Game Phases Explained</h4>
            
            <h4>🌙 Night Phase</h4>
            <p>During night, special roles act in secrecy:</p>
            <ul>
              <li><strong>Mafia Active:</strong> Mafia members use private encrypted chat and target selection to lock in a kill.</li>
              <li><strong>Doctor Active:</strong> Doctor selects a target to safeguard from harm.</li>
              <li>Other players wait quietly until morning.</li>
            </ul>

            <h4>☀️ Day Discussion & Proximity Voice</h4>
            <p>When dawn breaks, the server announces who was killed (or saved!). All surviving players join a live voice chat call. Discuss clues, defend yourself, and call out bluffs.</p>

            <h4>⚖️ Voting Phase</h4>
            <p>Each player gets 1 vote. The player with the majority votes is banished from the town for that round. Ties result in no one being banished.</p>
          </div>

          <!-- TAB 4: TIPS -->
          <div class="rules-section" id="tab-tips">
            <h4>New Player Tips & Strategy</h4>

            <ul>
              <li>🗣️ <strong>Use Voice Chat:</strong> Tone of voice and hesitation can reveal a lie faster than text!</li>
              <li>🤫 <strong>Mafia Faction Chat:</strong> Use your private night chat channel to coordinate targets and alibis.</li>
              <li>🛡️ <strong>Doctor Mind Games:</strong> Predict who the Mafia wants to strike — often the loudest or most trusted townsperson!</li>
              <li>👀 <strong>Watch Voting Patterns:</strong> Mafia members often jump on bandwagons to eliminate innocents.</li>
            </ul>

            <div class="rules-highlight">
              💡 <em>Host Tip: The host can skip discussion directly to voting or start the next round from the controls panel.</em>
            </div>
          </div>

        </div>
        <div class="rules-modal-footer">
          <button class="btn btn-primary" id="rules-modal-gotit" type="button">Understood</button>
        </div>
      </div>
    </div>
  `;

  function initRulesModal() {
    if (document.getElementById('rules-modal-overlay')) return;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('rules-modal-overlay');
    const closeBtn = document.getElementById('rules-modal-close');
    const gotItBtn = document.getElementById('rules-modal-gotit');
    const tabBtns = overlay.querySelectorAll('.rules-tab-btn');
    const sections = overlay.querySelectorAll('.rules-section');

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
        sections.forEach((s) => s.classList.toggle('active', s.id === 'tab-' + tab));
      });
    });

    function close() {
      overlay.classList.remove('open');
    }

    closeBtn.addEventListener('click', close);
    gotItBtn.addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        close();
      }
    });
  }

  window.openRulesModal = function (tabName) {
    initRulesModal();
    const overlay = document.getElementById('rules-modal-overlay');
    if (tabName) {
      const btn = overlay.querySelector(`.rules-tab-btn[data-tab="${tabName}"]`);
      if (btn) btn.click();
    }
    overlay.classList.add('open');
  };

  window.closeRulesModal = function () {
    const overlay = document.getElementById('rules-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  };

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRulesModal);
  } else {
    initRulesModal();
  }
})();
