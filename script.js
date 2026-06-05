const form = document.getElementById("generator-form");
const summaryEl = document.getElementById("summary");
const resultsEl = document.getElementById("results");
const desktopTableWrap = document.getElementById("desktopTableWrap");
const mobileCards = document.getElementById("mobileCards");
const regenBtn = document.getElementById("regenBtn");
const shareBtn = document.getElementById("shareBtn");
const pdfBtn = document.getElementById("pdfBtn");
const filterButtons = [...document.querySelectorAll("[data-filter]")];

let lastRequest = null;
let scheduleData = [];
let currentFilter = "ALL";
let currentSeed = Date.now();

function makeRng(seed) {
  let t = seed + 0x6d2b79f5;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function toMinute(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toClock(minute) {
  const h = Math.floor(minute / 60)
    .toString()
    .padStart(2, "0");
  const m = (minute % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function makeTimeSlots(startTime, endTime, matchMinutes) {
  const start = toMinute(startTime);
  const end = toMinute(endTime);
  const slots = [];
  for (let cur = start; cur + matchMinutes <= end; cur += matchMinutes) {
    slots.push(toClock(cur));
  }
  return slots;
}

function buildPlayers(prefix, count) {
  return Array.from({ length: count }, (_, idx) => `${prefix}${idx + 1}`);
}

function shuffledCopy(list, rand) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pairKey(a, b) {
  return [a, b].sort().join("|");
}

function parseTypeLabel(type) {
  if (type === "MD") return "남복";
  if (type === "WD") return "여복";
  return "혼복";
}

function getSelectedTypes() {
  return [...document.querySelectorAll(".checkbox-group input[type='checkbox']:checked")].map((el) => el.value);
}

function isCurrentSlot(timeLabel, matchMinutes) {
  const now = new Date();
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const slotStart = toMinute(timeLabel);
  const slotEnd = slotStart + matchMinutes;
  return nowMinute >= slotStart && nowMinute < slotEnd;
}

function validateInput(input) {
  const { maleCount, femaleCount, courtCount, startTime, endTime, matchMinutes, types } = input;
  if (maleCount < 0 || femaleCount < 0) return "인원 수는 0 이상이어야 합니다.";
  if (courtCount < 1) return "코트 수는 1 이상이어야 합니다.";
  if (toMinute(endTime) <= toMinute(startTime)) return "종료시간은 시작시간보다 늦어야 합니다.";
  if (matchMinutes < 10) return "경기시간은 최소 10분이어야 합니다.";
  if (types.length === 0) return "최소 1개 경기 유형을 선택해주세요.";
  if (types.includes("MD") && maleCount < 4) return "남자복식을 위해 남성 4명 이상이 필요합니다.";
  if (types.includes("WD") && femaleCount < 4) return "여자복식을 위해 여성 4명 이상이 필요합니다.";
  if (types.includes("MXD") && (maleCount < 2 || femaleCount < 2)) return "혼합복식을 위해 남성/여성 각 2명 이상이 필요합니다.";
  return null;
}

function createRequestFromForm() {
  return {
    maleCount: Number(document.getElementById("maleCount").value),
    femaleCount: Number(document.getElementById("femaleCount").value),
    courtCount: Number(document.getElementById("courtCount").value),
    startTime: document.getElementById("startTime").value,
    endTime: document.getElementById("endTime").value,
    matchMinutes: Number(document.getElementById("matchMinutes").value),
    types: getSelectedTypes()
  };
}

function fillFormFromQuery() {
  const q = new URLSearchParams(location.search);
  const values = {
    maleCount: q.get("m"),
    femaleCount: q.get("f"),
    courtCount: q.get("c"),
    startTime: q.get("s"),
    endTime: q.get("e"),
    matchMinutes: q.get("d")
  };
  if (values.maleCount) document.getElementById("maleCount").value = values.maleCount;
  if (values.femaleCount) document.getElementById("femaleCount").value = values.femaleCount;
  if (values.courtCount) document.getElementById("courtCount").value = values.courtCount;
  if (values.startTime) document.getElementById("startTime").value = values.startTime;
  if (values.endTime) document.getElementById("endTime").value = values.endTime;
  if (values.matchMinutes) document.getElementById("matchMinutes").value = values.matchMinutes;

  const rawTypes = q.get("t");
  if (rawTypes) {
    const set = new Set(rawTypes.split(","));
    document.querySelectorAll(".checkbox-group input[type='checkbox']").forEach((el) => {
      el.checked = set.has(el.value);
    });
  }
  const seed = q.get("seed");
  if (seed) currentSeed = Number(seed);
}

function makeMatch(type, males, females, state, rand) {
  const needed = type === "MD" ? ["M", "M", "M", "M"] : type === "WD" ? ["F", "F", "F", "F"] : ["M", "M", "F", "F"];
  const malePool = shuffledCopy(males, rand);
  const femalePool = shuffledCopy(females, rand);
  const selectedM = [];
  const selectedF = [];

  for (const token of needed) {
    const pool = token === "M" ? malePool : femalePool;
    const target = token === "M" ? selectedM : selectedF;
    const pick = pool.find((name) => !target.includes(name) && !selectedM.includes(name) && !selectedF.includes(name));
    if (!pick) return null;
    target.push(pick);
  }

  let teamA;
  let teamB;
  if (type === "MXD") {
    teamA = [selectedM[0], selectedF[0]];
    teamB = [selectedM[1], selectedF[1]];
  } else {
    const all = type === "MD" ? selectedM : selectedF;
    teamA = [all[0], all[1]];
    teamB = [all[2], all[3]];
  }

  const players = [...teamA, ...teamB];
  const playPenalty = players.reduce((acc, p) => acc + (state.playCount.get(p) || 0), 0);
  const partnerPenalty = (state.partnerCount.get(pairKey(teamA[0], teamA[1])) || 0) + (state.partnerCount.get(pairKey(teamB[0], teamB[1])) || 0);
  const oppPenalty =
    (state.oppCount.get(pairKey(teamA[0], teamB[0])) || 0) +
    (state.oppCount.get(pairKey(teamA[0], teamB[1])) || 0) +
    (state.oppCount.get(pairKey(teamA[1], teamB[0])) || 0) +
    (state.oppCount.get(pairKey(teamA[1], teamB[1])) || 0);
  const duplicatePenalty = state.matchSet.has(
    `${type}:${pairKey(teamA[0], teamA[1])}#${pairKey(teamB[0], teamB[1])}`
  )
    ? 1000
    : 0;

  return {
    type,
    teamA,
    teamB,
    players,
    score: playPenalty * 2 + partnerPenalty * 5 + oppPenalty * 3 + duplicatePenalty
  };
}

function commitMatch(match, state) {
  for (const p of match.players) {
    state.playCount.set(p, (state.playCount.get(p) || 0) + 1);
  }
  const p1 = pairKey(match.teamA[0], match.teamA[1]);
  const p2 = pairKey(match.teamB[0], match.teamB[1]);
  state.partnerCount.set(p1, (state.partnerCount.get(p1) || 0) + 1);
  state.partnerCount.set(p2, (state.partnerCount.get(p2) || 0) + 1);
  for (const a of match.teamA) {
    for (const b of match.teamB) {
      const k = pairKey(a, b);
      state.oppCount.set(k, (state.oppCount.get(k) || 0) + 1);
    }
  }
  state.matchSet.add(`${match.type}:${p1}#${p2}`);
}

function generateSchedule(input, seed) {
  const rand = makeRng(seed);
  const males = buildPlayers("남", input.maleCount);
  const females = buildPlayers("여", input.femaleCount);
  const slots = makeTimeSlots(input.startTime, input.endTime, input.matchMinutes);
  const totalMatches = slots.length * input.courtCount;

  const state = {
    playCount: new Map(),
    partnerCount: new Map(),
    oppCount: new Map(),
    matchSet: new Set()
  };

  [...males, ...females].forEach((p) => state.playCount.set(p, 0));

  const schedule = [];
  for (const time of slots) {
    for (let court = 1; court <= input.courtCount; court += 1) {
      const candidates = [];
      const typeRotation = shuffledCopy(input.types, rand);
      for (const type of typeRotation) {
        for (let i = 0; i < 20; i += 1) {
          const match = makeMatch(type, males, females, state, rand);
          if (match) candidates.push(match);
        }
      }
      if (candidates.length === 0) {
        schedule.push({ time, court, empty: true });
        continue;
      }
      candidates.sort((a, b) => a.score - b.score);
      const winner = candidates[0];
      commitMatch(winner, state);
      schedule.push({
        time,
        court,
        type: winner.type,
        teamA: winner.teamA,
        teamB: winner.teamB
      });
    }
  }

  const playCounts = [...state.playCount.values()];
  const maxPlay = Math.max(...playCounts);
  const minPlay = Math.min(...playCounts);

  return {
    slots,
    totalMatches,
    schedule,
    males,
    females,
    playStat: { minPlay, maxPlay }
  };
}

function renderSummary(input, generated) {
  summaryEl.classList.remove("hidden");
  summaryEl.innerHTML = `
    <h2>요약</h2>
    <p>참가자: 남 ${input.maleCount}명 / 여 ${input.femaleCount}명</p>
    <p>시간슬롯: ${generated.slots.length}개, 코트: ${input.courtCount}개, 총 경기: ${generated.totalMatches}개</p>
    <p>경기 수 균등도: 최소 ${generated.playStat.minPlay}경기 ~ 최대 ${generated.playStat.maxPlay}경기</p>
  `;
}

function matchToText(match) {
  if (match.empty) return "배정 실패";
  return `${match.teamA[0]} / ${match.teamA[1]} VS ${match.teamB[0]} / ${match.teamB[1]} (${parseTypeLabel(match.type)})`;
}

function renderDesktopTable(data, matchMinutes) {
  const courts = Math.max(...data.map((x) => x.court));
  const slotMap = new Map();
  for (const item of data) {
    if (!slotMap.has(item.time)) slotMap.set(item.time, []);
    slotMap.get(item.time).push(item);
  }
  let html = `<table><thead><tr><th>시간</th>${Array.from({ length: courts }, (_, i) => `<th>코트${i + 1}</th>`).join("")}</tr></thead><tbody>`;
  for (const [time, list] of slotMap.entries()) {
    const current = isCurrentSlot(time, matchMinutes) ? "current-slot" : "";
    html += `<tr class="${current}"><th>${time}</th>`;
    for (let c = 1; c <= courts; c += 1) {
      const m = list.find((x) => x.court === c && (currentFilter === "ALL" || x.type === currentFilter));
      html += `<td>${m ? matchToText(m) : "-"}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  desktopTableWrap.innerHTML = html;
}

function renderMobileCards(data, matchMinutes) {
  const cardTpl = document.getElementById("cardTemplate");
  mobileCards.innerHTML = "";
  const filtered = data.filter((item) => currentFilter === "ALL" || item.type === currentFilter);
  for (const item of filtered) {
    const node = cardTpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".time").textContent = item.time;
    node.querySelector(".court").textContent = `코트${item.court}`;
    node.querySelector(".type").textContent = item.empty ? "-" : parseTypeLabel(item.type);
    const teamEls = node.querySelectorAll(".team");
    if (item.empty) {
      teamEls[0].textContent = "배정 가능한 경기가 없습니다.";
      teamEls[1].textContent = "";
    } else {
      teamEls[0].textContent = `${item.teamA[0]} / ${item.teamA[1]}`;
      teamEls[1].textContent = `${item.teamB[0]} / ${item.teamB[1]}`;
    }
    if (isCurrentSlot(item.time, matchMinutes)) {
      node.classList.add("current-slot");
    }
    mobileCards.appendChild(node);
  }
}

function renderResults(input, generated) {
  resultsEl.classList.remove("hidden");
  scheduleData = generated.schedule;
  renderDesktopTable(scheduleData, input.matchMinutes);
  renderMobileCards(scheduleData, input.matchMinutes);
}

function generateAndRender(seed) {
  const input = createRequestFromForm();
  const error = validateInput(input);
  if (error) {
    alert(error);
    return;
  }
  lastRequest = input;
  currentSeed = seed;
  const generated = generateSchedule(input, seed);
  renderSummary(input, generated);
  renderResults(input, generated);
}

function updateUrlForShare() {
  if (!lastRequest) return;
  const q = new URLSearchParams({
    m: String(lastRequest.maleCount),
    f: String(lastRequest.femaleCount),
    c: String(lastRequest.courtCount),
    s: lastRequest.startTime,
    e: lastRequest.endTime,
    d: String(lastRequest.matchMinutes),
    t: lastRequest.types.join(","),
    seed: String(currentSeed)
  });
  const url = `${location.origin}${location.pathname}?${q.toString()}`;
  navigator.clipboard
    .writeText(url)
    .then(() => alert("공유 링크를 복사했습니다."))
    .catch(() => alert("복사에 실패했습니다."));
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  generateAndRender(Date.now());
});

regenBtn.addEventListener("click", () => {
  if (!lastRequest) {
    alert("먼저 대진을 생성해주세요.");
    return;
  }
  generateAndRender(Date.now());
});

shareBtn.addEventListener("click", updateUrlForShare);

pdfBtn.addEventListener("click", () => {
  if (!scheduleData.length) {
    alert("먼저 대진을 생성해주세요.");
    return;
  }
  window.print();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    if (lastRequest && scheduleData.length) {
      renderDesktopTable(scheduleData, lastRequest.matchMinutes);
      renderMobileCards(scheduleData, lastRequest.matchMinutes);
    }
  });
});

fillFormFromQuery();
generateAndRender(currentSeed);
