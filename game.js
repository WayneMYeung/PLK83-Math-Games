(() => {
  "use strict";

  const WIDTH = 960;
  const HEIGHT = 540;
  const BASE_LENGTH = 38;
  const TIP_RADIUS = 9;
  const RUN_SECONDS = 90;
  const ROUNDS_PER_TIER = 3;
  const TOTAL_ROUNDS = 9;
  const ITEM_ANGLE_MIN = (53 * Math.PI) / 180;
  const ITEM_ANGLE_MAX = (127 * Math.PI) / 180;
  const STAGE_LABELS = ["S2–S3", "S4", "S5–S6"];
  const SWING_MIN = (50 * Math.PI) / 180;
  const SWING_MAX = (130 * Math.PI) / 180;
  const STATES = { START_SCREEN: "START_SCREEN", PLAYING: "PLAYING", GAME_OVER: "GAME_OVER" };
  const ITEM_COLORS = { fill: "#c5a879", stroke: "#f0d7a8", text: "#302517" };

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreValue = document.getElementById("scoreValue");
  const timeValue = document.getElementById("timeValue");
  const livesValue = document.getElementById("livesValue");
  const progressValue = document.getElementById("progressValue");
  const comboValue = document.getElementById("comboValue");
  const tierValue = document.getElementById("tierValue");
  const promptValue = document.getElementById("promptValue");
  const modal = document.getElementById("gameModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMessage = document.getElementById("modalMessage");
  const startForm = document.getElementById("startForm");
  const studentNumberInput = document.getElementById("studentNumber");
  const formError = document.getElementById("formError");
  const modalButton = document.getElementById("modalButton");
  const launchButton = document.getElementById("launchButton");
  const leaderboardList = document.getElementById("leaderboardList");
  const leaderboardStatus = document.getElementById("leaderboardStatus");

  let state = STATES.START_SCREEN;
  let score = 0;
  let lives = 3;
  let timeRemaining = RUN_SECONDS;
  let roundsCompleted = 0;
  let combo = 0;
  let cleanRound = true;
  let studentNumber = "";
  let currentQuestion = null;
  let items = [];
  let roundElapsed = 0;
  let usedQuestionIds = new Set();
  let lastFrameTime = 0;
  let feedback = "";
  let feedbackTime = 0;
  const pivot = { x: WIDTH / 2, y: 72 };
  const claw = { angle: Math.PI / 2, direction: 1, length: BASE_LENGTH, mode: "swing", activeItem: null };

  function setModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.hidden = false;
  }

  function hideModal() {
    modal.hidden = true;
  }

  function updateHud() {
    const stage = Math.min(Math.floor(roundsCompleted / ROUNDS_PER_TIER) + 1, 3);
    scoreValue.textContent = score.toLocaleString("en-HK");
    timeValue.textContent = `${Math.ceil(timeRemaining)}s`;
    timeValue.classList.toggle("time-low", timeRemaining <= 10);
    livesValue.textContent = `${"♥ ".repeat(Math.max(0, lives))}${"♡ ".repeat(3 - Math.max(0, lives))}`.trim();
    progressValue.textContent = `${roundsCompleted} / ${TOTAL_ROUNDS}`;
    comboValue.textContent = `×${(1 + Math.min(combo, 5) * 0.2).toFixed(1)}`;
    tierValue.textContent = `TIER ${stage} • ${STAGE_LABELS[stage - 1]}`;
    launchButton.disabled = state !== STATES.PLAYING || claw.mode !== "swing";
  }

  function shuffle(values) {
    const result = values.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function makeRoundItems(question) {
    const stage = question.stage;
    const definitions = [
      ...question.factors.map((text) => ({
        text, type: "factor", isCorrect: true, requiredFactor: true,
        value: 100 + stage * 50, weight: 1, size: 23
      })),
      ...question.distractors.map((text) => ({
        text, type: "rock", isCorrect: false, requiredFactor: false,
        value: -25 * stage, weight: 3 + stage * 0.3, size: 25
      }))
    ];
    const shuffledDefinitions = shuffle(definitions);
    const angles = getItemAngles(shuffledDefinitions.length);
    const movementProgress = roundsCompleted / (TOTAL_ROUNDS - 1);
    return shuffledDefinitions.map((definition, index) => {
      const baseLength = 390 + Math.random() * 18;
      const angle = angles[index];
      return {
        ...definition,
        angle,
        baseLength,
        x: pivot.x + baseLength * Math.cos(angle),
        baseY: pivot.y + baseLength * Math.sin(angle) + (Math.random() * 30 - 15),
        verticalMotion: 8 + 18 * movementProgress,
        motionSpeed: 0.8 + movementProgress * 1.25,
        motionPhase: index * 2.17 + Math.random() * 0.8,
        collected: false
      };
    });
  }

  function getItemAngles(count) {
    if (count === 1) return [Math.PI / 2];
    return Array.from({ length: count }, (_, index) =>
      ITEM_ANGLE_MIN + (ITEM_ANGLE_MAX - ITEM_ANGLE_MIN) * index / (count - 1)
    );
  }

  function beginRound() {
    const stage = Math.floor(roundsCompleted / ROUNDS_PER_TIER) + 1;
    const available = QUESTION_BANK.filter((question) => question.stage === stage && !usedQuestionIds.has(question.id));
    const pool = available.length ? available : QUESTION_BANK.filter((question) => question.stage === stage);
    currentQuestion = pool[Math.floor(Math.random() * pool.length)];
    usedQuestionIds.add(currentQuestion.id);
    items = makeRoundItems(currentQuestion);
    cleanRound = true;
    claw.length = BASE_LENGTH;
    claw.mode = "swing";
    claw.activeItem = null;
    promptValue.textContent = currentQuestion.prompt;
    updateHud();
  }

  function startGame() {
    const enteredNumber = studentNumberInput.value.trim();
    if (!/^\d{4}$/.test(enteredNumber)) {
      formError.textContent = "Enter all 4 digits of your student number.";
      studentNumberInput.focus();
      return;
    }
    studentNumber = enteredNumber;
    studentNumberInput.value = enteredNumber;
    formError.textContent = "";
    score = 0;
    lives = 3;
    timeRemaining = RUN_SECONDS;
    roundsCompleted = 0;
    combo = 0;
    usedQuestionIds = new Set();
    claw.angle = Math.PI / 2;
    claw.direction = 1;
    feedback = "";
    roundElapsed = 0;
    state = STATES.PLAYING;
    hideModal();
    beginRound();
  }

  function finishGame(message) {
    if (state !== STATES.PLAYING) return;
    state = STATES.GAME_OVER;
    setModal("Run complete!", `${message} Score: ${score.toLocaleString("en-HK")}. Saving your best score…`);
    modalButton.textContent = "Play again";
    formError.textContent = "";
    updateHud();
    saveRun();
  }

  async function saveRun() {
    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentNumber, score, questionsCompleted: roundsCompleted })
      });
      await readJsonResponse(response, "Score submission");
      await refreshLeaderboard();
      if (state === STATES.GAME_OVER) {
        modalMessage.textContent = `Score: ${score.toLocaleString("en-HK")}. Your best has been saved to the PLK83 leaderboard.`;
      }
    } catch (error) {
      leaderboardStatus.textContent = "Could not save score.";
      if (state === STATES.GAME_OVER) {
        modalMessage.textContent = `Score: ${score.toLocaleString("en-HK")}. Your score was not saved. ${describeServerError(error)}`;
      }
    }
  }

  async function readJsonResponse(response, operation) {
    const body = await response.text();
    let result = null;
    if (body) {
      try {
        result = JSON.parse(body);
      } catch {
        if (response.ok) throw new Error(`${operation} returned an invalid response.`);
      }
    }
    if (!response.ok) {
      const apiError = result && typeof result.error === "string" ? `: ${result.error}` : "";
      const emptyResponse = body ? "" : " with an empty response";
      throw new Error(`${operation} failed (HTTP ${response.status}${emptyResponse})${apiError}.`);
    }
    if (!result || typeof result !== "object") {
      throw new Error(`${operation} returned an empty response.`);
    }
    return result;
  }

  function describeServerError(error) {
    const detail = error instanceof Error ? error.message : "The server could not be reached.";
    if (window.location.protocol === "file:") {
      return `Open the game through its server instead: run npm start, then visit http://localhost:3000. ${detail}`;
    }
    return `${detail} Check that the game server is running.`;
  }

  async function refreshLeaderboard() {
    try {
      const response = await fetch("/api/leaderboard", { cache: "no-store" });
      const result = await readJsonResponse(response, "Leaderboard request");
      if (!Array.isArray(result.entries)) throw new Error("Leaderboard response is missing its entries.");
      leaderboardList.replaceChildren();
      if (!result.entries.length) {
        leaderboardStatus.textContent = "No scores yet. Be the first!";
        return;
      }
      result.entries.forEach((entry) => {
        const row = document.createElement("li");
        row.className = "leaderboard-row";
        const rank = document.createElement("span");
        rank.className = "leaderboard-rank";
        rank.textContent = `${entry.rank}.`;
        const id = document.createElement("span");
        id.className = "leaderboard-student";
        id.textContent = entry.studentNumber;
        const points = document.createElement("strong");
        points.className = "leaderboard-score";
        points.textContent = entry.score.toLocaleString("en-HK");
        row.append(rank, id, points);
        leaderboardList.append(row);
      });
      leaderboardStatus.textContent = "Best run for each student";
    } catch (error) {
      leaderboardStatus.textContent = describeServerError(error);
    }
  }

  function launch() {
    if (state !== STATES.PLAYING || claw.mode !== "swing") return;
    claw.mode = "out";
    launchButton.disabled = true;
  }

  function clawTip() {
    return {
      x: pivot.x + claw.length * Math.cos(claw.angle),
      y: pivot.y + claw.length * Math.sin(claw.angle)
    };
  }

  function itemBounds(item) {
    ctx.font = "700 13px Manrope, Segoe UI, sans-serif";
    const width = Math.max(item.size * 2, ctx.measureText(item.text).width + 22);
    const height = Math.max(item.size * 1.35, 32);
    return {
      left: item.x - width / 2, right: item.x + width / 2,
      top: item.y - height / 2, bottom: item.y + height / 2,
      width, height
    };
  }

  function circleIntersectsAabb(circle, bounds) {
    const nearestX = Math.max(bounds.left, Math.min(circle.x, bounds.right));
    const nearestY = Math.max(bounds.top, Math.min(circle.y, bounds.bottom));
    const dx = circle.x - nearestX;
    const dy = circle.y - nearestY;
    return dx * dx + dy * dy <= TIP_RADIUS * TIP_RADIUS;
  }

  function captureItem(item) {
    item.collected = true;
    claw.activeItem = item;
    claw.mode = "return";
  }

  function completeRound() {
    combo = cleanRound ? combo + 1 : 0;
    const multiplier = 1 + Math.min(Math.max(0, combo - 1), 5) * 0.2;
    const clearBonus = Math.round((100 * currentQuestion.stage + Math.ceil(timeRemaining)) * multiplier);
    score += clearBonus;
    feedback = `ROUND CLEAR +${clearBonus}`;
    feedbackTime = 1.5;
    roundsCompleted += 1;
    updateHud();
    if (roundsCompleted >= TOTAL_ROUNDS) {
      finishGame("You cleared all 9 questions!");
      return;
    }
    beginRound();
  }

  function finishHaul() {
    const item = claw.activeItem;
    if (item) {
      if (item.type === "rock") {
        lives -= 1;
        cleanRound = false;
      }
      score = Math.max(0, score + item.value);
      feedback = item.value >= 0 ? `+${item.value}` : `${item.value}`;
      feedbackTime = 1.2;
      claw.activeItem = null;
    }
    claw.mode = "swing";
    claw.length = BASE_LENGTH;
    if (lives <= 0) {
      finishGame("You ran out of lives.");
      return;
    }
    if (items.filter((candidate) => candidate.requiredFactor).every((candidate) => candidate.collected)) {
      completeRound();
      return;
    }
    updateHud();
  }

  function update(dt) {
    if (state !== STATES.PLAYING) return;
    timeRemaining = Math.max(0, timeRemaining - dt);
    if (timeRemaining === 0) {
      finishGame("Time ran out.");
      return;
    }
    roundElapsed += dt;
    updateItems();
    if (feedbackTime > 0) feedbackTime = Math.max(0, feedbackTime - dt);

    if (claw.mode === "swing") {
      claw.angle += claw.direction * 1.05 * dt;
      if (claw.angle >= SWING_MAX) {
        claw.angle = SWING_MAX;
        claw.direction = -1;
      } else if (claw.angle <= SWING_MIN) {
        claw.angle = SWING_MIN;
        claw.direction = 1;
      }
    } else if (claw.mode === "out") {
      claw.length += 390 * dt;
      const tip = clawTip();
      const hit = items.find((item) => !item.collected && circleIntersectsAabb(tip, itemBounds(item)));
      if (hit) {
        captureItem(hit);
      } else if (tip.x <= TIP_RADIUS || tip.x >= WIDTH - TIP_RADIUS ||
        tip.y <= TIP_RADIUS || tip.y >= HEIGHT - TIP_RADIUS) {
        claw.mode = "return";
      }
    } else if (claw.mode === "return") {
      const itemWeight = claw.activeItem ? claw.activeItem.weight : 1;
      claw.length -= (390 / Math.max(1, itemWeight)) * dt;
      if (claw.length <= BASE_LENGTH) {
        claw.length = BASE_LENGTH;
        finishHaul();
      }
    }
    updateHud();
  }

  function updateItems() {
    for (const item of items) {
      if (item.collected) continue;
      item.y = item.baseY + Math.sin(roundElapsed * item.motionSpeed + item.motionPhase) * item.verticalMotion;
    }
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#17283c");
    sky.addColorStop(0.58, "#203c50");
    sky.addColorStop(1, "#543f32");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgb(255 211 135 / 8%)";
    ctx.beginPath();
    ctx.arc(770, 115, 115, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#263b4b";
    ctx.beginPath();
    ctx.moveTo(0, 290);
    ctx.quadraticCurveTo(170, 245, 320, 295);
    ctx.quadraticCurveTo(500, 240, 660, 292);
    ctx.quadraticCurveTo(820, 250, WIDTH, 285);
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#594532";
    ctx.fillRect(0, 315, WIDTH, HEIGHT - 315);
    ctx.fillStyle = "#80613d";
    ctx.fillRect(0, 315, WIDTH, 8);
    ctx.strokeStyle = "rgb(221 185 128 / 13%)";
    ctx.lineWidth = 2;
    for (let x = 25; x < WIDTH; x += 74) {
      ctx.beginPath();
      ctx.moveTo(x, 345 + (x % 3) * 13);
      ctx.lineTo(x + 24, 352 + (x % 5) * 12);
      ctx.stroke();
    }
    ctx.fillStyle = "#d4a756";
    roundedRect(pivot.x - 42, 30, 84, 20, 7);
    ctx.fill();
    ctx.fillStyle = "#ffe09b";
    roundedRect(pivot.x - 34, 34, 68, 5, 2);
    ctx.fill();
  }

  function drawItem(item, position = item) {
    const bounds = itemBounds({ ...item, x: position.x, y: position.y });
    ctx.save();
    ctx.shadowColor = `${ITEM_COLORS.fill}66`;
    ctx.shadowBlur = 7;
    roundedRect(bounds.left, bounds.top, bounds.width, bounds.height, bounds.height / 2);
    ctx.fillStyle = ITEM_COLORS.fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = ITEM_COLORS.stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = ITEM_COLORS.text;
    ctx.font = "700 13px Manrope, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.text, position.x, position.y + 0.5, bounds.width - 14);
    ctx.restore();
  }

  function drawClaw() {
    const tip = clawTip();
    ctx.strokeStyle = "#dce3e8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pivot.x, pivot.y + 10);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.fillStyle = "#dce3e8";
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, TIP_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#27374a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tip.x + 5, tip.y + 1, 7, Math.PI * 0.52, Math.PI * 1.62);
    ctx.stroke();
    if (claw.activeItem) drawItem(claw.activeItem, { x: tip.x, y: tip.y + 31 });
  }

  function drawFeedback() {
    if (!feedback || feedbackTime <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, feedbackTime * 2);
    ctx.fillStyle = feedback.includes("-") ? "#ff9b8c" : "#ffe09b";
    ctx.font = "800 20px Manrope, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(feedback, pivot.x, 120);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground();
    for (const item of items) if (!item.collected) drawItem(item);
    drawClaw();
    drawFeedback();
  }

  function frame(timestamp) {
    const dt = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.05) : 0;
    lastFrameTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  startForm.addEventListener("submit", (event) => {
    event.preventDefault();
    startGame();
  });
  studentNumberInput.addEventListener("input", () => {
    studentNumberInput.value = studentNumberInput.value.replace(/\D/g, "").slice(0, 4);
    formError.textContent = "";
  });
  launchButton.addEventListener("click", launch);
  canvas.addEventListener("click", launch);
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && state === STATES.PLAYING) {
      event.preventDefault();
      launch();
    }
  });

  setModal("Ready to mine?", "Collect every factor. Build a streak, save your lives, and climb the tiers.");
  updateHud();
  refreshLeaderboard();
  window.setInterval(refreshLeaderboard, 30_000);
  requestAnimationFrame(frame);
})();
