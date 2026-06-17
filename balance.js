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

function sccyberInstallBalanceStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .action-count{
      display:block;
      margin-top:5px;
      color:#ffd44d;
      font-size:8px;
      line-height:1.5;
    }

    .balance-panel{
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

    .balance-panel strong{
      color:#ffd44d;
      font-family:'Press Start 2P', cursive;
      font-size:9px;
      line-height:1.7;
      display:block;
      margin-bottom:8px;
    }

    .action-btn.used-up{
      opacity:0.45;
      cursor:not-allowed;
      filter:grayscale(0.5);
    }
  `;
  document.head.appendChild(style);
}

function sccyberCreateBalancePanel() {
  const controlCard = document.querySelector(".control-card");
  const rulesCard = document.querySelector(".rules-card");
  if (!controlCard || !rulesCard || document.getElementById("balancePanel")) return;

  const panel = document.createElement("div");
  panel.className = "balance-panel";
  panel.id = "balancePanel";
  panel.innerHTML = `
    <strong>DEFENCE RESOURCES</strong>
    You cannot protect everything. Choose carefully under pressure.
  `;

  controlCard.insertBefore(panel, rulesCard);
}

function sccyberUpdateActionButtons() {
  lockoutBtn.innerHTML = `ENABLE LOCKOUT<span class="action-count">${SCCYBER_LIMITS.lockout - sccyberUsage.lockout} LEFT</span>`;
  mfaBtn.innerHTML = `APPLY MFA<span class="action-count">${SCCYBER_LIMITS.mfa - sccyberUsage.mfa} LEFT</span>`;
  isolateBtn.innerHTML = `ISOLATE DEVICE<span class="action-count">${SCCYBER_LIMITS.isolate - sccyberUsage.isolate} LEFT</span>`;

  lockoutBtn.classList.toggle("used-up", sccyberUsage.lockout >= SCCYBER_LIMITS.lockout);
  mfaBtn.classList.toggle("used-up", sccyberUsage.mfa >= SCCYBER_LIMITS.mfa);
  isolateBtn.classList.toggle("used-up", sccyberUsage.isolate >= SCCYBER_LIMITS.isolate);
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
    return;
  }

  if (device.lockout) {
    addLog(`${device.name} already has lockout enabled.`, "warn");
    sccyberUsage.wasted += 1;
    return;
  }

  sccyberUsage.lockout += 1;
  sccyberUsage.successful += 1;
  device.lockout = true;
  addLog(`Lockout enabled on ${device.name}.`, "good");
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
    return;
  }

  if (device.type !== "server" && device.type !== "endpoint") {
    addLog(`MFA is not available on ${device.name} in this simulation.`, "warn");
    sccyberUsage.wasted += 1;
    return;
  }

  if (device.mfa) {
    addLog(`${device.name} already has MFA applied.`, "warn");
    sccyberUsage.wasted += 1;
    return;
  }

  sccyberUsage.mfa += 1;
  sccyberUsage.successful += 1;
  device.mfa = true;
  addLog(`MFA applied to ${device.name}.`, "good");
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
    return;
  }

  if (device.type === "switch") {
    addLog("The switch cannot be isolated in this simulation.", "warn");
    sccyberUsage.wasted += 1;
    return;
  }

  if (device.isolated) {
    addLog(`${device.name} is already isolated.`, "warn");
    sccyberUsage.wasted += 1;
    return;
  }

  sccyberUsage.isolate += 1;
  sccyberUsage.successful += 1;
  device.isolated = true;
  addLog(`${device.name} has been isolated from the estate.`, "warn");
  spawnShieldBurst(device.id);
  sccyberUpdateActionButtons();
  renderDevices();
  checkGameState();
}

function sccyberInstallBalanceLayer() {
  sccyberInstallBalanceStyles();
  sccyberCreateBalancePanel();
  sccyberUpdateActionButtons();

  lockoutBtn.addEventListener("click", sccyberUseLockout, true);
  mfaBtn.addEventListener("click", sccyberUseMfa, true);
  isolateBtn.addEventListener("click", sccyberUseIsolate, true);
}

sccyberInstallBalanceLayer();