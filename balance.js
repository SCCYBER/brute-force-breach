const SCCYBER_LIMITS = {
  lockout: 5,
  mfa: 5,
  isolate: 3
};

let sccyberUsage = {
  lockout: 0,
  mfa: 0,
  isolate: 0,
  wasted: 0,
  successful: 0
};

let sccyberPrevented = 0;
let sccyberFinalised = false;

function sccyberInstallBalanceStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .network-lines{display:none!important;}

    .live-network-lines{
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      z-index:1;
      pointer-events:none;
      overflow:visible;
    }

    .live-network-lines line{
      stroke:rgba(89,255,157,0.34);
      stroke-width:3;
      filter:drop-shadow(0 0 8px rgba(89,255,157,0.25));
    }

    .action-count{
      display:block;
      margin-top:5px;
      color:#ffd44d;
      font-size:8px;
      line-height:1.5;
    }

    .balance-panel,
    .score-panel,
    .lesson-panel{
      margin:10px 0;
      background:rgba(8,2,20,0.95);
      border:1px solid rgba(89,255,157,0.18);
      border-radius:14px;
      padding:12px;
      color:#b9a8d5;
      font-size:13px;
      line-height:1.55;
      text-align:center;
    }

    .balance-panel strong,
    .score-panel strong,
    .lesson-panel strong{
      color:#ffd44d;
      font-family:'Press Start 2P', cursive;
      font-size:9px;
      line-height:1.7;
      display:block;
      margin-bottom:8px;
    }

    .score-grid{
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:8px;
      margin-top:8px;
    }

    .score-pill{
      background:#1b0640;
      border:1px solid rgba(169,76,255,0.2);
      border-radius:12px;
      padding:9px 6px;
      color:#59ff9d;
      font-family:'Press Start 2P', cursive;
      font-size:8px;
      line-height:1.7;
    }

    .action-btn.used-up{
      opacity:0.45;
      cursor:not-allowed;
      filter:grayscale(0.5);
    }

    .device::before{
      content:attr(data-status-icon);
      position:absolute;
      left:6px;
      top:4px;
      font-size:13px;
      opacity:0.95;
    }

    @media(max-width:900px){
      .score-grid{grid-template-columns:repeat(2,1fr);}
      .action-btn{min-height:52px;}
      .device{touch-action:manipulation;}
      .live-network-lines line{stroke-width:4;}
    }
  `;
  document.head.appendChild(style);
}

function sccyberCreateBalancePanel() {
  const controlCard = document.querySelector(".control-card");
  const rulesCard = document.querySelector(".rules-card");
  if (!controlCard || !rulesCard || document.getElementById("balancePanel")) return;

  const scorePanel = document.createElement("div");
  scorePanel.className = "score-panel";
  scorePanel.id = "scorePanel";
  scorePanel.innerHTML = `
    <strong>LIVE SCORE</strong>
    <div class="score-grid">
      <div class="score-pill" id="sccyberScoreBox">SCORE<br>0</div>
      <div class="score-pill" id="sccyberRankBox">RANK<br>TRAINEE</div>
      <div class="score-pill" id="sccyberPreventedBox">BLOCKED<br>0</div>
      <div class="score-pill" id="sccyberWastedBox">WASTED<br>0</div>
    </div>
  `;

  const panel = document.createElement("div");
  panel.className = "balance-panel";
  panel.id = "balancePanel";
  panel.innerHTML = `
    <strong>DEFENCE RESOURCES</strong>
    You cannot protect everything. Choose carefully under pressure.
  `;

  const lessonPanel = document.createElement("div");
  lessonPanel.className = "lesson-panel";
  lessonPanel.id = "lessonPanel";
  lessonPanel.innerHTML = `
    <strong>CYBERSECURITY LESSON</strong>
    <span id="sccyberLessonText">Lockout slows repeated password attempts. MFA reduces account takeover risk. Isolation limits spread.</span>
  `;

  controlCard.insertBefore(scorePanel, rulesCard);
  controlCard.insertBefore(panel, rulesCard);
  controlCard.insertBefore(lessonPanel, rulesCard);
}

function sccyberScore() {
  const breached = devices.filter(d => d.state === "breached").length;
  const safe = TOTAL_DEVICES - breached;
  const base = safe * 100;
  const blocked = sccyberPrevented * 90;
  const discipline = Math.max(0, 200 - sccyberUsage.wasted * 40);
  const actionBonus = sccyberUsage.successful * 30;
  const perfectBonus = gameOver && breached === 0 ? 500 : 0;
  return Math.max(0, base + blocked + discipline + actionBonus + perfectBonus);
}

function sccyberRank(score = sccyberScore()) {
  if (score >= 2300) return "CISO";
  if (score >= 1800) return "SOC LEAD";
  if (score >= 1350) return "ENGINEER";
  if (score >= 900) return "ANALYST";
  return "TRAINEE";
}

function sccyberUpdateScorePanel() {
  const scoreBox = document.getElementById("sccyberScoreBox");
  const rankBox = document.getElementById("sccyberRankBox");
  const preventedBox = document.getElementById("sccyberPreventedBox");
  const wastedBox = document.getElementById("sccyberWastedBox");
  if (!scoreBox) return;

  const score = sccyberScore();
  scoreBox.innerHTML = `SCORE<br>${score}`;
  rankBox.innerHTML = `RANK<br>${sccyberRank(score)}`;
  preventedBox.innerHTML = `BLOCKED<br>${sccyberPrevented}`;
  wastedBox.innerHTML = `WASTED<br>${sccyberUsage.wasted}`;
}

function sccyberLesson(text) {
  const lesson = document.getElementById("sccyberLessonText");
  if (lesson) lesson.textContent = text;
}

function sccyberUpdateActionButtons() {
  lockoutBtn.innerHTML = `ENABLE LOCKOUT<span class="action-count">${SCCYBER_LIMITS.lockout - sccyberUsage.lockout} LEFT</span>`;
  mfaBtn.innerHTML = `APPLY MFA<span class="action-count">${SCCYBER_LIMITS.mfa - sccyberUsage.mfa} LEFT</span>`;
  isolateBtn.innerHTML = `ISOLATE DEVICE<span class="action-count">${SCCYBER_LIMITS.isolate - sccyberUsage.isolate} LEFT</span>`;

  lockoutBtn.classList.toggle("used-up", sccyberUsage.lockout >= SCCYBER_LIMITS.lockout);
  mfaBtn.classList.toggle("used-up", sccyberUsage.mfa >= SCCYBER_LIMITS.mfa);
  isolateBtn.classList.toggle("used-up", sccyberUsage.isolate >= SCCYBER_LIMITS.isolate);
  sccyberUpdateScorePanel();
}

function sccyberSelectedDevice() {
  if (typeof getSelectedDevice !== "function") return null;
  return getSelectedDevice();
}

function sccyberBlockOriginalEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function sccyberUseLockout(event) {
  sccyberBlockOriginalEvent(event);
  if (!gameStarted || gameOver) return;

  const device = sccyberSelectedDevice();
  if (!device || device.state === "breached") return;

  if (sccyberUsage.lockout >= SCCYBER_LIMITS.lockout) {
    addLog("No lockout actions remaining. Prioritise other controls.", "warn");
    sccyberUsage.wasted += 1;
    sccyberLesson("You have run out of lockout actions. In real incidents, limited time and resources force prioritisation.");
    sccyberUpdateActionButtons();
    return;
  }

  if (device.lockout) {
    addLog(`${device.name} already has lockout enabled.`, "warn");
    sccyberUsage.wasted += 1;
    sccyberLesson("Repeating the same control wastes response time. Pick the next highest risk device.");
    sccyberUpdateActionButtons();
    return;
  }

  sccyberUsage.lockout += 1;
  sccyberUsage.successful += 1;
  device.lockout = true;
  addLog(`Lockout enabled on ${device.name}.`, "good");
  sccyberLesson("Lockout is one of the strongest controls against brute force because it limits repeated password attempts.");
  spawnDefenceBurst(device.id);
  sccyberUpdateActionButtons();
  renderDevices();
}

function sccyberUseMfa(event) {
  sccyberBlockOriginalEvent(event);
  if (!gameStarted || gameOver) return;

  const device = sccyberSelectedDevice();
  if (!device || device.state === "breached") return;

  if (sccyberUsage.mfa >= SCCYBER_LIMITS.mfa) {
    addLog("No MFA actions remaining. Choose another defence.", "warn");
    sccyberUsage.wasted += 1;
    sccyberLesson("MFA resources are gone. You now need to rely on lockout and isolation.");
    sccyberUpdateActionButtons();
    return;
  }

  if (device.type !== "server" && device.type !== "endpoint") {
    addLog(`MFA is not available on ${device.name} in this simulation.`, "warn");
    sccyberUsage.wasted += 1;
    sccyberLesson("MFA protects account access. It is useful on servers and PCs, not every network device.");
    sccyberUpdateActionButtons();
    return;
  }

  if (device.mfa) {
    addLog(`${device.name} already has MFA applied.`, "warn");
    sccyberUsage.wasted += 1;
    sccyberLesson("That device already has MFA. During pressure, repeated actions cost you points.");
    sccyberUpdateActionButtons();
    return;
  }

  sccyberUsage.mfa += 1;
  sccyberUsage.successful += 1;
  device.mfa = true;
  addLog(`MFA applied to ${device.name}.`, "good");
  sccyberLesson("MFA reduces the chance of account takeover, even when passwords are guessed or stolen.");
  spawnShieldBurst(device.id);
  sccyberUpdateActionButtons();
  renderDevices();
}

function sccyberUseIsolate(event) {
  sccyberBlockOriginalEvent(event);
  if (!gameStarted || gameOver) return;

  const device = sccyberSelectedDevice();
  if (!device || device.state === "breached") return;

  if (sccyberUsage.isolate >= SCCYBER_LIMITS.isolate) {
    addLog("No isolation actions remaining. Use lockout or MFA.", "warn");
    sccyberUsage.wasted += 1;
    sccyberLesson("Isolation is powerful but limited. Use it only when spread risk is high.");
    sccyberUpdateActionButtons();
    return;
  }

  if (device.type === "switch") {
    addLog("The switch cannot be isolated in this simulation.", "warn");
    sccyberUsage.wasted += 1;
    sccyberLesson("The switch is core infrastructure. Isolating it would cut off the estate, so protect it instead.");
    sccyberUpdateActionButtons();
    return;
  }

  if (device.isolated) {
    addLog(`${device.name} is already isolated.`, "warn");
    sccyberUsage.wasted += 1;
    sccyberLesson("That device is already isolated. Focus on active targets and critical assets.");
    sccyberUpdateActionButtons();
    return;
  }

  sccyberUsage.isolate += 1;
  sccyberUsage.successful += 1;
  device.isolated = true;
  addLog(`${device.name} has been isolated from the estate.`, "warn");
  sccyberLesson("Isolation removes a risky device from the estate and limits the attack path.");
  spawnShieldBurst(device.id);
  sccyberUpdateActionButtons();
  renderDevices();
  checkGameState();
}

function sccyberInstallDynamicLines() {
  const board = document.getElementById("networkBoard");
  if (!board || document.getElementById("liveNetworkLines")) return;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "live-network-lines");
  svg.setAttribute("id", "liveNetworkLines");
  board.insertBefore(svg, board.firstChild);

  sccyberDrawDynamicLines();
  window.addEventListener("resize", sccyberDrawDynamicLines);
  setInterval(sccyberDrawDynamicLines, 1000);
}

function sccyberDevicePoint(id) {
  const board = document.getElementById("networkBoard");
  const el = document.getElementById(`d${id}`);
  if (!board || !el) return null;

  const boardRect = board.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left - boardRect.left + rect.width / 2,
    y: rect.top - boardRect.top + rect.height / 2
  };
}

function sccyberDrawDynamicLines() {
  const board = document.getElementById("networkBoard");
  const svg = document.getElementById("liveNetworkLines");
  if (!board || !svg) return;

  const rect = board.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  svg.innerHTML = "";

  const links = [
    [0,1], [1,2], [1,3], [1,4], [1,5], [1,6], [1,7], [1,8], [1,9], [1,10], [1,11],
    [2,4], [2,5], [3,8], [3,9], [5,10], [8,11]
  ];

  links.forEach(([a,b]) => {
    const p1 = sccyberDevicePoint(a);
    const p2 = sccyberDevicePoint(b);
    if (!p1 || !p2) return;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", p1.x);
    line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x);
    line.setAttribute("y2", p2.y);
    svg.appendChild(line);
  });
}

function sccyberPatchRenderDevices() {
  if (typeof renderDevices !== "function") return;
  const originalRenderDevices = renderDevices;
  renderDevices = function patchedRenderDevices() {
    originalRenderDevices();
    devices.forEach(device => {
      const el = document.getElementById(`d${device.id}`);
      if (!el) return;
      let icon = "";
      if (device.state === "breached") icon = "☠";
      else if (currentTargets && currentTargets.some(t => t.id === device.id)) icon = "!";
      else if (device.isolated) icon = "⛔";
      else if (device.lockout) icon = "🔒";
      else if (device.mfa) icon = "✓";
      el.setAttribute("data-status-icon", icon);
    });
    sccyberUpdateScorePanel();
    sccyberDrawDynamicLines();
  };
}

function sccyberPatchEndScreens() {
  if (typeof winGame === "function") {
    const originalWinGame = winGame;
    winGame = function patchedWinGame() {
      originalWinGame();
      sccyberFinaliseEndScreen(true);
    };
  }

  if (typeof loseGame === "function") {
    const originalLoseGame = loseGame;
    loseGame = function patchedLoseGame() {
      originalLoseGame();
      sccyberFinaliseEndScreen(false);
    };
  }
}

function sccyberFinaliseEndScreen(won) {
  if (sccyberFinalised) return;
  sccyberFinalised = true;
  const score = sccyberScore();
  const rank = sccyberRank(score);
  const breached = devices.filter(d => d.state === "breached").length;
  const safe = TOTAL_DEVICES - breached;

  if (won) {
    victoryScore.textContent = `${score} POINTS · ${rank} · ${safe} SAFE · ${breached} BREACHED`;
    victoryTime.textContent = `${sccyberPrevented} BLOCKED · ${sccyberUsage.wasted} WASTED ACTIONS`;
    sccyberLesson(breached === 0 ? "Perfect containment. You used layered defence well." : "Good containment. You survived, but every breach shows why early prioritisation matters.");
  } else {
    const breachSubtext = document.getElementById("breachSubtext");
    if (breachSubtext) breachSubtext.textContent = `${score} POINTS · ${rank} · ${safe} SAFE · ${breached} BREACHED`;
    sccyberLesson("The incident got out of control. Prioritise the switch, servers and active targets earlier.");
  }

  sccyberUpdateScorePanel();
}

function sccyberPatchAttackResolution() {
  if (typeof resolveAttackOnTarget !== "function") return;
  const originalResolveAttackOnTarget = resolveAttackOnTarget;
  resolveAttackOnTarget = function patchedResolveAttackOnTarget(target) {
    const before = target ? target.state : null;
    originalResolveAttackOnTarget(target);
    if (target && before !== "breached" && target.state !== "breached") {
      sccyberPrevented += 1;
      sccyberUpdateScorePanel();
    }
  };
}

function sccyberInstallBalanceLayer() {
  sccyberInstallBalanceStyles();
  sccyberCreateBalancePanel();
  sccyberPatchRenderDevices();
  sccyberPatchAttackResolution();
  sccyberPatchEndScreens();
  sccyberInstallDynamicLines();
  sccyberUpdateActionButtons();

  lockoutBtn.addEventListener("click", sccyberUseLockout, true);
  mfaBtn.addEventListener("click", sccyberUseMfa, true);
  isolateBtn.addEventListener("click", sccyberUseIsolate, true);
}

sccyberInstallBalanceLayer();