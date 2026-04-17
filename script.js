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
  { id: 9, name: "PC 6", type: "endpoint", state: "normal", mfa: false, lockout: false, isolated: false }
];

const adjacency = {
  0: [1],
  1: [0, 2, 3, 4, 5, 6, 7, 8, 9],
  2: [1],
  3: [1],
  4: [1],
  5: [1],
  6: [1],
  7: [1],
  8: [1],
  9: [1]
};

let gameStarted = false;
let gameOver = false;
let elapsedSeconds = 0;
let timerInterval = null;
let attackInterval = null;
let currentTarget = null;

const startBtn = document.getElementById("startBtn");
const introCard = document.getElementById("introCard");
const deviceSelect = document.getElementById("deviceSelect");
const lockoutBtn = document.getElementById("lockoutBtn");
const mfaBtn = document.getElementById("mfaBtn");
const isolateBtn = document.getElementById("isolateBtn");
const attackReadout = document.getElementById("attackReadout");
const logLines = document.getElementById("logLines");
const timerBox = document.getElementById("timerBox");
const secureBox = document.getElementById("secureBox");
const breachedBox = document.getElementById("breachedBox");
const statusBox = document.getElementById("statusBox");
const breachOverlay = document.getElementById("breachOverlay");
const giantRansomSkull = document.getElementById("giantRansomSkull");
const victoryOverlay = document.getElementById("victoryOverlay");
const victoryScore = document.getElementById("victoryScore");
const victoryTime = document.getElementById("victoryTime");
const gameShell = document.getElementById("gameShell");

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
  const protectedCount = devices.filter(d => d.lockout || d.mfa || d.isolated).length;

  secureBox.textContent = `SECURED: ${protectedCount} / 10`;
  breachedBox.textContent = `BREACHED: ${breached} / 10`;
  timerBox.textContent = `TIME: ${formatTime(elapsedSeconds)}`;

  if (gameOver) return;
  statusBox.textContent = currentTarget === null ? "STATUS: SCANNING NETWORK" : "STATUS: ACTIVE BRUTE FORCE";
}

function populateSelect() {
  deviceSelect.innerHTML = "";
  devices.forEach(device => {
    const option = document.createElement("option");
    option.value = device.id;
    option.textContent = device.name;
    deviceSelect.appendChild(option);
  });
}

function getSelectedDevice() {
  const id = Number(deviceSelect.value);
  return devices.find(d => d.id === id);
}

function renderDevices() {
  devices.forEach(device => {
    const el = document.getElementById(`d${device.id}`);
    el.classList.remove("breached", "protected", "targeted", "isolated");

    let statusText = "NORMAL";

    if (device.state === "breached") {
      el.classList.add("breached");
      statusText = "BREACHED";
    } else {
      if (device.lockout || device.mfa || device.isolated) {
        el.classList.add("protected");
      }
      if (device.isolated) {
        el.classList.add("isolated");
      }

      const tags = [];
      if (device.lockout) tags.push("LOCKOUT");
      if (device.mfa) tags.push("MFA");
      if (device.isolated) tags.push("ISOLATED");
      statusText = tags.length ? tags.join(" · ") : "NORMAL";
    }

    if (currentTarget !== null && currentTarget.id === device.id && device.state !== "breached") {
      el.classList.add("targeted");
    }

    let statusEl = el.querySelector(".device-label-status");
    if (!statusEl) {
      statusEl = document.createElement("span");
      statusEl.className = "device-label-status";
      el.appendChild(statusEl);
    }
    statusEl.textContent = statusText;
  });

  updateHud();
}

function startTimer() {
  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    updateHud();
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
  if (candidates.length === 0) {
    return null;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function attackCycle() {
  if (gameOver || !gameStarted) return;

  currentTarget = chooseTarget();

  if (!currentTarget) {
    winGame();
    return;
  }

  attackReadout.textContent = `ATTACKER TARGET: ${currentTarget.name}`;
  renderDevices();

  let breachChance = 0.75;

  if (currentTarget.lockout) breachChance = 0.05;
  if (currentTarget.mfa) breachChance -= 0.35;
  if (currentTarget.isolated) breachChance = 0;

  breachChance = Math.max(0, breachChance);

  setTimeout(() => {
    if (gameOver || !currentTarget) return;

    if (currentTarget.isolated) {
      addLog(`${currentTarget.name} was isolated. Attack blocked.`, "good");
      spawnShieldBurst(currentTarget.id);
    } else if (Math.random() < breachChance) {
      currentTarget.state = "breached";
      addLog(`${currentTarget.name} has been breached.`, "bad");
      spawnSkullBurst(currentTarget.id);
    } else {
      addLog(`Attack failed against ${currentTarget.name}.`, "warn");
      spawnDefenceBurst(currentTarget.id);
    }

    currentTarget = null;
    attackReadout.textContent = "ATTACKER TARGET: SCANNING";
    renderDevices();
    checkGameState();
  }, 1700);
}

function checkGameState() {
  const breached = devices.filter(d => d.state === "breached").length;
  if (breached >= 10) {
    loseGame();
    return;
  }

  const candidates = getCandidateTargets();
  if (candidates.length === 0) {
    winGame();
  }
}

function loseGame() {
  if (gameOver) return;
  gameOver = true;
  clearInterval(timerInterval);
  clearInterval(attackInterval);

  statusBox.textContent = "STATUS: NETWORK LOST";
  addLog("All devices have been breached.", "bad");

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

  statusBox.textContent = "STATUS: ATTACK LOCKED OUT";
  addLog("The attacker has been fully contained.", "good");

  const safeCount = devices.filter(d => d.state !== "breached").length;
  victoryScore.textContent = `${safeCount} / 10 DEVICES SAFE`;
  victoryTime.textContent = `TIME ${formatTime(elapsedSeconds)}`;

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
  addLog("Defence team online. Awaiting first target.", "warn");

  renderDevices();
  populateSelect();
  startTimer();

  attackInterval = setInterval(attackCycle, 3200);
  setTimeout(attackCycle, 1400);
}

function useLockout() {
  if (!gameStarted || gameOver) return;
  const device = getSelectedDevice();
  if (!device || device.state === "breached") return;

  device.lockout = true;
  addLog(`Account lockout enabled on ${device.name}.`, "good");
  spawnDefenceBurst(device.id);
  renderDevices();
}

function useMfa() {
  if (!gameStarted || gameOver) return;
  const device = getSelectedDevice();
  if (!device || device.state === "breached") return;

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
  addLog(`${device.name} has been isolated from the network.`, "warn");
  spawnShieldBurst(device.id);
  renderDevices();
  checkGameState();
}

startBtn.addEventListener("click", startGame);
lockoutBtn.addEventListener("click", useLockout);
mfaBtn.addEventListener("click", useMfa);
isolateBtn.addEventListener("click", useIsolate);

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
      (Math.random() - 0.5) * 4.6,
      (Math.random() - 0.5) * 4.6,
      Math.random() * 4 + 2,
      colors[Math.floor(Math.random() * colors.length)],
      32
    );
  }
}

function spawnShieldBurst(id) {
  const p = getDeviceCenter(id);
  const colors = ["#59ff9d", "#2cdc78", "#ffffff"];
  for (let i = 0; i < 32; i++) {
    addParticle(
      p.x,
      p.y,
      (Math.random() - 0.5) * 5.2,
      (Math.random() - 0.5) * 5.2,
      Math.random() * 5 + 2,
      colors[Math.floor(Math.random() * colors.length)],
      38
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
      (Math.random() - 0.5) * 5.6,
      (Math.random() - 0.5) * 5.6,
      Math.random() * 5 + 2,
      colors[Math.floor(Math.random() * colors.length)],
      38
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
    setTimeout(() => fireworkBurst(burst[0], burst[1], 130), i * 180);
  });

  setTimeout(() => {
    const interval = setInterval(() => {
      fireworkBurst(
        Math.random() * window.innerWidth,
        Math.random() * (window.innerHeight * 0.45),
        110
      );
    }, 280);

    setTimeout(() => clearInterval(interval), 2400);
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

populateSelect();
renderDevices();
animateParticles();
