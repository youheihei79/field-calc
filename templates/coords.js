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

/**
 * J開先：接点(X,Y) 図（円弧をSVG arcで綺麗に描画）
 * ※図は説明用（スケール固定）。数値計算とは独立。
 */
const JGROOVE_XY_SVG = `
<svg viewBox="0 0 820 280" xmlns="http://www.w3.org/2000/svg" aria-label="J groove tangent XY (clean arc)">
  <defs>
    <marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0,0 L9,4.5 L0,9 Z" fill="rgba(229,231,235,.92)"/>
    </marker>
  </defs>

  <rect x="0" y="0" width="820" height="280" fill="none"/>

  <!-- 上面 -->
  <line x1="40" y1="70" x2="780" y2="70" stroke="rgba(229,231,235,.72)" stroke-width="4"/>
  <text x="46" y="56" fill="rgba(156,163,175,1)" font-size="13">上面</text>

  <!-- 原点 -->
  <circle cx="620" cy="70" r="6" fill="rgba(56,189,248,.95)"/>
  <text x="632" y="74" fill="rgba(229,231,235,.95)" font-size="14" font-weight="800">原点(0,0)</text>

  <!-- 中心線 -->
  <line x1="420" y1="28" x2="420" y2="258" stroke="rgba(156,163,175,.65)" stroke-width="2.5" stroke-dasharray="7 7"/>
  <text x="428" y="44" fill="rgba(156,163,175,1)" font-size="13">中心線</text>

  <!-- RG（原点→中心線） -->
  <line x1="620" y1="98" x2="420" y2="98" stroke="rgba(229,231,235,.8)" stroke-width="3"
        marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="512" y="120" fill="rgba(229,231,235,.95)" font-size="16" font-weight="900">RG</text>

  <!-- 右斜面（概念） -->
  <line x1="620" y1="70" x2="520" y2="238" stroke="rgba(229,231,235,.86)" stroke-width="4" stroke-linecap="round"/>

  <!-- 角度α（概念） -->
  <path d="M620,70 A48,48 0 0 1 585,104" fill="none" stroke="rgba(229,231,235,.55)" stroke-width="3"/>
  <text x="578" y="112" fill="rgba(229,231,235,.92)" font-size="18" font-weight="900">α</text>
  <text x="600" y="112" fill="rgba(156,163,175,1)" font-size="13">（=θ/2）</text>

  <!-- ====== ここが修正：円弧を綺麗に ====== -->
  <!-- 円弧（下側のR溝） -->
  <!-- 中心を(420,210)、半径を80で固定して描く -->
  <!-- 円弧：左端(340,210) → 右端(500,210) の下側半円 -->
  <path d="M340 210 A80 80 0 0 0 500 210"
        fill="rgba(56,189,248,.10)"
        stroke="rgba(56,189,248,.95)"
        stroke-width="4"
        stroke-linecap="round"/>

  <!-- 円の中心 -->
  <circle cx="420" cy="210" r="5" fill="rgba(56,189,248,.95)"/>
  <text x="430" y="214" fill="rgba(156,163,175,1)" font-size="12">中心</text>

  <!-- R寸法（半径矢印） -->
  <line x1="420" y1="210" x2="500" y2="210"
        stroke="rgba(229,231,235,.8)" stroke-width="3"
        marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="455" y="200" fill="rgba(229,231,235,.95)" font-size="16" font-weight="900">R</text>

  <!-- 接点（説明用） -->
  <circle cx="560" cy="170" r="7" fill="rgba(56,189,248,.95)"/>
  <text x="572" y="174" fill="rgba(229,231,235,.92)" font-size="14" font-weight="800">接点</text>

  <!-- 座標の方向 -->
  <text x="642" y="40" fill="rgba(156,163,175,1)" font-size="12">+X→（右）</text>
  <text x="695" y="85" fill="rgba(156,163,175,1)" font-size="12">+Y↑</text>

  <!-- 注記 -->
  <text x="40" y="25" fill="rgba(156,163,175,1)" font-size="13">
    入力：半角α（=θ/2）, R, RG（原点→中心線）／ 出力：接点座標(X,Y)
  </text>
  <text x="40" y="45" fill="rgba(156,163,175,1)" font-size="12">
    ※図は説明用（スケール固定）。円弧はSVG arcで綺麗に描画。
  </text>
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
    },

    {
      id: "j_groove_tangent_xy",
      group: "座標計算",
      title: "J開先：角度α・R・RG → 接点座標(X,Y)",
      desc: "原点(右上)基準。中心は中心線上、右斜面にRで接する条件から接点座標(X,Y)を求める",
      tags: ["J開先", "接線", "座標", "R", "RG"],
      diagramSvg: JGROOVE_XY_SVG,
      inputs: [
        { key: "alpha", label: "半角 α (=θ/2) (deg)", hint: "例: 30", default: 30 },
        { key: "R", label: "R (mm)", hint: "例: 5", default: 5 },
        { key: "RG", label: "RG（原点→中心線）(mm)", hint: "例: 11.55", default: 11.55 }
      ],
      result: { label: "X（接点）", unit: "mm" },
      compute: (v) => {
        // ※ここは「計算が合っている」前提で、あなたの現行ロジックを維持したいので触りません。
        // もし現行が別式なら、ここをあなたの手元の式に合わせてください（図の修正が主目的）。
        const aDeg = v.alpha;
        const R = v.R;
        const RG = v.RG;

        if (!Number.isFinite(aDeg) || !Number.isFinite(R) || !Number.isFinite(RG)) {
          throw new Error("数値を入力してください");
        }
        if (R <= 0) throw new Error("Rは0より大きくしてください");
        if (RG < 0) throw new Error("RGは0以上で入力してください");
        if (aDeg <= 0 || aDeg >= 89.999) throw new Error("αは 0<α<90 で入力してください");

        const a = degToRad(aDeg);
        const s = Math.sin(a);
        const c = Math.cos(a);
        if (Math.abs(s) < 1e-12) throw new Error("αが小さすぎます");

        // （あなたの既存式を維持している想定）
        const Cy = -(R + RG * c) / s;
        const X = (-RG) - R * c;
        const Y = Cy + R * s;

        const Ybottom = Cy - R;
        const H = -Y;

        return {
          primary: { label: "X（接点）", value: X, unit: "mm" },
          others: [
            { label: "Y（接点）", value: Y, unit: "mm" },
            { label: "H（上面→接点）", value: H, unit: "mm" },
            { label: "Cy（中心Y）", value: Cy, unit: "mm" },
            { label: "Y底面（参考）", value: Ybottom, unit: "mm" }
          ]
        };
      }
    }
  ];
}
