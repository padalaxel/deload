/* ================================
   Workout Card App (Elbow-Safe)
   - Set checkboxes per set
   - Rest timer (sidebar + modal popup)
   - Auto-open modal + auto-start timer when a set is checked
   - LocalStorage persistence
   ================================ */

const DATA = {
  warmup: [
    { name: "Bike / Walk", detail: "1 × 3 min" },
    { name: "Band Pull-Aparts", detail: "2 × 15" },
    { name: "Wrist Circles", detail: "2 × 30s each way" },
    { name: "Light Pushdowns", detail: "2 × 15 (blood flow only)" },
  ],
  days: [
    {
      id: "d1",
      title: "Day 1 – Lower (Posterior Chain)",
      meta: "No straps • Smooth reps • RIR 2–3",
      exercises: [
        { name: "Leg Press", sets: 3, reps: "12–15", load: "165–175" },
        { name: "DB RDL", sets: 3, reps: "10", load: "95–105" },
        { name: "Glute Bridge", sets: 3, reps: "12", load: "90–100" },
        { name: "Leg Curl", sets: 3, reps: "12–15", load: "Moderate" },
        { name: "Standing Calf Raise", sets: 3, reps: "15", load: "Moderate" },
      ],
    },
    {
      id: "d2",
      title: "Day 2 – Upper Push",
      meta: "Elbow-safe • Avoid grinding • Neutral grips",
      exercises: [
        { name: "Machine Chest Press", sets: 3, reps: "10–12", load: "Moderate" },
        { name: "Incline DB Press", sets: 3, reps: "10", load: "60–65" },
        { name: "Cable Fly", sets: 3, reps: "15", load: "Light" },
        { name: "Rope Pushdown", sets: 3, reps: "15", load: "Light" },
        { name: "Lateral Raise", sets: 3, reps: "15", load: "Light" },
      ],
    },
    {
      id: "d4",
      title: "Day 4 – Lower (Quads)",
      meta: "Knee-friendly volume • Controlled reps",
      exercises: [
        { name: "Leg Press (Low Foot)", sets: 4, reps: "12", load: "180–190" },
        { name: "Split Squat", sets: 3, reps: "10", load: "BW / Light" },
        { name: "Leg Extension", sets: 3, reps: "15", load: "Moderate" },
        { name: "Seated Curl", sets: 3, reps: "12", load: "Moderate" },
        { name: "Calves", sets: 3, reps: "15", load: "Moderate" },
      ],
    },
    {
      id: "d5",
      title: "Day 5 – Upper Pull",
      meta: "Minimize grip stress • Neutral handles",
      exercises: [
        { name: "Chest-Supported Row", sets: 3, reps: "12", load: "Moderate" },
        { name: "Neutral Pulldown", sets: 3, reps: "10–12", load: "Moderate" },
        { name: "Face Pull", sets: 3, reps: "15", load: "Light" },
        { name: "Cable Curl (Neutral)", sets: 3, reps: "15", load: "Light" },
        { name: "Wrist Isometric Hold", sets: 3, reps: "30–45s", load: "Light" },
      ],
    },
  ],
};

/* ========= DOM ========= */
const els = {
  // header / day selection
  daySelect: document.getElementById("daySelect"),
  dayTitle: document.getElementById("dayTitle"),
  dayMeta: document.getElementById("dayMeta"),
  warmup: document.getElementById("warmup"),
  list: document.getElementById("workoutList"),
  pct: document.getElementById("pct"),
  fill: document.getElementById("fill"),
  count: document.getElementById("count"),
  saved: document.getElementById("savedStatus"),

  // sidebar timer
  time: document.getElementById("timeDisplay"),
  startPause: document.getElementById("startPauseBtn"),
  reset: document.getElementById("resetBtn"),
  autoStart: document.getElementById("autoStartTimer"),
  sound: document.getElementById("soundToggle"),

  // audio
  beep: document.getElementById("beep"),

  // session controls
  newSession: document.getElementById("newSessionBtn"),
  clearAll: document.getElementById("clearAllBtn"),

  // modal timer
  timerModal: document.getElementById("timerModal"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  modalTime: document.getElementById("modalTimeDisplay"),
  modalStartPause: document.getElementById("modalStartPauseBtn"),
  modalReset: document.getElementById("modalResetBtn"),
  modalContext: document.getElementById("modalContext"),
  modalSound: document.getElementById("modalSoundToggle"),
};

const STORAGE_KEY = "workout_card_state_v2";

/* ========= State ========= */
let state = loadState();

let timer = {
  total: 90,
  remaining: 90,
  running: false,
  t: null,
};

/* ========= Storage ========= */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { selectedDay: DATA.days[0].id, checks: {} };
    const parsed = JSON.parse(raw);
    if (!parsed.selectedDay || !parsed.checks) return { selectedDay: DATA.days[0].id, checks: {} };
    return parsed;
  } catch {
    return { selectedDay: DATA.days[0].id, checks: {} };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  flashSaved();
}

let saveToastT = null;
function flashSaved() {
  if (!els.saved) return;
  els.saved.textContent = "Saved";
  els.saved.style.opacity = "1";
  clearTimeout(saveToastT);
  saveToastT = setTimeout(() => {
    els.saved.style.opacity = ".55";
  }, 600);
}

/* ========= Helpers ========= */
function getDay() {
  return DATA.days.find((d) => d.id === state.selectedDay) || DATA.days[0];
}

function keyFor(dayId, exIdx, setIdx) {
  return `${dayId}|${exIdx}|${setIdx}`;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ========= Modal ========= */
function openTimerModal(contextText) {
  if (!els.timerModal) return;
  els.modalContext.textContent = contextText || "Next set when it hits 0.";
  els.timerModal.classList.add("open");
  els.timerModal.setAttribute("aria-hidden", "false");
}

function closeTimerModal() {
  if (!els.timerModal) return;
  els.timerModal.classList.remove("open");
  els.timerModal.setAttribute("aria-hidden", "true");
}

/* ========= Timer ========= */
function updateTimerDisplays() {
  const txt = formatTime(timer.remaining);
  if (els.time) els.time.textContent = txt;
  if (els.modalTime) els.modalTime.textContent = txt;

  const label = timer.running ? "Pause" : "Start";
  if (els.startPause) els.startPause.textContent = label;
  if (els.modalStartPause) els.modalStartPause.textContent = label;
}

function setTimerSeconds(sec) {
  timer.total = sec;
  timer.remaining = sec;
  timer.running = false;
  clearInterval(timer.t);
  timer.t = null;
  updateTimerDisplays();
}

function tick() {
  timer.remaining--;
  updateTimerDisplays();
  if (timer.remaining <= 0) stopTimer(true);
}

function startTimer() {
  if (timer.running) return;
  timer.running = true;
  updateTimerDisplays();
  timer.t = setInterval(tick, 1000);
}

function stopTimer(finished = false) {
  timer.running = false;
  clearInterval(timer.t);
  timer.t = null;
  updateTimerDisplays();

  if (finished) {
    const soundOn = (els.modalSound?.checked ?? els.sound?.checked) === true;
    if (soundOn && els.beep) {
      try {
        els.beep.currentTime = 0;
        els.beep.play();
      } catch {}
    }

    // Reset for next rest interval
    timer.remaining = timer.total;
    updateTimerDisplays();
  }
}

function toggleStartPause() {
  if (timer.running) stopTimer(false);
  else startTimer();
}

function resetTimer() {
  setTimerSeconds(timer.total);
}

/* ========= Render ========= */
function renderDayOptions() {
  if (!els.daySelect) return;
  els.daySelect.innerHTML = "";
  DATA.days.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.title.replace(" – ", " • ");
    els.daySelect.appendChild(opt);
  });
  els.daySelect.value = state.selectedDay;
}

function renderWarmup() {
  if (!els.warmup) return;
  els.warmup.innerHTML = `
    <h3>WARM-UP</h3>
    ${DATA.warmup
      .map(
        (w) => `
        <div class="wline">
          <div class="left">${w.name}</div>
          <div class="right">${w.detail}</div>
        </div>
      `
      )
      .join("")}
  `;
}

function renderWorkout() {
  const day = getDay();

  if (els.dayTitle) els.dayTitle.textContent = day.title;
  if (els.dayMeta) els.dayMeta.textContent = day.meta;
  if (els.list) els.list.innerHTML = "";

  day.exercises.forEach((ex, exIdx) => {
    const wrap = document.createElement("div");
    wrap.className = "exercise";

    const head = document.createElement("div");
    head.className = "exHead";
    head.innerHTML = `
      <div>
        <div class="exName">${ex.name}</div>
        <div class="exNote">${ex.sets} sets • ${ex.reps} reps</div>
      </div>
      <div class="exTarget">${ex.load}</div>
    `;

    const sets = document.createElement("div");
    sets.className = "sets";

    for (let s = 1; s <= ex.sets; s++) {
      const k = keyFor(day.id, exIdx, s);
      const checked = !!state.checks[k];

      const pill = document.createElement("div");
      pill.className = "set" + (checked ? " done" : "");

      const id = `cb_${day.id}_${exIdx}_${s}`;
      pill.innerHTML = `
        <input type="checkbox" id="${id}" ${checked ? "checked" : ""} />
        <label for="${id}">Set ${s}</label>
      `;

      const cb = pill.querySelector("input");
      cb.addEventListener("change", () => {
        state.checks[k] = cb.checked;
        pill.classList.toggle("done", cb.checked);
        saveState();
        updateProgress();

        // Pop modal + start timer when you complete a set
        if (cb.checked && els.autoStart?.checked) {
          openTimerModal(`${ex.name} • Set ${s} done — rest then go again`);
          startTimer();
        }
      });

      sets.appendChild(pill);
    }

    wrap.appendChild(head);
    wrap.appendChild(sets);
    els.list.appendChild(wrap);
  });

  updateProgress();
}

function updateProgress() {
  const day = getDay();
  let total = 0;
  let done = 0;

  day.exercises.forEach((ex, exIdx) => {
    for (let s = 1; s <= ex.sets; s++) {
      total++;
      const k = keyFor(day.id, exIdx, s);
      if (state.checks[k]) done++;
    }
  });

  const pct = total ? Math.round((done / total) * 100) : 0;
  if (els.pct) els.pct.textContent = `${pct}%`;
  if (els.fill) els.fill.style.width = `${pct}%`;
  if (els.count) els.count.textContent = `${done} / ${total} sets`;
}

/* ========= Session actions ========= */
function clearCurrentDay() {
  const day = getDay();
  day.exercises.forEach((ex, exIdx) => {
    for (let s = 1; s <= ex.sets; s++) {
      const k = keyFor(day.id, exIdx, s);
      delete state.checks[k];
    }
  });
  saveState();
  renderWorkout();
}

function clearAll() {
  state = { selectedDay: DATA.days[0].id, checks: {} };
  saveState();
  if (els.daySelect) els.daySelect.value = state.selectedDay;
  renderWorkout();
}

/* ========= UI bindings ========= */
function bindUI() {
  els.daySelect?.addEventListener("change", () => {
    state.selectedDay = els.daySelect.value;
    saveState();
    renderWorkout();
  });

  els.startPause?.addEventListener("click", toggleStartPause);
  els.reset?.addEventListener("click", resetTimer);

  // preset chips (sidebar + modal)
  document.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sec = Number(btn.dataset.seconds);
      setTimerSeconds(sec);
    });
  });

  els.newSession?.addEventListener("click", clearCurrentDay);
  els.clearAll?.addEventListener("click", clearAll);

  // modal controls
  els.modalBackdrop?.addEventListener("click", closeTimerModal);
  els.closeModalBtn?.addEventListener("click", closeTimerModal);
  els.modalStartPause?.addEventListener("click", toggleStartPause);
  els.modalReset?.addEventListener("click", resetTimer);

  // keep sound toggles in sync
  if (els.modalSound && els.sound) {
    els.modalSound.addEventListener("change", () => {
      els.sound.checked = els.modalSound.checked;
    });
    els.sound.addEventListener("change", () => {
      els.modalSound.checked = els.sound.checked;
    });
  }

  // ESC closes modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeTimerModal();
  });
}

/* ========= Init ========= */
function init() {
  renderDayOptions();
  renderWarmup();
  renderWorkout();
  bindUI();

  setTimerSeconds(90);
  updateTimerDisplays();

  if (els.modalSound && els.sound) {
    els.modalSound.checked = els.sound.checked;
  }

  if (els.saved) els.saved.style.opacity = ".55";
}

init();
