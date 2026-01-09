import { degToRad, radToDeg } from "../utils.js";

/* 図（SVG） */
const TRI_SVG = `
<svg viewBox="0 0 520 220" xmlns="http://www.w3.org/2000/svg" aria-label="right triangle">
  <rect x="0" y="0" width="520" height="220" fill="none"/>
  <path d="M80 170 L360 170 L360 70 Z" fill="rgba(56,189,248,.12)" stroke="rgba(56,189,248,.9)" stroke-width="3"/>
  <path d="M360 170 L360 140 L330 140" fill="none" stroke="rgba(229,231,235,.8)" stroke-width="3"/>
  <text x="210" y="195" fill="rgba(229,231,235,.9)" font-size="18" font-weight="700">a（底辺）</text>
  <text x="375" y="125" fill="rgba(229,231,235,.9)" font-size="18" font-weight="700">b（高さ）</text>
  <text x="220" y="110" fill="rgba(229,231,235,.9)" font-size="18" font-weight="700">c（斜辺）</text>
  <path d="M120 170 A40 40 0 0 1 150 140" fill="none" stroke="rgba(229,231,235,.9)" stroke-width="3"/>
  <text x="125" y="145" fill="rgba(229,231,235,.9)" font-size="18" font-weight="800">θ</text>
  <text x="80" y="30" fill="rgba(156,163,175,1)" font-size="14">θは底辺aから反時計回り（tanθ=b/a）</text>
</svg>
`;

const ANGLE_SVG = `
<svg viewBox="0 0 520 220" xmlns="http://www.w3.org/2000/svg" aria-label="angle from two points">
  <rect x="0" y="0" width="520" height="220" fill="none"/>
  <circle cx="130" cy="160" r="6" fill="rgba(56,189,248,.9)"/>
  <circle cx="380" cy="90" r="6" fill="rgba(56,189,248,.9)"/>
  <line x1="130" y1="160" x2="450" y2="160" stroke="rgba(229,231,235,.35)" stroke-width="3"/>
  <line x1="130" y1="160" x2="380" y2="90" stroke="rgba(56,189,248,.9)" stroke-width="3"/>
  <path d="M170 160 A40 40 0 0 1 190 130" fill="none" stroke="rgba(229,231,235,.9)" stroke-width="3"/>
  <text x="175" y="135" fill="rgba(229,231,235,.9)" font-size="18" font-weight="800">θ</text>
  <text x="70" y="30" fill="rgba(156,163,175,1)" font-size="14">θ = atan2(dy, dx)（+X軸から反時計回り）</text>
</svg>
`;

function solveRightTriangle(v) {
  const a0 = v.a, b0 = v.b, c0 = v.c, th0 = v.theta; // theta deg
  const given = {
    a: Number.isFinite(a0),
    b: Number.isFinite(b0),
    c: Number.isFinite(c0),
    theta: Number.isFinite(th0)
  };
  const missing = Object.keys(given).filter(k => !given[k]);
  if (missing.length !== 1) throw new Error("a,b,c,θ のうち3つを入力（1つだけ空欄）してください");

  let a = a0, b = b0, c = c0, thetaDeg = th0;
  const thRad = () => degToRad(thetaDeg);
  const bad = (x) => !(Number.isFinite(x)) || x <= 0;

  switch (missing[0]) {
    case "a":
      if (given.b && given.c) { if (bad(b)||bad(c)||c<=b) throw new Error("c>b が必要"); a = Math.sqrt(c*c - b*b); }
      else if (given.c && given.theta) { if (bad(c)) throw new Error("cは正"); a = c * Math.cos(thRad()); }
      else if (given.b && given.theta) { if (bad(b)) throw new Error("bは正"); a = b / Math.tan(thRad()); }
      else throw new Error("a算出の組合せ不足（b+c / c+θ / b+θ）");
      break;
    case "b":
      if (given.a && given.c) { if (bad(a)||bad(c)||c<=a) throw new Error("c>a が必要"); b = Math.sqrt(c*c - a*a); }
      else if (given.c && given.theta) { if (bad(c)) throw new Error("cは正"); b = c * Math.sin(thRad()); }
      else if (given.a && given.theta) { if (bad(a)) throw new Error("aは正"); b = a * Math.tan(thRad()); }
      else throw new Error("b算出の組合せ不足（a+c / c+θ / a+θ）");
      break;
    case "c":
      if (given.a && given.b) { if (bad(a)||bad(b)) throw new Error("a,bは正"); c = Math.sqrt(a*a + b*b); }
      else if (given.a && given.theta) { if (bad(a)) throw new Error("aは正"); const cosv = Math.cos(thRad()); if (Math.abs(cosv)<1e-12) throw new Error("cosθが0に近い"); c = a / cosv; }
      else if (given.b && given.theta) { if (bad(b)) throw new Error("bは正"); const sinv = Math.sin(thRad()); if (Math.abs(sinv)<1e-12) throw new Error("sinθが0に近い"); c = b / sinv; }
      else throw new Error("c算出の組合せ不足（a+b / a+θ / b+θ）");
      break;
    case "theta":
      if (given.a && given.b) { if (bad(a)||bad(b)) throw new Error("a,bは正"); thetaDeg = radToDeg(Math.atan2(b, a)); }
      else if (given.a && given.c) { if (bad(a)||bad(c)||c<a) throw new Error("c>=a が必要"); thetaDeg = radToDeg(Math.acos(a / c)); }
      else if (given.b && given.c) { if (bad(b)||bad(c)||c<b) throw new Error("c>=b が必要"); thetaDeg = radToDeg(Math.asin(b / c)); }
      else throw new Error("θ算出の組合せ不足（a+b / a+c / b+c）");
      break;
  }

  if (!Number.isFinite(c) && Number.isFinite(a) && Number.isFinite(b)) c = Math.sqrt(a*a + b*b);
  if (!Number.isFinite(a) && Number.isFinite(c) && Number.isFinite(thetaDeg)) a = c * Math.cos(degToRad(thetaDeg));
  if (!Number.isFinite(b) && Number.isFinite(c) && Number.isFinite(thetaDeg)) b = c * Math.sin(degToRad(thetaDeg));

  if (![a,b,c,thetaDeg].every(Number.isFinite)) throw new Error("計算失敗");
  if (a<=0 || b<=0 || c<=0) throw new Error("長さは正の値");
  return { a,b,c,thetaDeg };
}

export function buildCoordTemplates(settings) {
  return [
    {
      id: "tri_right_auto",
      group: "座標計算",
      title: "直角三角形：a,b,c,θ 自動計算",
      desc: "a,b,c,θ のうち3つ入力 → 残りを計算（a=底辺, b=高さ, c=斜辺）",
      tags: ["三角関数"],
      partial: true,
      diagramSvg: TRI_SVG,
      inputs: [
        { key: "a", label: "a（底辺）(mm)", hint: "例: 100" },
        { key: "b", label: "b（高さ）(mm)", hint: "例: 50" },
        { key: "c", label: "c（斜辺）(mm)", hint: "例: 111.803" },
        { key: "theta", label: "θ（角度）(deg)", hint: "例: 26.565" }
      ],
      result: { label: "a", unit: "mm" },
      compute: (v) => {
        const r = solveRightTriangle(v);
        return {
          primary: { label: "a", value: r.a, unit: "mm" },
          others: [
            { label: "b", value: r.b, unit: "mm" },
            { label: "c", value: r.c, unit: "mm" },
            { label: "θ", value: r.thetaDeg, unit: "deg" }
          ]
        };
      }
    },

    {
      id: "coord_dist",
      group: "座標計算",
      title: "2点間距離",
      desc: "(x1,y1) と (x2,y2) の距離",
      tags: [],
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
      tags: ["視覚"],
      diagramSvg: ANGLE_SVG,
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
      id: "pcd_angle_to_xy",
      group: "座標計算",
      title: "PCD＋角度→座標（X,Y）",
      desc: "PCD(mm) と 角度θ° から X,Y（中心も指定可）",
      tags: ["穴位置"],
      inputs: [
        { key: "pcd", label: "PCD（直径）(mm)", hint: "例: 300" },
        { key: "theta", label: "角度 θ (deg)", hint: "例: 60（+X軸から反時計回り）" },
        { key: "cx", label: "中心 cx (mm)", hint: "例: 0", default: 0 },
        { key: "cy", label: "中心 cy (mm)", hint: "例: 0", default: 0 }
      ],
      result: { label: "X", unit: "mm" },
      compute: (v) => {
        const r = v.pcd / 2;
        const th = degToRad(v.theta);
        const x = v.cx + r * Math.cos(th);
        const y = v.cy + r * Math.sin(th);
        return {
          primary: { label: "X", value: x, unit: "mm" },
          others: [{ label: "Y", value: y, unit: "mm" }]
        };
      }
    }
  ];
}
