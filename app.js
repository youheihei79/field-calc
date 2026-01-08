/* =========================
   Storage helpers
========================= */
const LS = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const nowISO = () => new Date().toISOString();
const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
};

const sanitizeNumber = (s) => {
  if (s == null) return "";
  return String(s).replace(/,/g, "").trim();
};

const toNum = (s) => {
  const v = parseFloat(sanitizeNumber(s));
  return Number.isFinite(v) ? v : null;
};

const roundTo = (x, places) => {
  const p = Math.pow(10, places);
  return Math.round(x * p) / p;
};

const formatNum = (x, places) => {
  if (!Number.isFinite(x)) return "-";
  const y = roundTo(x, places);
  return y.toLocaleString("ja-JP", { maximumFractionDigits: places });
};

const degToRad = (deg) => deg * Math.PI / 180;
const radToDeg = (rad) => rad * 180 / Math.PI;

/* =========================
   App settings
========================= */
const SETTINGS_KEY = "fieldcalc_settings_v1";
const settings = LS.get(SETTINGS_KEY, { decimalPlaces: 3, densityDefault: 7.85 });

/* =========================
   Result normalization
   - compute() can return:
     (A) number
     (B) { value:number, extras:[{label,value,unit}] }
========================= */
function normalizeComputeResult(raw, places) {
  if (typeof raw === "number") {
    return { value: raw, extras: [] };
  }
  if (raw && typeof raw === "object" && typeof raw.value === "number") {
    const extras = Array.isArray(raw.extras) ? raw.extras : [];
    return { value: raw.value, extras };
  }
  return { value: NaN, extras: [] };
}

function extrasToText(extras, places) {
  if (!extras || !extras.length) return "";
  return extras
    .filter(e => Number.isFinite(e.value))
    .map(e => `${e.label}=${formatNum(e.value, places)} ${e.unit ?? ""}`.trim())
    .join(" / ");
}

/* =========================
   Templates (MVP)
   Units: mm, kg, min, rpm, deg
========================= */
function templatesFactory() {
  const densityDefault = settings.densityDefault ?? 7.85;

  const T = [
    /* ---------- 重量計算 ---------- */
    {
      id: "w_roundbar",
      group: "重量計算",
      title: "丸棒重量（kg）",
      desc: "φd, 長さL, 比重ρ → 重量",
      tags: ["鉄/SUS/AL", "材料費に派生"],
      inputs: [
        { key: "d", label: "直径 d (mm)", hint: "例: 50" },
        { key: "L", label: "長さ L (mm)", hint: "例: 1000" },
        { key: "rho", label: "比重 ρ", hint: `例: ${densityDefault}` , default: densityDefault }
      ],
      result: { label: "重量", unit: "kg" },
      compute: (v) => {
        const volume_m3 = Math.PI * (v.d * v.d) / 4 * v.L * 1e-9;
        const density = v.rho * 1000;
        return volume_m3 * density;
      }
    },
    {
      id: "w_plate",
      group: "重量計算",
      title: "板重量（kg）",
      desc: "厚みt, 幅W, 長さL, 比重ρ → 重量",
      tags: ["鉄/SUS/AL"],
      inputs: [
        { key: "t", label: "厚み t (mm)", hint: "例: 12" },
        { key: "W", label: "幅 W (mm)", hint: "例: 200" },
        { key: "L", label: "長さ L (mm)", hint: "例: 1000" },
        { key: "rho", label: "比重 ρ", hint: `例: ${densityDefault}`, default: densityDefault }
      ],
      result: { label: "重量", unit: "kg" },
      compute: (v) => {
        const volume_m3 = v.t * v.W * v.L * 1e-9;
        const density = v.rho * 1000;
        return volume_m3 * density;
      }
    },
    {
      id: "w_pipe",
      group: "重量計算",
      title: "パイプ重量（kg）",
      desc: "外径D, 肉厚t, 長さL, 比重ρ → 重量（中空円柱）",
      tags: ["配管"],
      inputs: [
        { key: "D", label: "外径 D (mm)", hint: "例: 60.5" },
        { key: "t", label: "肉厚 t (mm)", hint: "例: 3.2" },
        { key: "L", label: "長さ L (mm)", hint: "例: 1000" },
        { key: "rho", label: "比重 ρ", hint: `例: ${densityDefault}`, default: densityDefault }
      ],
      result: { label: "重量", unit: "kg" },
      compute: (v) => {
        const Di = v.D - 2 * v.t;
        if (Di < 0) return NaN;
        const area_mm2 = Math.PI * (v.D*v.D - Di*Di) / 4;
        const volume_m3 = area_mm2 * v.L * 1e-9;
        const density = v.rho * 1000;
        return volume_m3 * density;
      }
    },

    /* ---------- 加工関係 ---------- */
    {
      id: "vc_rpm",
      group: "加工関係",
      title: "切削速度→回転数（rpm）",
      desc: "Vc(m/min), 直径D(mm) → rpm",
      tags: ["旋盤/ミル"],
      inputs: [
        { key: "Vc", label: "切削速度 Vc (m/min)", hint: "例: 150" },
        { key: "D", label: "直径 D (mm)", hint: "例: 50" }
      ],
      result: { label: "回転数", unit: "rpm" },
      compute: (v) => (1000 * v.Vc) / (Math.PI * v.D)
    },
    {
      id: "feed_F",
      group: "加工関係",
      title: "送り（mm/rev）→送り速度（mm/min）",
      desc: "f(mm/rev), rpm → F(mm/min)",
      tags: ["旋盤/ドリル"],
      inputs: [
        { key: "f", label: "送り f (mm/rev)", hint: "例: 0.2" },
        { key: "rpm", label: "回転数 (rpm)", hint: "例: 900" }
      ],
      result: { label: "送り速度", unit: "mm/min" },
      compute: (v) => v.f * v.rpm
    },
    {
      id: "time_from_F",
      group: "加工関係",
      title: "加工時間（送り）",
      desc: "距離(mm) ÷ 送り速度(mm/min) → 分",
      tags: ["概算用"],
      inputs: [
        { key: "dist", label: "距離 (mm)", hint: "例: 300" },
        { key: "F", label: "送り速度 (mm/min)", hint: "例: 180" }
      ],
      result: { label: "時間", unit: "min" },
      compute: (v) => v.dist / v.F
    },
    {
      id: "tap_drill",
      group: "加工関係",
      title: "タップ下穴（目安）",
      desc: "下穴 ≈ 呼び径 - ピッチ（目安）",
      tags: ["目安"],
      inputs: [
        { key: "nom", label: "呼び径（mm）", hint: "例: 6 (M6)" },
        { key: "pitch", label: "ピッチ（mm）", hint: "例: 1.0 (M6×1.0)" }
      ],
      result: { label: "下穴径", unit: "mm" },
      compute: (v) => v.nom - v.pitch
    },
    {
      id: "circumference",
      group: "加工関係",
      title: "円周（mm）",
      desc: "直径D(mm) → 円周（展開の基礎）",
      tags: ["展開/配管"],
      inputs: [
        { key: "D", label: "直径 D (mm)", hint: "例: 100" }
      ],
      result: { label: "円周", unit: "mm" },
      compute: (v) => Math.PI * v.D
    },

    /* ---------- 座標計算 ---------- */
    {
      id: "coord_dist",
      group: "座標計算",
      title: "2点間距離",
      desc: "(x1,y1) と (x2,y2) の距離",
      tags: ["図面/治具", "mm想定"],
      inputs: [
        { key: "x1", label: "x1", hint: "例: 0" },
        { key: "y1", label: "y1", hint: "例: 0" },
        { key: "x2", label: "x2", hint: "例: 100" },
        { key: "y2", label: "y2", hint: "例: 50" }
      ],
      result: { label: "距離", unit: "mm" },
      compute: (v) => {
        const dx = v.x2 - v.x1;
        const dy = v.y2 - v.y1;
        return Math.sqrt(dx*dx + dy*dy);
      }
    },
    {
      id: "coord_angle",
      group: "座標計算",
      title: "2点→角度（°）",
      desc: "x軸基準の角度（atan2）",
      tags: ["角度出し"],
      inputs: [
        { key: "x1", label: "x1", hint: "例: 0" },
        { key: "y1", label: "y1", hint: "例: 0" },
        { key: "x2", label: "x2", hint: "例: 100" },
        { key: "y2", label: "y2", hint: "例: 50" }
      ],
      result: { label: "角度", unit: "deg" },
      compute: (v) => {
        const dx = v.x2 - v.x1;
        const dy = v.y2 - v.y1;
        return radToDeg(Math.atan2(dy, dx));
      }
    },
    {
      id: "coord_rotate",
      group: "座標計算",
      title: "点の回転（原点回り）",
      desc: "(x,y) を θ° 回転 → (x',y')",
      tags: ["治具/穴位置"],
      inputs: [
        { key: "x", label: "x", hint: "例: 100" },
        { key: "y", label: "y", hint: "例: 0" },
        { key: "theta", label: "角度 θ (deg)", hint: "例: 30" }
      ],
      result: { label: "回転後 x'", unit: "mm" },
      compute: (v) => {
        const th = degToRad(v.theta);
        const xp = v.x * Math.cos(th) - v.y * Math.sin(th);
        const yp = v.x * Math.sin(th) + v.y * Math.cos(th);
        return { value: xp, extras: [{ label: "y'", value: yp, unit: "mm" }] };
      }
    },
    {
      id: "pcd_angle_to_xy",
      group: "座標計算",
      title: "PCD＋角度→座標（X,Y）",
      desc: "PCD(mm) と 角度θ° から X,Y（中心も指定可）",
      tags: ["穴位置", "円周上座標"],
      inputs: [
        { key: "pcd", label: "PCD（直径）(mm)", hint: "例: 120" },
        { key: "theta", label: "角度 θ (deg)", hint: "例: 30（+X軸から反時計回り）" },
        { key: "cx", label: "中心 cx (mm)", hint: "例: 0", default: 0 },
        { key: "cy", label: "中心 cy (mm)", hint: "例: 0", default: 0 }
      ],
      result: { label: "X", unit: "mm" },
      compute: (v) => {
        const r = v.pcd / 2;
        const th = degToRad(v.theta);
        const x = v.cx + r * Math.cos(th);
        const y = v.cy + r * Math.sin(th);
        return { value: x, extras: [{ label: "Y", value: y, unit: "mm" }] };
      }
    }
  ];

  return T;
}

/* =========================
   State
========================= */
const FAV_KEY = "fieldcalc_favs_v1";
const HISTORY_KEY = "fieldcalc_history_v1";
const LASTINPUT_KEY = "fieldcalc_lastinputs_v1";

let templates = templatesFactory();
let favs = new Set(LS.get(FAV_KEY, []));
let history = LS.get(HISTORY_KEY, []);
let lastInputs = LS.get(LASTINPUT_KEY, {});

let currentTemplate = null;
let currentResultText = "";
let favOnly = false;

/* =========================
   DOM
========================= */
const elList = document.getElementById("templateList");
const elSearch = document.getElementById("search");
const elWork = document.getElementById("workArea");
const elOffline = document.getElementById("offlineNote");

const btnHistory = document.getElementById("btnHistory");
const btnCopy = document.getElementById("btnCopyResult");
const btnShare = document.getElementById("btnShare");

const sheet = document.getElementById("historySheet");
const elHistoryList = document.getElementById("historyList");
const btnCloseHistory = document.getElementById("btnCloseHistory");
const btnClearHistory = document.getElementById("btnClearHistory");

const btnSettings = document.getElementById("btnSettings");
const modalSettings = document.getElementById("settingsModal");
const btnCloseSettings = document.getElementById("btnCloseSettings");
const selDecimals = document.getElementById("decimalPlaces");
const selDensity = document.getElementById("densityPreset");

const btnFavOnly = document.getElementById("btnFavOnly");

/* =========================
   Render list (固定3分類の順)
========================= */
const GROUP_ORDER = ["重量計算", "加工関係", "座標計算"];

function renderList() {
  const q = (elSearch.value || "").toLowerCase();
  const items = templates.filter(t => {
    const hay = `${t.title} ${t.desc} ${t.group} ${(t.tags||[]).join(" ")}`.toLowerCase();
    const match = !q || hay.includes(q);
    const favMatch = !favOnly || favs.has(t.id);
    return match && favMatch;
  });

  const grouped = {};
  for (const t of items) {
    grouped[t.group] = grouped[t.group] || [];
    grouped[t.group].push(t);
  }

  elList.innerHTML = "";
  for (const group of GROUP_ORDER) {
    if (!grouped[group] || grouped[group].length === 0) continue;

    const h = document.createElement("div");
    h.className = "tag";
    h.style.margin = "2px 0 6px";
    h.textContent = group;
    elList.appendChild(h);

    for (const t of grouped[group]) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-title">
          ${escapeHtml(t.title)}
          <span class="star">${favs.has(t.id) ? "★" : "☆"}</span>
        </div>
        <div class="card-sub">${escapeHtml(t.desc)}</div>
        <div class="tagrow">
          ${(t.tags||[]).slice(0,3).map(x => `<span class="tag">${escapeHtml(x)}</span>`).join("")}
        </div>
      `;
      card.addEventListener("click", (e) => {
        const starEl = card.querySelector(".star");
        const rect = starEl.getBoundingClientRect();
        const x = e.clientX, y = e.clientY;
        const isStar = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

        if (isStar) {
          toggleFav(t.id);
          renderList();
          return;
        }
        openTemplate(t.id);
      });
      elList.appendChild(card);
    }
  }

  btnFavOnly.textContent = favOnly ? "★" : "☆";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function toggleFav(id) {
  if (favs.has(id)) favs.delete(id);
  else favs.add(id);
  LS.set(FAV_KEY, Array.from(favs));
}

/* =========================
   Work area
========================= */
function openTemplate(id) {
  const t = templates.find(x => x.id === id);
  if (!t) return;
  currentTemplate = t;

  const saved = lastInputs[t.id] || {};
  const fields = t.inputs.map(inp => {
    const vSaved = saved[inp.key];
    if (vSaved != null && vSaved !== "") return vSaved;
    if (inp.default != null) return String(inp.default);
    return "";
  });

  elWork.innerHTML = renderWorkHtml(t, fields);
  wireWorkEvents(t);
  computeAndUpdate(t);
}

function renderWorkHtml(t, fieldValues) {
  const inputsHtml = t.inputs.map((inp, idx) => `
    <div class="field">
      <label>${escapeHtml(inp.label)}</label>
      <input inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false"
             data-key="${escapeHtml(inp.key)}" value="${escapeHtml(fieldValues[idx])}" placeholder="${escapeHtml(inp.hint || "")}">
      ${inp.hint ? `<div class="hint">${escapeHtml(inp.hint)}</div>` : ""}
    </div>
  `).join("");

  return `
    <div class="work-head">
      <div>
        <div class="work-title">${escapeHtml(t.title)}</div>
        <div class="work-desc">${escapeHtml(t.desc)}</div>
      </div>
      <div class="work-actions">
        <button class="btn ghost" id="btnFav">${favs.has(t.id) ? "★" : "☆"}</button>
        <button class="btn ghost" id="btnReset">入力リセット</button>
      </div>
    </div>

    <div class="grid">${inputsHtml}</div>

    <div class="result">
      <div class="label">${escapeHtml(t.result.label)}</div>
      <div class="value" id="resultValue">- <span class="unit">${escapeHtml(t.result.unit)}</span></div>
      <div class="row-actions">
        <button class="btn" id="btnSave">履歴に保存</button>
        <button class="btn ghost" id="btnCopyInline">コピー</button>
      </div>
      <div class="hint" id="errText"></div>
    </div>
  `;
}

function wireWorkEvents(t) {
  const inputs = elWork.querySelectorAll("input[data-key]");
  inputs.forEach(inp => {
    inp.addEventListener("input", () => {
      saveLastInputs(t);
      computeAndUpdate(t);
    });
  });

  elWork.querySelector("#btnSave").addEventListener("click", () => {
    const payload = collectInputPayload(t);
    const computed = computeTemplate(t, payload.nums);
    const places = settings.decimalPlaces ?? 3;

    if (!Number.isFinite(computed.value)) {
      toast("未入力/不正な値があります");
      return;
    }

    const main = `${formatNum(computed.value, places)} ${t.result.unit}`.trim();
    const extraText = extrasToText(computed.extras, places);
    const resultText = extraText ? `${main} / ${extraText}` : main;

    const rec = {
      id: cryptoRandomId(),
      at: nowISO(),
      templateId: t.id,
      templateTitle: t.title,
      inputs: payload.raw,
      result: resultText
    };
    history.unshift(rec);
    history = history.slice(0, 200);
    LS.set(HISTORY_KEY, history);
    toast("履歴に保存しました");
    renderHistory();
  });

  elWork.querySelector("#btnCopyInline").addEventListener("click", () => copyResult());

  elWork.querySelector("#btnReset").addEventListener("click", () => {
    const map = {};
    t.inputs.forEach(inp => {
      map[inp.key] = (inp.default != null) ? String(inp.default) : "";
    });
    lastInputs[t.id] = map;
    LS.set(LASTINPUT_KEY, lastInputs);
    openTemplate(t.id);
  });

  elWork.querySelector("#btnFav").addEventListener("click", () => {
    toggleFav(t.id);
    elWork.querySelector("#btnFav").textContent = favs.has(t.id) ? "★" : "☆";
    renderList();
  });
}

function collectInputPayload(t) {
  const inputs = elWork.querySelectorAll("input[data-key]");
  const raw = {};
  const nums = {};

  inputs.forEach(inp => {
    const key = inp.dataset.key;
    const valueStr = sanitizeNumber(inp.value);
    raw[key] = valueStr;
    nums[key] = toNum(valueStr);
  });

  return { raw, nums };
}

function saveLastInputs(t) {
  const inputs = elWork.querySelectorAll("input[data-key]");
  const map = {};
  inputs.forEach(inp => map[inp.dataset.key] = inp.value);
  lastInputs[t.id] = map;
  LS.set(LASTINPUT_KEY, lastInputs);
}

function computeTemplate(t, nums) {
  for (const inp of t.inputs) {
    if (!Number.isFinite(nums[inp.key])) {
      return { value: NaN, extras: [], error: "未入力/数値でない項目があります" };
    }
  }
  try {
    const raw = t.compute(nums);
    const norm = normalizeComputeResult(raw, settings.decimalPlaces ?? 3);
    if (!Number.isFinite(norm.value)) return { value: NaN, extras: [], error: "計算結果が不正です（入力値を確認）" };
    return { value: norm.value, extras: norm.extras, error: "" };
  } catch {
    return { value: NaN, extras: [], error: "計算エラー" };
  }
}

function computeAndUpdate(t) {
  const payload = collectInputPayload(t);
  const computed = computeTemplate(t, payload.nums);

  const places = settings.decimalPlaces ?? 3;
  const resEl = elWork.querySelector("#resultValue");
  const errEl = elWork.querySelector("#errText");

  if (Number.isFinite(computed.value)) {
    resEl.innerHTML = `${escapeHtml(formatNum(computed.value, places))} <span class="unit">${escapeHtml(t.result.unit)}</span>`;

    const extraText = extrasToText(computed.extras, places);
    errEl.textContent = extraText ? `参考: ${extraText}` : "";

    const main = `${formatNum(computed.value, places)} ${t.result.unit}`.trim();
    currentResultText = `${t.title}\n${inputsToLines(payload.raw)}\n結果: ${extraText ? `${main} / ${extraText}` : main}`;
    btnCopy.disabled = false;
    btnShare.disabled = false;
  } else {
    resEl.innerHTML = `- <span class="unit">${escapeHtml(t.result.unit)}</span>`;
    errEl.textContent = computed.error || "";
    currentResultText = "";
    btnCopy.disabled = true;
    btnShare.disabled = true;
  }
}

function inputsToLines(raw) {
  return Object.keys(raw).map(k => `${k}: ${raw[k]}`).join("\n");
}

function cryptoRandomId() {
  if (crypto && crypto.getRandomValues) {
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return a[0].toString(16) + a[1].toString(16);
  }
  return Math.random().toString(16).slice(2);
}

/* =========================
   History sheet
========================= */
function openHistory() {
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
  renderHistory();
}
function closeHistory() {
  sheet.classList.remove("open");
  sheet.setAttribute("aria-hidden", "true");
}

function renderHistory() {
  elHistoryList.innerHTML = "";
  if (!history.length) {
    elHistoryList.innerHTML = `<div class="empty"><div class="empty-title">履歴なし</div><div class="empty-sub">「履歴に保存」で残ります</div></div>`;
    return;
  }

  for (const h of history) {
    const item = document.createElement("div");
    item.className = "hitem";
    item.innerHTML = `
      <div class="top">
        <div class="t">${escapeHtml(h.templateTitle)}</div>
        <div class="d">${escapeHtml(fmtDate(h.at))}</div>
      </div>
      <pre>${escapeHtml(inputsToPretty(h.inputs))}\n結果: ${escapeHtml(h.result)}</pre>
      <div class="row-actions">
        <button class="btn ghost" data-act="copy">コピー</button>
        <button class="btn danger" data-act="del">削除</button>
      </div>
    `;
    item.querySelector('[data-act="copy"]').addEventListener("click", () => {
      const text = `${h.templateTitle}\n${inputsToLines(h.inputs)}\n結果: ${h.result}\n(${fmtDate(h.at)})`;
      copyText(text);
      toast("コピーしました");
    });
    item.querySelector('[data-act="del"]').addEventListener("click", () => {
      history = history.filter(x => x.id !== h.id);
      LS.set(HISTORY_KEY, history);
      renderHistory();
    });
    elHistoryList.appendChild(item);
  }
}

function inputsToPretty(raw) {
  return Object.keys(raw).map(k => `${k}: ${raw[k]}`).join("\n");
}

/* =========================
   Copy/Share
========================= */
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}
function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function copyResult() {
  if (!currentResultText) return;
  copyText(currentResultText);
  toast("コピーしました");
}

async function shareResult() {
  if (!currentResultText) return;
  if (navigator.share) {
    try {
      await navigator.share({ title: "現場計算", text: currentResultText });
    } catch {}
  } else {
    copyResult();
  }
}

/* =========================
   Settings modal
========================= */
function openSettings() {
  selDecimals.value = String(settings.decimalPlaces ?? 3);
  selDensity.value = String(settings.densityDefault ?? 7.85);
  modalSettings.classList.add("open");
  modalSettings.setAttribute("aria-hidden", "false");
}
function closeSettings() {
  modalSettings.classList.remove("open");
  modalSettings.setAttribute("aria-hidden", "true");
}

function applySettings() {
  settings.decimalPlaces = parseInt(selDecimals.value, 10);
  settings.densityDefault = parseFloat(selDensity.value);
  LS.set(SETTINGS_KEY, settings);

  templates = templatesFactory();

  renderList();
  if (currentTemplate) openTemplate(currentTemplate.id);
}

/* =========================
   Toast
========================= */
let toastTimer = null;
function toast(msg) {
  clearTimeout(toastTimer);
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "96px";
    el.style.transform = "translateX(-50%)";
    el.style.background = "rgba(0,0,0,.75)";
    el.style.color = "#fff";
    el.style.padding = "10px 12px";
    el.style.borderRadius = "12px";
    el.style.border = "1px solid rgba(255,255,255,.12)";
    el.style.zIndex = "50";
    el.style.fontSize = "13px";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  toastTimer = setTimeout(() => { el.style.opacity = "0"; }, 1200);
}

/* =========================
   Offline note + SW
========================= */
function updateOfflineNote() {
  const online = navigator.onLine;
  elOffline.textContent = online
    ? "✅ オンライン（更新/初回読み込みOK）"
    : "🛠 オフライン（計算はそのまま使えます）";
}

function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

/* =========================
   Events
========================= */
elSearch.addEventListener("input", renderList);

btnHistory.addEventListener("click", openHistory);
btnCloseHistory.addEventListener("click", closeHistory);
btnClearHistory.addEventListener("click", () => {
  history = [];
  LS.set(HISTORY_KEY, history);
  renderHistory();
});

btnCopy.addEventListener("click", copyResult);
btnShare.addEventListener("click", shareResult);

btnSettings.addEventListener("click", openSettings);
btnCloseSettings.addEventListener("click", () => { applySettings(); closeSettings(); });

selDecimals.addEventListener("change", applySettings);
selDensity.addEventListener("change", applySettings);

btnFavOnly.addEventListener("click", () => {
  favOnly = !favOnly;
  renderList();
});

window.addEventListener("online", updateOfflineNote);
window.addEventListener("offline", updateOfflineNote);

/* =========================
   Boot
========================= */
renderList();
updateOfflineNote();
registerSW();
renderHistory();
