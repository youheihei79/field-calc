export function buildMachiningTemplates(settings) {
  return [
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
      id: "feed_fz_z_rpm",
      group: "加工関係",
      title: "送り速度（fz×刃数×rpm）",
      desc: "F(mm/min) = fz(mm/刃) × z(刃数) × rpm",
      tags: ["ミル"],
      inputs: [
        { key: "fz", label: "fz (mm/刃)", hint: "例: 0.08" },
        { key: "z", label: "刃数 z", hint: "例: 4" },
        { key: "rpm", label: "回転数 (rpm)", hint: "例: 1200" }
      ],
      result: { label: "送り速度", unit: "mm/min" },
      compute: (v) => v.fz * v.z * v.rpm
    },

    // ★追加：fz逆算
    {
      id: "feed_solve_fz_from_F_z_rpm",
      group: "加工関係",
      title: "fz逆算（送り速度÷刃数÷rpm）",
      desc: "fz(mm/刃) = F(mm/min) ÷ (z × rpm)",
      tags: ["ミル", "逆算"],
      inputs: [
        { key: "z", label: "刃数 z", hint: "例: 4" },
        { key: "rpm", label: "回転数 (rpm)", hint: "例: 1200" },
        { key: "F", label: "送り速度 F (mm/min)", hint: "例: 384" }
      ],
      result: { label: "fz", unit: "mm/刃" },
      compute: (v) => {
        const z = v.z;
        const rpm = v.rpm;
        const F = v.F;

        if (!Number.isFinite(z) || !Number.isFinite(rpm) || !Number.isFinite(F)) {
          throw new Error("数値を入力してください");
        }
        if (z <= 0) throw new Error("刃数 z は 0 より大きくしてください");
        if (rpm <= 0) throw new Error("回転数 rpm は 0 より大きくしてください");
        if (F < 0) throw new Error("送り速度 F は 0 以上で入力してください");

        return F / (z * rpm);
      }
    },

    {
      id: "circumference_arc",
      group: "座標計算",
      title: "円周 / 弧長（角度）",
      desc: "円周=πD、弧長=円周×(角度/360)",
      tags: ["展開"],
      inputs: [
        { key: "D", label: "直径 D (mm)", hint: "例: 100" },
        { key: "angle", label: "角度 (deg)", hint: "例: 90（弧長を出す）", default: 360 }
      ],
      result: { label: "円周", unit: "mm" },
      compute: (v) => {
        const C = Math.PI * v.D;
        const arc = C * (v.angle / 360);
        return {
          primary: { label: "円周", value: C, unit: "mm" },
          others: [{ label: "弧長", value: arc, unit: "mm" }]
        };
      }
    }
  ];
}
