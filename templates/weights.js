function materialDensityMap() {
  return {
    SS: 7.85,
    SUS: 8.00,
    AL: 2.70,
    CU: 8.90
  };
}

function materialOptions() {
  return [
    { label: "SS（鉄）", value: "SS" },
    { label: "SUS（ステンレス）", value: "SUS" },
    { label: "AL（アルミ）", value: "AL" },
    { label: "CU（銅）", value: "CU" }
  ];
}

function densityFromMaterial(code) {
  const m = materialDensityMap();
  return m[code] ?? 7.85;
}

export function buildWeightTemplates(settings) {
  const densityDefault = settings.densityDefault ?? 7.85;

  return [
    {
      id: "w_roundbar",
      group: "重量計算",
      title: "丸棒重量（kg）",
      desc: "φd, 長さL, 材質 → 重量",
      tags: ["比重選択"],
      inputs: [
        { key: "d", label: "直径 d (mm)", hint: "例: 50" },
        { key: "L", label: "長さ L (mm)", hint: "例: 1000" },
        { key: "mat", type: "select", label: "材質", hint: "", default: "SS", options: materialOptions() }
      ],
      result: { label: "重量", unit: "kg" },
      compute: (v) => {
        const rho = densityFromMaterial(v.mat);
        const volume_m3 = Math.PI * (v.d * v.d) / 4 * v.L * 1e-9;
        const density = rho * 1000;
        return volume_m3 * density;
      }
    },

    {
      id: "w_plate",
      group: "重量計算",
      title: "板重量（kg）",
      desc: "t×W×L, 材質 → 重量",
      tags: ["比重選択"],
      inputs: [
        { key: "t", label: "厚み t (mm)", hint: "例: 12" },
        { key: "W", label: "幅 W (mm)", hint: "例: 200" },
        { key: "L", label: "長さ L (mm)", hint: "例: 1000" },
        { key: "mat", type: "select", label: "材質", default: "SS", options: materialOptions() }
      ],
      result: { label: "重量", unit: "kg" },
      compute: (v) => {
        const rho = densityFromMaterial(v.mat);
        const volume_m3 = v.t * v.W * v.L * 1e-9;
        const density = rho * 1000;
        return volume_m3 * density;
      }
    },

    {
      id: "w_pipe_dual",
      group: "重量計算",
      title: "パイプ重量（板厚 or 内径）",
      desc: "外径D, (板厚t or 内径Di), 長さL, 材質 → 重量",
      tags: ["比重選択"],
      partial: true,
      inputs: [
        { key: "D", label: "外径 D (mm)", hint: "例: 60.5" },
        { key: "t", label: "板厚 t (mm) ※どちらか", hint: "例: 3.2（内径を入れるなら空欄）" },
        { key: "Di", label: "内径 Di (mm) ※どちらか", hint: "例: 54.1（板厚を入れるなら空欄）" },
        { key: "L", label: "長さ L (mm)", hint: "例: 1000" },
        { key: "mat", type: "select", label: "材質", default: "SS", options: materialOptions() }
      ],
      result: { label: "重量", unit: "kg" },
      compute: (v) => {
        const rho = densityFromMaterial(v.mat);

        const D = v.D;
        const L = v.L;

        const hasT = Number.isFinite(v.t);
        const hasDi = Number.isFinite(v.Di);

        if (!Number.isFinite(D) || !Number.isFinite(L)) throw new Error("外径Dと長さLは必須です");
        if (hasT === hasDi) throw new Error("板厚t か 内径Di のどちらか一方だけ入力してください");

        let Di;
        if (hasT) {
          Di = D - 2 * v.t;
        } else {
          Di = v.Di;
        }
        if (!(Di > 0) || Di >= D) throw new Error("内径は 0 < Di < D が必要です");

        const area_mm2 = Math.PI * (D*D - Di*Di) / 4;
        const volume_m3 = area_mm2 * L * 1e-9;
        const density = rho * 1000;
        return volume_m3 * density;
      }
    },

    /* 体積計算（mm入力） */
    {
      id: "vol_box",
      group: "重量計算",
      title: "体積（直方体）",
      desc: "A×B×C（mm）→ mm³ / cm³ / L",
      tags: ["体積"],
      inputs: [
        { key: "A", label: "A (mm)", hint: "例: 100" },
        { key: "B", label: "B (mm)", hint: "例: 50" },
        { key: "C", label: "C (mm)", hint: "例: 30" }
      ],
      result: { label: "体積", unit: "mm³" },
      compute: (v) => {
        const mm3 = v.A * v.B * v.C;
        const cm3 = mm3 / 1000;
        const L = mm3 / 1_000_000;
        return {
          primary: { label: "体積", value: mm3, unit: "mm³" },
          others: [
            { label: "体積", value: cm3, unit: "cm³" },
            { label: "体積", value: L, unit: "L" }
          ]
        };
      }
    },

    {
      id: "vol_cyl",
      group: "重量計算",
      title: "体積（円柱）",
      desc: "φd×L（mm）→ mm³ / cm³ / L",
      tags: ["体積"],
      inputs: [
        { key: "d", label: "直径 d (mm)", hint: "例: 50" },
        { key: "L", label: "長さ L (mm)", hint: "例: 100" }
      ],
      result: { label: "体積", unit: "mm³" },
      compute: (v) => {
        const mm3 = Math.PI * (v.d*v.d) / 4 * v.L;
        const cm3 = mm3 / 1000;
        const L = mm3 / 1_000_000;
        return {
          primary: { label: "体積", value: mm3, unit: "mm³" },
          others: [
            { label: "体積", value: cm3, unit: "cm³" },
            { label: "体積", value: L, unit: "L" }
          ]
        };
      }
    }
  ];
}
