export const LS = {
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

export const nowISO = () => new Date().toISOString();

export const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit"
  });
};

export const sanitizeNumber = (s) => {
  if (s == null) return "";
  return String(s).replace(/,/g, "").trim();
};

export const toNum = (s) => {
  const v = parseFloat(sanitizeNumber(s));
  return Number.isFinite(v) ? v : null;
};

export const roundTo = (x, places) => {
  const p = Math.pow(10, places);
  return Math.round(x * p) / p;
};

export const formatNum = (x, places) => {
  if (!Number.isFinite(x)) return "-";
  const y = roundTo(x, places);
  return y.toLocaleString("ja-JP", { maximumFractionDigits: places });
};

export const valuesToCopyText = (values, places) => {
  return values
    .filter(v => Number.isFinite(v.value))
    .map(v => `${v.label}: ${formatNum(v.value, places)} ${v.unit}`.trim())
    .join("\n");
};

export const escapeHtml = (s) => {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
};

export const cryptoRandomId = () => {
  if (crypto && crypto.getRandomValues) {
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return a[0].toString(16) + a[1].toString(16);
  }
  return Math.random().toString(16).slice(2);
};

export const degToRad = (deg) => deg * Math.PI / 180;
export const radToDeg = (rad) => rad * 180 / Math.PI;
