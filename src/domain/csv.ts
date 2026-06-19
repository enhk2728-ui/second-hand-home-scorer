import type { AppState, PropertyScore } from "./types";

function escapeCsv(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function buildCsvExport(state: AppState, scores: PropertyScore[]): string {
  const scoreByProperty = new Map(scores.map((score) => [score.propertyId, score]));
  const headers = [
    "房源名称",
    "位置",
    "总价",
    "面积",
    "单价",
    "综合分",
    "是否淘汰",
    "硬伤原因",
    ...state.indicators.map((indicator) => indicator.name)
  ];

  const rows = state.properties.map((property) => {
    const score = scoreByProperty.get(property.id);
    return [
      property.name,
      property.address,
      property.totalPrice,
      property.area,
      property.unitPrice,
      score?.totalScore ?? "",
      score?.eliminated ? "是" : "否",
      score?.hardFailReasons.join(";") ?? "",
      ...state.indicators.map((indicator) => property.valuesByIndicatorId[indicator.id] ?? "")
    ];
  });

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}
