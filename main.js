import {
  LS, nowISO, fmtDate,
  sanitizeNumber, toNum,
  formatNum, valuesToCopyText,
  escapeHtml, cryptoRandomId
} from "./utils.js";

import { buildTemplates, GROUP_ORDER } from "./templates/index.js";

/* =========================
   App settings
========================= */
const SETTINGS_KEY = "fieldcalc_settings_v2";
const settings = LS.get(SETTINGS_KEY, { decimalPlaces: 3, densityDefault: 7.85 });

/* =========================
   State
========================= */
const FAV_KEY = "fieldcalc_favs_v2";
const HISTORY_KEY = "fieldcalc_history_v2";
const LASTINPUT_KEY = "fieldcalc_lastinputs_v2";

let templates = buildTemplates(settings);
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
   Favorites
========================= */
function toggleFav(id) {
  if (favs.has(id)) favs.delete(id);
  else favs.add(id);
  LS.set(FAV_KEY, Array.from(favs));
}

/* =========================
   List render (1-line)
========================= */
function renderList() {
  const q = (elSearch.value || "").toLowerCase();

  const items = templates.filter(t => {
    const hay = `${t.title} ${t.desc} ${t.group} ${(t.tags || []).join(" ")}`.toLowerCase();
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
      card.className = "card compact";
      card.title = t.desc || "";
      card.innerHTML = `
        <div class="card-row">
          <div class="card-title-1">${escapeHtml(t.title)}</div>
          <div class="card-right">
            <span class="star">${favs.has(t.id) ? "★" : "☆"}</span>
          </div>
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

  // ✅ A案：スマホは選択後に計算エリアへスクロール
  if (window.matchMedia("(max-width: 900px)").matches) {
    elWork.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderWorkHtml(t, fieldValues) {
  const diagram = t.diagramSvg
    ? `<div class="diagram">${t.diagramSvg}</div>`
    : "";

  const inputsHtml = t.inputs.map((inp, idx) => {
    const v = fieldValues[idx] ?? "";
    const key = escapeHtml(inp.key);

    // select対応（材質など）
    if (inp.type === "select") {
      const opts = (inp.options || []).map(o => {
        const val = String(o.value);
        const sel = (String(v) === val) ? "selected" : "";
        return `<option value="${escapeHtml(val)}" ${sel}>${escapeHtml(o.label)}</option>`;
      }).join("");

      return `
        <div class="field">
          <label>${escapeHtml(inp.label)}</label>
          <select data-key="${key}">
            ${opts}
          </select>
          ${inp.hint ? `<div class="hint">${escapeHtml(inp.hint)}</div>` : ""}
        </div>
      `;
    }

    return `
      <div class="field">
        <label>${escapeHtml(inp.label)}</label>
        <input inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false"
               data-key="${key}" value="${escapeHtml(v)}" placeholder="${escapeHtml(inp.hint || "")}">
        ${inp.hint ? `<div class="hint">${escapeHtml(inp.hint)}</div>` : ""}
      </div>
    `;
  }).join("");

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

    ${diagram}

    <div class="grid">${inputsHtml}</div>

    <div class="result">
      <div class="label">結果</div>
      <div id="resultMulti" class="result-multi"></div>
      <div class="row-actions">
        <button class="btn" id="btnSave">履歴に保存</button>
        <button class="btn ghost" id="btnCopyInline">コピー</button>
      </div>
      <div class="hint" id="errText"></div>
    </div>
  `;
}

function wireWorkEvents(t) {
  const inputs = elWork.querySelectorAll("[data-key]");
  inputs.forEach(inp => {
    inp.addEventListener("input", () => {
      saveLastInputs(t);
      computeAndUpdate(t);
    });
    inp.addEventListener("change", () => {
      saveLastInputs(t);
      computeAndUpdate(t);
    });
  });

  elWork.querySelector("#btnSave").addEventListener("click", () => {
    const payload = collectInputPayload(t);
    const computed = computeTemplate(t, payload.nums);
    const places = settings.decimalPlaces ?? 3;

    const values = computed.values || [];
    const ok = values.length && values.every(v => Number.isFinite(v.value));
    if (!ok) return toast("未入力/不正な値があります");

    const resultText = values.map(v => `${v.label}=${formatNum(v.value, places)} ${v.unit}`.trim()).join(" / ");

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

  elWork.querySelector("#btnCopyInline").addEventListener("click", copyResult);

  elWork.querySelector("#btnReset").addEventListener("click", () => {
    const map = {};
    t.inputs.forEach(inp => map[inp.key] = (inp.default != null) ? String(inp.default) : "");
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
  const inputs = elWork.querySelectorAll("[data-key]");
  const raw = {};
  const nums = {};

  inputs.forEach(inp => {
    const key = inp.dataset.key;

    const valueStr = (inp.tagName === "SELECT")
      ? String(inp.value)
      : sanitizeNumber(inp.value);

    raw[key] = valueStr;
    nums[key] = (inp.tagName === "SELECT") ? valueStr : toNum(valueStr);
  });

  return { raw, nums };
}

function saveLastInputs(t) {
  const inputs = elWork.querySelectorAll("[data-key]");
  const map = {};
  inputs.forEach(inp => map[inp.dataset.key] = inp.value);
  lastInputs[t.id] = map;
  LS.set(LASTINPUT_KEY, lastInputs);
}

function normalizeComputeResult(raw, templateResult) {
  if (typeof raw === "number") {
    return { values: [{ label: templateResult.label, value: raw, unit: templateResult.unit }] };
  }
  if (raw && typeof raw === "object" && raw.primary && typeof raw.primary.value === "number") {
    const values = [];
    values.push({
      label: raw.primary.label ?? templateResult.label,
      value: raw.primary.value,
      unit: raw.primary.unit ?? templateResult.unit
    });
    const others = Array.isArray(raw.others) ? raw.others : [];
    for (const o of others) values.push({ label: o.label ?? "", value: o.value, unit: o.unit ?? "" });
    return { values };
  }
  if (raw && typeof raw === "object" && typeof raw.value === "number") {
    const values = [{ label: templateResult.label, value: raw.value, unit: templateResult.unit }];
    const extras = Array.isArray(raw.extras) ? raw.extras : [];
    for (const e of extras) values.push({ label: e.label ?? "", value: e.value, unit: e.unit ?? "" });
    return { values };
  }
  return { values: [{ label: templateResult.label, value: NaN, unit: templateResult.unit }] };
}

function computeTemplate(t, nums) {
  if (!t.partial) {
    for (const inp of t.inputs) {
      if (inp.type === "select") continue;
      if (!Number.isFinite(nums[inp.key])) {
        return { values: [{ label: t.result.label, value: NaN, unit: t.result.unit }], error: "未入力/数値でない項目があります" };
      }
    }
  }
  try {
    const raw = t.compute(nums);
    const norm = normalizeComputeResult(raw, t.result);
    if (!norm.values.length || !Number.isFinite(norm.values[0].value)) {
      return { values: [{ label: t.result.label, value: NaN, unit: t.result.unit }], error: "計算結果が不正です（入力値を確認）" };
    }
    return { values: norm.values, error: "" };
  } catch (e) {
    const msg = e?.message || "計算エラー";
    return { values: [{ label: t.result.label, value: NaN, unit: t.result.unit }], error: msg };
  }
}

function computeAndUpdate(t) {
  const payload = collectInputPayload(t);
  const computed = computeTemplate(t, payload.nums);

  const places = settings.decimalPlaces ?? 3;
  const multiEl = elWork.querySelector("#resultMulti");
  const errEl = elWork.querySelector("#errText");

  const values = computed.values || [];
  const ok = values.length && values.every(v => Number.isFinite(v.value));

  if (ok) {
    multiEl.innerHTML = values.map(v => `
      <div class="result-box">
        <div class="result-label">${escapeHtml(v.label)}</div>
        <div class="result-value">
          ${escapeHtml(formatNum(v.value, places))}
          <span class="unit">${escapeHtml(v.unit)}</span>
        </div>
      </div>
    `).join("");

    errEl.textContent = computed.error || "";
    currentResultText =
      `${t.title}\n${Object.keys(payload.raw).map(k => `${k}: ${payload.raw[k]}`).join("\n")}\n` +
      `結果:\n${valuesToCopyText(values, places)}`;

    btnCopy.disabled = false;
    btnShare.disabled = false;
  } else {
    multiEl.innerHTML = `
      <div class="result-box">
        <div class="result-label">${escapeHtml(t.result.label)}</div>
        <div class="result-value">- <span class="unit">${escapeHtml(t.result.unit)}</span></div>
      </div>
    `;
    errEl.textContent = computed.error || "";
    currentResultText = "";
    btnCopy.disabled = true;
    btnShare.disabled = true;
  }
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
      <pre>${escapeHtml(Object.keys(h.inputs).map(k => `${k}: ${h.inputs[k]}`).join("\n"))}\n結果: ${escapeHtml(h.result)}</pre>
      <div class="row-actions">
        <button class="btn ghost" data-act="copy">コピー</button>
        <button class="btn danger" data-act="del">削除</button>
      </div>
    `;
    item.querySelector('[data-act="copy"]').addEventListener("click", () => {
      const text = `${h.templateTitle}\n${Object.keys(h.inputs).map(k => `${k}: ${h.inputs[k]}`).join("\n")}\n結果: ${h.result}\n(${fmtDate(h.at)})`;
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

/* =========================
   Copy/Share
========================= */
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else fallbackCopy(text);
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
    try { await navigator.share({ title: "現場計算", text: currentResultText }); } catch {}
  } else copyResult();
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

  templates = buildTemplates(settings);
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
   Offline + SW
========================= */
function updateOfflineNote() {
  elOffline.textContent = navigator.onLine
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

/* =========================
   CSS inject (multi-result + diagram)
========================= */
(function injectStyle(){
  const css = `
    .result-multi{display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:10px;}
    .result-box{background: rgba(2,6,23,.35); border:1px solid rgba(31,41,55,.9); border-radius:16px; padding:12px;}
    .result-label{font-size:12px; color: var(--muted);}
    .result-value{font-size:28px; font-weight:900; margin-top:6px; letter-spacing:.02em;}
    .result-value .unit{font-size:13px; color: var(--muted); margin-left:8px;}
    @media (max-width:520px){ .result-multi{grid-template-columns:1fr;} }
    .diagram{margin:10px 0 4px; padding:10px; border:1px solid var(--border); border-radius:16px; background:rgba(2,6,23,.35);}
    .diagram svg{width:100%; height:auto; display:block;}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();
