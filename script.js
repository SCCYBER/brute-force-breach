const TOTAL_DEVICES = 12;
const GAME_DURATION = 120;
const LOSS_THRESHOLD = 7;
const ATTACK_INTERVAL_MS = 7000;
const REACTION_WINDOW_MS = 5200;

const devices = [
  { id: 0, name: "ROUTER", type: "router", state: "normal", mfa: false, lockout: false, isolated: false },
  { id: 1, name: "SWITCH", type: "switch", state: "normal", mfa: false, lockout: false, isolated: false },
  { id: 2, name: "SERVER 1", type: "server", state: "normal", mfa: false, lockout: false, isolated: false },
  { id: 3, name: "SERVER 2", type: "server", state: "normal", mfa: false, lockout: false, isolated: false },
  { id: 4, name: "PC 1", type: "endpoint", state: "normal", mfa: false, lockout: false, isolated: false },
  { id: 5, name: "PC 2", type: "endpoint", state: "normal", mfa: false, lockout: false, isolated: false },
  { id: 6, name: "PC 3", type: "endpoint", state: "normal", mfa: false, lockout: false, isolated: false },
  { id: 7, name: "PC 4", type: "endpoint", state: "normal", mfa: false, lockout: false, isolated: false },
  { id: 8, name: "PC 5", type: "endpoint", state: "normal", mfa: false, lockout: false, isolated: false },
  { id: 9, name: "PC 6", type: "endpoint", state: "normal", mfa: false, lockout: false, isolated: false },
  { id: 10, name: "PC 7", type: "endpoint", state: "normal", mfa: false, lockout: false, isolated: false },
  { id: 11, name: "PC 8", type: "endpoint", state: "normal", mfa: false, lockout: false, isolated: false }
];

const adjacency = {
  0: [1],
  1: [0,2,3,4,5,6,7,8,9,10,11],
  2: [1],
  3: [1],
  4: [1],
  5: [1],
  6: [1],
  7: [1],
  8: [1],
  9: [1],
  10: [1],
  11: [1]
};

let gameStarted = false;
let gameOver = false;
let timeRemaining = GAME_DURATION;
let timerInterval = null;
let attackInterval = null;
let currentTarget = null;
let selectedDeviceId = null;
let reactionTimeout = null;
let attackContained = false;

const startBtn = document.getElementById("startBtn");
const introCard = document.getElementById("introCard");
const lockoutBtn = document.getElementById("lockoutBtn");
const mfaBtn = document.getElementById("mfaBtn");
const isolateBtn = document.getElementById("isolateBtn");
const attackReadout = document.getElementById("attackReadout");
const logLines = document.getElementById("logLines");
const timerBox = document.getElementById("timerBox");
const safeBox = document.getElementById("safeBox");
const breachedBox = document.getElementById("breachedBox");
const statusBox = document.getElementById("statusBox");
const breachOverlay = document.getElementById("breachOverlay");
const giantRansomSkull = document.getElementById("giantRansomSkull");
const victoryOverlay = document.getElementById("victoryOverlay");
const victoryScore = document.getElementById("victoryScore");
const victoryTime = document.getElementById("victoryTime");
const selectedDeviceName = document.getElementById("selectedDeviceName");

const fxCanvas = document.getElementById("fxCanvas");
const ctx = fxCanvas.getContext("2d");
let particles = [];

function resizeCanvas() {
  fxCanvas.width = window.innerWidth;
  fxCanvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function formatTime(totalSeconds) {
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const secs = String(totalSeconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function addLog(text, type = "") {
  const line = document.createElement("div");
  line.className = `log-line ${type}`.trim();
  line.textContent = text;
  logLines.prepend(line);

  const lines = [...logLines.querySelectorAll(".log-line")];
  if (lines.length > 8) {
    lines[lines.length - 1].remove();
  }
}

function updateHud() {
  const breached = devices.filter(d => d.state === "breached").length;
  const safe = TOTAL_DEVICES - breached;

  safeBox.textContent = `SAFE: ${safe} / ${TOTAL_DEVICES}`;
  breachedBox.textContent = `BREACHED: ${breached} / ${TOTAL_DEVICES}`;
  timerBox.textContent = `TIME: ${formatTime(timeRemaining)}`;

  if (timeRemaining <= 20) {
    timerBox.style.color = "#ff3b6b";
  } else if (timeRemaining <= 60) {
    timerBox.style.color = "#ffd44d";
  } else {
    timerBox.style.color = "#ffd44d";
  }

  if (gameOver) return;

  if (!gameStarted) {
    statusBox.textContent = "STATUS: STANDBY";
  } else if (currentTarget) {
    statusBox.textContent = "STATUS: ACTIVE BRUTE FORCE";
  } else if (attackContained) {
    statusBox.textContent = "STATUS: CONTAINMENT HOLDING";
  } else {
    statusBox.textContent = "STATUS: SCANNING NETWORK";
  }
}

function renderDevices() {
  devices.forEach(device => {
    const el = document.getElementById(`d${device.id}`);
    el.classList.remove("breached", "protected", "targeted", "isolated", "selected");

    let statusText = "NORMAL";

    if (device.state === "breached") {
      el.classList.add("breached");
      statusText = "BREACHED";
    } else {
      const tags = [];
      if (device.lockout) {
        el.classList.add("protected");
        tags.push("LOCKOUT");
      }
      if (device.mfa) {
        el.classList.add("protected");
        tags.push("MFA");
      }
      if (device.isolated) {
        el.classList.add("protected");
        el.classList.add("isolated");
        tags.push("ISOLATED");
      }
      statusText = tags.length ? tags.join(" · ") : "NORMAL";
    }

    if (currentTarget && currentTarget.id === device.id && device.state !== "breached") {
      el.classList.add("targeted");
    }

    if (selectedDeviceId === device.id) {
      el.classList.add("selected");
    }

    let statusEl = el.querySelector(".device-label-status");
    if (!statusEl) {
      statusEl = document.createElement("span");
      statusEl.className = "device-label-status";
      el.appendChild(statusEl);
    }
    statusEl.textContent = statusText;
  });

  if (selectedDeviceId === null) {
    selectedDeviceName.textContent = "NONE";
  } else {
    const selected = devices.find(d => d.id === selectedDeviceId);
    selectedDeviceName.textContent = selected ? selected.name : "NONE";
  }

  updateHud();
}

function selectDevice(id) {
  if (gameOver) return;
  selectedDeviceId = id;
  renderDevices();
}

function getSelectedDevice() {
  if (selectedDeviceId === null) return null;
  return devices.find(d => d.id === selectedDeviceId);
}

function startTimer() {
  timerInterval = setInterval(() => {
    if (gameOver) return;

    timeRemaining -= 1;
    updateHud();

    if (timeRemaining <= 0) {
      timeRemaining = 0;
      updateHud();
      winGame();
    }
  }, 1000);
}

function getCandidateTargets() {
  const breachedIds = devices.filter(d => d.state === "breached").map(d => d.id);

  if (breachedIds.length === 0) {
    return devices.filter(d => d.state !== "breached" && !d.isolated);
  }

  const candidateIds = new Set();

  breachedIds.forEach(id => {
    adjacency[id].forEach(neighbourId => {
      const neighbour = devices.find(d => d.id === neighbourId);
      if (neighbour && neighbour.state !== "breached" && !neighbour.isolated) {
        candidateIds.add(neighbourId);
      }
    });
  });

  return devices.filter(d => candidateIds.has(d.id));
}

function chooseTarget() {
  const candidates = getCandidateTargets();
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function assessContainment() {
  const candidates = getCandidateTargets();
  attackContained = candidates.length === 0;
  return attackContained;
}

function attackCycle() {
  if (gameOver || !gameStarted) return;

  currentTarget = chooseTarget();

  if (!currentTarget) {
    attackContained = true;
    attackReadout.textContent = "ATTACKER TARGET: NO PATH AVAILABLE";
    renderDevices();
    return;
  }

  attackContained = false;
  attackReadout.textContent = `ATTACKER TARGET: ${currentTarget.name}`;
  renderDevices();

  addLog(`Brute force detected against ${currentTarget.name}.`, "warn");

  reactionTimeout = setTimeout(() => {
    if (gameOver || !currentTarget) return;

    let breachChance = 0.78;

    if (currentTarget.lockout) breachChance = 0.05;

    if (currentTarget.type === "server" || currentTarget.type === "endpoint") {
      if (currentTarget.mfa) breachChance -= 0.35;
    }

    if (currentTarget.isolated) breachChance = 0;

    breachChance = Math.max(0, breachChance);

    if (currentTarget.isolated) {
      addLog(`${currentTarget.name} was isolated. Attack blocked.`, "good");
      spawnShieldBurst(currentTarget.id);
    } else if (Math.random() < breachChance) {
      currentTarget.state = "breached";
      addLog(`${currentTarget.name} has been breached.`, "bad");
      spawnSkullBurst(currentTarget.id);
    } else {
      addLog(`Attack failed against ${currentTarget.name}.`, "good");
      spawnDefenceBurst(currentTarget.id);
    }

    currentTarget = null;
    assessContainment();
    attackReadout.textContent = attackContained ? "ATTACKER TARGET: CONTAINED" : "ATTACKER TARGET: SCANNING";
    renderDevices();
    checkGameState();
  }, REACTION_WINDOW_MS);
}

function checkGameState() {
  const breached = devices.filter(d => d.state === "breached").length;

  if (breached >= LOSS_THRESHOLD) {
    loseGame();
    return;
  }

  assessContainment();
}

function loseGame() {
  if (gameOver) return;
  gameOver = true;
  clearInterval(timerInterval);
  clearInterval(attackInterval);
  clearTimeout(reactionTimeout);

  statusBox.textContent = "STATUS: NETWORK LOST";
  addLog("More than half the estate has been breached.", "bad");

  setTimeout(() => {
    breachOverlay.classList.add("active");
    giantRansomSkull.classList.add("active");
    megaRansomBurst();
  }, 700);
}

function winGame() {
  if (gameOver) return;
  gameOver = true;
  clearInterval(timerInterval);
  clearInterval(attackInterval);
  clearTimeout(reactionTimeout);

  statusBox.textContent = "STATUS: ATTACK LOCKED OUT";
  addLog("You held the estate until time expired.", "good");

  const breached = devices.filter(d => d.state === "breached").length;
  const safe = TOTAL_DEVICES - breached;

  victoryScore.textContent = `${safe} SAFE · ${breached} BREACHED`;
  victoryTime.textContent = `TIME 00:00`;

  setTimeout(() => {
    victoryOverlay.classList.add("active");
    launchVictoryFireworks();
  }, 700);
}

function startGame() {
  if (gameStarted) return;

  gameStarted = true;
  introCard.style.display = "none";
  addLog("Brute force activity detected on the network.", "bad");
  addLog("Tap a device, then choose a defence action.", "warn");

  renderDevices();
  startTimer();

  attackInterval = setInterval(attackCycle, ATTACK_INTERVAL_MS);
  setTimeout(attackCycle, 1800);
}

function useLockout() {
  if (!gameStarted || gameOver) return;
  const device = getSelectedDevice();
  if (!device || device.state === "breached") return;

  device.lockout = true;
  addLog(`Lockout enabled on ${device.name}.`, "good");
  spawnDefenceBurst(device.id);
  renderDevices();
}

function useMfa() {
  if (!gameStarted || gameOver) return;
  const device = getSelectedDevice();
  if (!device || device.state === "breached") return;

  if (device.type !== "server" && device.type !== "endpoint") {
    addLog(`MFA is not available on ${device.name} in this simulation.`, "warn");
    return;
  }

  device.mfa = true;
  addLog(`MFA applied to ${device.name}.`, "good");
  spawnShieldBurst(device.id);
  renderDevices();
}

function useIsolate() {
  if (!gameStarted || gameOver) return;
  const device = getSelectedDevice();
  if (!device || device.state === "breached") return;

  device.isolated = true;
  addLog(`${device.name} has been isolated from the estate.`, "warn");
  spawnShieldBurst(device.id);
  renderDevices();
  checkGameState();
}

startBtn.addEventListener("click", startGame);
lockoutBtn.addEventListener("click", useLockout);
mfaBtn.addEventListener("click", useMfa);
isolateBtn.addEventListener("click", useIsolate);

devices.forEach(device => {
  const el = document.getElementById(`d${device.id}`);
  el.addEventListener("click", () => selectDevice(device.id));
  el.addEventListener("touchstart", () => selectDevice(device.id), { passive: true });
});

function getDeviceCenter(id) {
  const el = document.getElementById(`d${id}`);
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function addParticle(x, y, vx, vy, size, color, life) {
  particles.push({ x, y, vx, vy, size, color, life });
}

function spawnDefenceBurst(id) {
  const p = getDeviceCenter(id);
  const colors = ["#59ff9d", "#a94cff", "#ffffff"];
  for (let i = 0; i < 24; i++) {
    addParticle(
      p.x,
      p.y,
      (Math.random() - 0.5) * 4.2,
      (Math.random() - 0.5) * 4.2,
      Math.random() * 4 + 2,
      colors[Math.floor(Math.random() * colors.length)],
      34
    );
  }
}

function spawnShieldBurst(id) {
  const p = getDeviceCenter(id);
  const colors = ["#59ff9d", "#2cdc78", "#ffffff"];
  for (let i = 0; i < 30; i++) {
    addParticle(
      p.x,
      p.y,
      (Math.random() - 0.5) * 4.8,
      (Math.random() - 0.5) * 4.8,
      Math.random() * 5 + 2,
      colors[Math.floor(Math.random() * colors.length)],
      40
    );
  }
}

function spawnSkullBurst(id) {
  const p = getDeviceCenter(id);
  const colors = ["#ff3b6b", "#ff6d92", "#ffffff"];
  for (let i = 0; i < 34; i++) {
    addParticle(
      p.x,
      p.y,
      (Math.random() - 0.5) * 5.2,
      (Math.random() - 0.5) * 5.2,
      Math.random() * 5 + 2,
      colors[Math.floor(Math.random() * colors.length)],
      42
    );
  }
}

function fireworkBurst(x, y, count = 72) {
  const colors = ["#59ff9d", "#a94cff", "#ff3b6b", "#ffd44d", "#ffffff"];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = Math.random() * 6.2 + 1.8;
    addParticle(
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      Math.random() * 6 + 2,
      colors[Math.floor(Math.random() * colors.length)],
      88
    );
  }
}

function launchVictoryFireworks() {
  const bursts = [
    [window.innerWidth * 0.1, window.innerHeight * 0.14],
    [window.innerWidth * 0.22, window.innerHeight * 0.22],
    [window.innerWidth * 0.35, window.innerHeight * 0.12],
    [window.innerWidth * 0.5, window.innerHeight * 0.18],
    [window.innerWidth * 0.65, window.innerHeight * 0.12],
    [window.innerWidth * 0.78, window.innerHeight * 0.22],
    [window.innerWidth * 0.9, window.innerHeight * 0.14]
  ];

  bursts.forEach((burst, i) => {
    setTimeout(() => fireworkBurst(burst[0], burst[1], 120), i * 180);
  });

  setTimeout(() => {
    const interval = setInterval(() => {
      fireworkBurst(
        Math.random() * window.innerWidth,
        Math.random() * (window.innerHeight * 0.45),
        100
      );
    }, 320);

    setTimeout(() => clearInterval(interval), 2500);
  }, 900);
}

function megaRansomBurst() {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const colors = ["#ff3b6b", "#ffffff", "#a94cff", "#ff8ea9"];

  for (let i = 0; i < 180; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 1;
    addParticle(
      cx,
      cy,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      Math.random() * 5 + 2,
      colors[Math.floor(Math.random() * colors.length)],
      90
    );
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= 1;

    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });

  particles = particles.filter(p => p.life > 0);
  requestAnimationFrame(animateParticles);
}

renderDevices();
animateParticles();
