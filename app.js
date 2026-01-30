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
        { name:"Leg Press", sets:3, reps:"12–15", load:"165–175" },
        { name:"DB RDL", sets:3, reps:"10", load:"95–105" },
        { name:"Glute Bridge", sets:3, reps:"12", load:"90–100" },
        { name:"Leg Curl", sets:3, reps:"12–15", load:"Moderate" },
        { name:"Standing Calf Raise", sets:3, reps:"15", load:"Moderate" },
      ],
    },
    {
      id: "d2",
      title: "Day 2 – Upper Push",
      meta: "Elbow-safe • Avoid grinding • Neutral grips",
      exercises: [
        { name:"Machine Chest Press", sets:3, reps:"10–12", load:"Moderate" },
        { name:"Incline DB Press", sets:3, reps:"10", load:"60–65" },
        { name:"Cable Fly", sets:3, reps:"15", load:"Light" },
        { name:"Rope Pushdown", sets:3, reps:"15", load:"Light" },
        { name:"Lateral Raise", sets:3, reps:"15", load:"Light" },
      ],
    },
    {
      id: "d4",
      title: "Day 4 – Lower (Quads)",
      meta: "Knee-friendly volume • Controlled reps",
      exercises: [
        { name:"Leg Press (Low Foot)", sets:4, reps:"12", load:"180–190" },
        { name:"Split Squat", sets:3, reps:"10", load:"BW / Light" },
        { name:"Leg Extension", sets:3, reps:"15", load:"Moderate" },
        { name:"Seated Curl", sets:3, reps:"12", load:"Moderate" },
        { name:"Calves", sets:3, reps:"15", load:"Moderate" },
      ],
    },
    {
      id: "d5",
      title: "Day 5 – Upper Pull",
      meta: "Minimize grip stress • Neutral handles",
      exercises: [
        { name:"Chest-Supported Row", sets:3, reps:"12", load:"Moderate" },
        { name:"Neutral Pulldown", sets:3, reps:"10–12", load:"Moderate" },
        { name:"Face Pull", sets:3, reps:"15", load:"Light" },
        { name:"Cable Curl (Neutral)", sets:3, reps:"15", load:"Light" },
        { name:"Wrist Isometric Hold", sets:3, reps:"30–45s", load:"Light" },
      ],
    },
  ],
};

const els = {
  daySelect: document.getElementById("daySelect"),
  dayTitle: document.getElementById("dayTitle"),
  dayMeta: document.getElementById("dayMeta"),
  warmup: document.getElementById("warmup"),
  list: document.getElementById("workoutList"),
  pct: document.getElementById("pct"),
  fill: document.getElementById("fill"),
  count: document.getElementById("count"),
  saved: document.getElementById("savedStatus"),

  time: document.getElementById("timeDisplay"),
  startPause: document.getElementById("startPauseBtn"),
  reset: document.getElementById("resetBtn"),
  autoStart: document.getElementById("autoStartTimer"),
  sound: document.getElementById("soundToggle"),
  beep: document.getElementById("beep"),

  newSession: document.getElementById("newSessionBtn"),
  clearAll: document.getElementById("clearAllBtn"),
};

const STORAGE_KEY = "workout_card_state_v1";

let state = loadState();
let timer = {
  total: 90,
  remaining: 90,
  running: false,
  t: null,
};

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { selectedDay: DATA.days[0].id, checks: {} };
    return JSON.parse(raw);
  } catch {
    return { selectedDay: DATA.days[0].id, checks: {} };
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  flashSaved();
}

let saveToastT = null;
function flashSaved(){
  els.saved.textContent = "Saved";
  els.saved.style.opacity = "1";
  clearTimeout(saveToastT);
  saveToastT = setTimeout(()=>{ els.saved.style.opacity = ".55"; }, 600);
}

function formatTime(sec){
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function renderDayOptions(){
  els.daySelect.innerHTML = "";
  DATA.days.forEach(d=>{
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.title.replace(" – ", " • ");
    els.daySelect.appendChild(opt);
  });
  els.daySelect.value = state.selectedDay;
}

function renderWarmup(){
  els.warmup.innerHTML = `
    <h3>WARM-UP</h3>
    ${DATA.warmup.map(w=>`
      <div class="wline">
        <div class="left">${w.name}</div>
        <div class="right">${w.detail}</div>
      </div>
    `).join("")}
  `;
}

function keyFor(dayId, exIdx, setIdx){
  return `${dayId}|${exIdx}|${setIdx}`;
}

function getDay(){
  return DATA.days.find(d=>d.id === state.selectedDay) || DATA.days[0];
}

function renderWorkout(){
  const day = getDay();
  els.dayTitle.textContent = day.title;
  els.dayMeta.textContent = day.meta;

  els.list.innerHTML = "";

  day.exercises.forEach((ex, exIdx)=>{
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

    for(let s=1; s<=ex.sets; s++){
      const k = keyFor(day.id, exIdx, s);
      const checked = !!state.checks[k];

      const pill = document.createElement("div");
      pill.className = "set" + (checked ? " done" : "");

      const id = `cb_${day.id}_${exIdx}_${s}`;
      pill.innerHTML = `
        <input type="checkbox" id="${id}" ${checked ? "checked":""}/>
        <label for="${id}">Set ${s}</label>
      `;

      const cb = pill.querySelector("input");
      cb.addEventListener("change", ()=>{
        state.checks[k] = cb.checked;
        pill.classList.toggle("done", cb.checked);
        saveState();
        updateProgress();

        if(cb.checked && els.autoStart.checked){
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

function updateProgress(){
  const day = getDay();
  let total = 0, done = 0;

  day.exercises.forEach((ex, exIdx)=>{
    for(let s=1; s<=ex.sets; s++){
      total++;
      const k = keyFor(day.id, exIdx, s);
      if(state.checks[k]) done++;
    }
  });

  const pct = total ? Math.round((done/total)*100) : 0;
  els.pct.textContent = `${pct}%`;
  els.fill.style.width = `${pct}%`;
  els.count.textContent = `${done} / ${total} sets`;
}

function setTimerSeconds(sec){
  timer.total = sec;
  timer.remaining = sec;
  timer.running = false;
  clearInterval(timer.t);
  timer.t = null;
  els.time.textContent = formatTime(timer.remaining);
  els.startPause.textContent = "Start";
}

function tick(){
  timer.remaining--;
  els.time.textContent = formatTime(timer.remaining);
  if(timer.remaining <= 0){
    stopTimer(true);
  }
}

function startTimer(){
  if(timer.running) return;
  timer.running = true;
  els.startPause.textContent = "Pause";
  timer.t = setInterval(tick, 1000);
}

function stopTimer(finished=false){
  timer.running = false;
  clearInterval(timer.t);
  timer.t = null;
  els.startPause.textContent = "Start";

  if(finished){
    setTimerSeconds(timer.total);
    if(els.sound.checked){
      try{ els.beep.currentTime = 0; els.beep.play(); }catch{}
    }
  }
}

function toggleStartPause(){
  if(timer.running) stopTimer(false);
  else startTimer();
}

function resetTimer(){
  setTimerSeconds(timer.total);
}

function clearCurrentDay(){
  const day = getDay();
  day.exercises.forEach((ex, exIdx)=>{
    for(let s=1; s<=ex.sets; s++){
      const k = keyFor(day.id, exIdx, s);
      delete state.checks[k];
    }
  });
  saveState();
  renderWorkout();
}

function clearAll(){
  state = { selectedDay: DATA.days[0].id, checks: {} };
  saveState();
  els.daySelect.value = state.selectedDay;
  renderWorkout();
}

function bindUI(){
  els.daySelect.addEventListener("change", ()=>{
    state.selectedDay = els.daySelect.value;
    saveState();
    renderWorkout();
  });

  els.startPause.addEventListener("click", toggleStartPause);
  els.reset.addEventListener("click", resetTimer);

  document.querySelectorAll(".chip").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const sec = Number(btn.dataset.seconds);
      setTimerSeconds(sec);
    });
  });

  els.newSession.addEventListener("click", clearCurrentDay);
  els.clearAll.addEventListener("click", clearAll);
}

function init(){
  renderDayOptions();
  renderWarmup();
  renderWorkout();
  bindUI();
  setTimerSeconds(90);
  els.saved.style.opacity = ".55";
}
init();
