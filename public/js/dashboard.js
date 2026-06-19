// Dashboard state
let currentMoodScore = 3;
let currentEnergyScore = 3;
let waterLevel = 0;
let weightChartInstance = null;

function buildTimeline() {
  const phaseIdx = getUserPhaseIndex();
  const curMonthIdx = getUserMonthIndex();
  const container = document.getElementById("timelineContainer");
  container.innerHTML = "";

  // ── Phase banner ──
  const phaseNames = ["Foundation","Strength","Cut Phase"];
  const phaseBg = ["#f0fdf4","#eff6ff","#fffbeb"];
  const phaseBorder = ["#bbf7d0","#bfdbfe","#fde68a"];
  const banner = document.createElement("div");
  banner.style.cssText = "background:" + phaseBg[phaseIdx] + ";border:1px solid " + phaseBorder[phaseIdx] + ";border-radius:10px;padding:10px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:8px";
  banner.innerHTML = "<div><div style='font-weight:700;font-size:.85rem;color:var(--primary)'>📅 Month " + (curMonthIdx+1) + " of 6 — " + phaseNames[phaseIdx] + " Phase</div><div style='font-size:.72rem;color:var(--text-light);margin-top:2px'>" + WORKOUT_PHASES[curMonthIdx].focus + "</div></div><span style='font-size:.7rem;background:var(--primary);color:#fff;padding:3px 8px;border-radius:12px;white-space:nowrap'>" + WORKOUT_PHASES[curMonthIdx].phase + "</span>";
  container.appendChild(banner);

  // ── Today's meals preview ──
  const todayName = new Date().toLocaleDateString("en-US",{weekday:"long"});
  const md = MONTHLY_DIET[curMonthIdx];
  const todayMeals = md && md.days && md.days[todayName];
  if (todayMeals) {
    const mealsDiv = document.createElement("div");
    mealsDiv.style.cssText = "background:#fafafa;border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin-bottom:12px";
    const mealKeys = ["breakfast","lunch","snack","dinner"];
    let totalCal = 0;
    let rows = "";
    mealKeys.forEach(function(k) {
      const m = todayMeals.meals[k];
      if (!m) return;
      totalCal += (m.cal || 0);
      rows += "<div style='display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);font-size:.75rem'>" +
        "<span>" + m.icon + " <strong>" + k.charAt(0).toUpperCase() + k.slice(1) + "</strong></span>" +
        "<span style='color:var(--text-med);flex:1;text-align:center;padding:0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>" + m.name + "</span>" +
        "<span style='color:var(--accent-dark);font-weight:600;white-space:nowrap'>" + m.cal + " kcal</span></div>";
    });
    mealsDiv.innerHTML = "<div style='font-weight:700;font-size:.78rem;color:var(--primary);margin-bottom:8px'>🍽️ Today's Meals — " + todayName + "</div>" + rows +
      "<div style='font-size:.72rem;font-weight:700;color:var(--primary);margin-top:6px;text-align:right'>Total: ~" + totalCal + " kcal</div>";
    container.appendChild(mealsDiv);
  }

  // ── Use custom timeline if set, else fall back to phase default ──
  const tasks = (currentUser && currentUser.customTimeline && currentUser.customTimeline.length > 0)
    ? currentUser.customTimeline.slice().sort((a, b) => a.order - b.order)
    : PHASE_TASKS[phaseIdx];

  tasks.forEach(function(task, i) {
    const div = document.createElement("div");
    div.className = "timeline-item";
    div.id = "titem-" + i;
    div.innerHTML = "<span class='t-time'>" + task.time + "</span><span class='t-text'>" + task.text + "</span><input type='checkbox' id='chk-" + i + "' onchange='onCheckChange(" + i + ")'>";
    container.appendChild(div);
  });
  updateCheckStat();
}

function onCheckChange(i) {
  const chk = document.getElementById("chk-" + i);
  document.getElementById("titem-" + i).classList.toggle("done", chk.checked);
  updateCheckStat();
  syncData();
}

function updateCheckStat() {
  const tasks = (currentUser && currentUser.customTimeline && currentUser.customTimeline.length > 0)
    ? currentUser.customTimeline
    : PHASE_TASKS[getUserPhaseIndex()];
  const total = tasks.length;
  let done = 0;
  for (let i = 0; i < total; i++) {
    const c = document.getElementById("chk-" + i);
    if (c && c.checked) done++;
  }
  document.getElementById("checkStat").textContent = done + "/" + total;
}

// ── Timeline Editor ──
function openTimelineEditor() {
  const tasks = (currentUser && currentUser.customTimeline && currentUser.customTimeline.length > 0)
    ? currentUser.customTimeline
    : PHASE_TASKS[getUserPhaseIndex()];
  const list = document.getElementById("tlEditorList");
  list.innerHTML = "";
  tasks.forEach(function(task) { addTimelineEditorRow(task.time, task.text); });
  document.getElementById("timelineEditorOverlay").style.display = "flex";
}

function closeTimelineEditor() {
  document.getElementById("timelineEditorOverlay").style.display = "none";
}

function addTimelineEditorRow(time, text) {
  time = time || "";
  text = text || "";
  const list = document.getElementById("tlEditorList");
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:8px;align-items:center";
  row.innerHTML =
    '<input type="text" placeholder="06:30 AM" value="' + time + '" maxlength="20"' +
    ' style="width:90px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:.82rem;background:#f8f9fa">' +
    '<input type="text" placeholder="Task description" value="' + text + '" maxlength="120"' +
    ' style="flex:1;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:.82rem;background:#f8f9fa">' +
    '<button onclick="this.parentElement.remove()"' +
    ' style="background:#fee2e2;border:none;color:#dc2626;padding:7px 10px;border-radius:8px;cursor:pointer;font-weight:700">✕</button>';
  list.appendChild(row);
}

async function saveCustomTimeline() {
  const rows = document.querySelectorAll("#tlEditorList > div");
  const items = Array.from(rows).map(function(row, i) {
    const inputs = row.querySelectorAll("input");
    return { time: inputs[0].value.trim(), text: inputs[1].value.trim(), order: i };
  }).filter(function(it) { return it.time && it.text; });

  if (items.length === 0) {
    alert("Please add at least one timeline task.");
    return;
  }
  try {
    const res = await apiFetch("/api/auth/timeline", { method: "PATCH", body: { items } });
    if (res && res.ok) {
      currentUser.customTimeline = items;
      buildTimeline();
      closeTimelineEditor();
    }
  } catch (e) { console.warn("saveCustomTimeline failed", e); }
}

async function resetToPhaseTimeline() {
  if (!confirm("Reset timeline to the phase default? Your custom tasks will be removed.")) return;
  try {
    const res = await apiFetch("/api/auth/timeline", { method: "DELETE" });
    if (res && res.ok) {
      currentUser.customTimeline = undefined;
      buildTimeline();
      closeTimelineEditor();
    }
  } catch (e) { console.warn("resetToPhaseTimeline failed", e); }
}

function toggleWater(l) {
  waterLevel = (waterLevel === l) ? l - 1 : l;
  for(let i=1;i<=4;i++) {
    document.getElementById("w"+i).classList.toggle("filled", i <= waterLevel);
  }
  document.getElementById("waterStat").textContent = waterLevel + "/4L";
  syncData();
}

function setScore(type, val, btn) {
  if(type === "mood") {
    currentMoodScore = val;
    document.querySelectorAll("#moodRow .score-btn").forEach(b => b.classList.remove("sel"));
  } else {
    currentEnergyScore = val;
    document.querySelectorAll("#energyRow .score-btn").forEach(b => b.classList.remove("sel"));
  }
  btn.classList.add("sel");
  syncData();
}

async function loadDateData() {
  const date = document.getElementById("logDate").value;
  try {
    const res = await apiFetch("/api/logs/" + date);
    const data = await res.json();
    // Sync checklist — use actual task count (custom or phase default)
    const tasks = (currentUser && currentUser.customTimeline && currentUser.customTimeline.length > 0)
      ? currentUser.customTimeline
      : PHASE_TASKS[getUserPhaseIndex()];
    const phLen = tasks.length;
    for(let i=0;i<phLen;i++) {
      const chk = document.getElementById("chk-"+i);
      if(chk) {
        chk.checked = (data.checklist && data.checklist[i] && data.checklist[i].done) || false;
        document.getElementById("titem-"+i).classList.toggle("done", chk.checked);
      }
    }
    // Weight
    if(data.weight > 0) {
      document.getElementById("currentWeight").value = data.weight;
      document.getElementById("weightStat").textContent = data.weight;
      updateBMI(data.weight);
    }
    // Water
    waterLevel = data.waterIntake || 0;
    for(let i=1;i<=4;i++) document.getElementById("w"+i).classList.toggle("filled", i <= waterLevel);
    document.getElementById("waterStat").textContent = waterLevel + "/4L";
    // Workout
    document.getElementById("workoutToggle").checked = data.completedWorkout || false;
    document.getElementById("workoutNotes").value = data.workoutNotes || data.notes || "";
    // Mood & Energy
    currentMoodScore = data.moodScore || 3;
    currentEnergyScore = data.energyScore || 3;
    document.querySelectorAll("#moodRow .score-btn").forEach((b,i) => b.classList.toggle("sel", i+1===currentMoodScore));
    document.querySelectorAll("#energyRow .score-btn").forEach((b,i) => b.classList.toggle("sel", i+1===currentEnergyScore));
    updateCheckStat();
  } catch(e) {
    console.warn("loadDateData: API offline");
  }
}

async function syncData() {
  const date = document.getElementById("logDate").value;
  const weight = parseFloat(document.getElementById("currentWeight").value) || 95;
  const notes = document.getElementById("workoutNotes").value;
  document.getElementById("weightStat").textContent = weight;
  updateBMI(weight);
  const tasks = (currentUser && currentUser.customTimeline && currentUser.customTimeline.length > 0)
    ? currentUser.customTimeline
    : PHASE_TASKS[getUserPhaseIndex()];
  const checklist = tasks.map(function(_, i) {
    const c = document.getElementById("chk-" + i);
    return { done: c ? c.checked : false };
  });
  const payload = { date, checklist, waterIntake: waterLevel, weight, completedWorkout: document.getElementById("workoutToggle").checked, moodScore: currentMoodScore, energyScore: currentEnergyScore, notes };
  try {
    await apiFetch("/api/logs", { method:"POST", body: payload });
  } catch(e) { console.warn("syncData: API offline"); }
}

function updateCalorieStat() {
  const curM = getUserMonthIndex();
  const md = MONTHLY_DIET[curM];
  const calEl = document.getElementById("calorieStat");
  const subEl = document.getElementById("calorieStatSub");
  if (calEl && md) {
    const cal = (md.calories || "").replace("~","").replace(" kcal/day","").replace("/day","").trim();
    calEl.textContent = cal;
    const phasePart = (md.name || "").split("—")[1];
    if (subEl) subEl.textContent = "kcal/day · " + (phasePart ? phasePart.trim() : "Month " + (curM+1));
  }
}

function setGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const day = new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
  // Use logged-in user's first name; fall back to 'there' if not yet loaded
  const name = (currentUser && currentUser.name) ? currentUser.name.split(' ')[0] : 'there';
  document.getElementById("dashGreeting").textContent = `${greet}, ${name}! · ${day}`;
}
