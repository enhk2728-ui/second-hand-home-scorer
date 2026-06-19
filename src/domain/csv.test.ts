import { describe, expect, it } from "vitest";
import { DEFAULT_STATE } from "./defaults";
import { buildCsvExport } from "./csv";
import { calculatePropertyScore } from "./fce";

describe("CSV export", () => {
  it("exports property rows with scores and indicators", () => {
    const scores = DEFAULT_STATE.properties.map((property) => calculatePropertyScore(property, DEFAULT_STATE.indicators));
    const csv = buildCsvExport(DEFAULT_STATE, scores);
    expect(csv).toContain("房源名称,位置,总价,面积,单价,综合分,是否淘汰,硬伤原因");
    expect(csv).toContain("A 房源");
    expect(csv).toContain("通勤时间");
  });
});
