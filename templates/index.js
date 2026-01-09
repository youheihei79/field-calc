import { buildWeightTemplates } from "./weights.js";
import { buildMachiningTemplates } from "./machining.js";
import { buildCoordTemplates } from "./coords.js";

export const GROUP_ORDER = ["重量計算", "加工関係", "座標計算"];

export function buildTemplates(settings) {
  return [
    ...buildWeightTemplates(settings),
    ...buildMachiningTemplates(settings),
    ...buildCoordTemplates(settings),
  ];
}
