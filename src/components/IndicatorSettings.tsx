import { useEffect, useMemo, useState } from "react";
import { DEFAULT_INDICATORS } from "../domain/defaults";
import type { AhpGenerationMode, FceRule, Indicator, IndicatorDirection, IndicatorInputType, ScoringProfile } from "../domain/types";
import {
  applyAhpWeightsFromMatrix,
  applyAhpWeightsFromRecord,
  calculateAhp,
  calculateAhpWeights,
  generateEqualAhpComparisons,
  generateRankedAhpComparisons,
  setAhpComparison,
} from "../domain/ahp";

interface IndicatorSettingsProps {
  indicators: Indicator[];
  scoringProfile: ScoringProfile;
  onChange: (indicators: Indicator[]) => void;
  onProfileChange: (profile: ScoringProfile) => void;
}

function defaultRuleFor(inputType: IndicatorInputType): FceRule {
  if (inputType === "number") {
    return {
      type: "numericThreshold",
      bands: [
        { max: 25, membership: { excellent: 1, good: 0, average: 0, poor: 0 } },
        { max: 40, membership: { excellent: 0.2, good: 0.8, average: 0, poor: 0 } },
        { max: 60, membership: { excellent: 0, good: 0.2, average: 0.8, poor: 0 } },
        { min: 60, membership: { excellent: 0, good: 0, average: 0.2, poor: 0.8 } }
      ]
    };
  }

  if (inputType === "select") {
    return {
      type: "selectMapping",
      options: [
        { value: "excellent", label: "优秀", membership: { excellent: 1, good: 0, average: 0, poor: 0 } },
        { value: "good", label: "良好", membership: { excellent: 0, good: 1, average: 0, poor: 0 } },
        { value: "average", label: "一般", membership: { excellent: 0, good: 0, average: 1, poor: 0 } },
        { value: "poor", label: "较差", membership: { excellent: 0, good: 0, average: 0, poor: 1 } }
      ]
    };
  }

  if (inputType === "boolean") {
    return {
      type: "booleanMapping",
      booleanMap: {
        true: { excellent: 1, good: 0, average: 0, poor: 0 },
        false: { excellent: 0, good: 0, average: 0, poor: 0 }
      }
    };
  }

  return { type: "rating10" };
}

const AHP_SELECT_VALUES = [
  { label: "9", value: 9 },
  { label: "8", value: 8 },
  { label: "7", value: 7 },
  { label: "6", value: 6 },
  { label: "5", value: 5 },
  { label: "4", value: 4 },
  { label: "3", value: 3 },
  { label: "2", value: 2 },
  { label: "1", value: 1 },
  { label: "1/2", value: 1 / 2 },
  { label: "1/3", value: 1 / 3 },
  { label: "1/4", value: 1 / 4 },
  { label: "1/5", value: 1 / 5 },
  { label: "1/6", value: 1 / 6 },
  { label: "1/7", value: 1 / 7 },
  { label: "1/8", value: 1 / 8 },
  { label: "1/9", value: 1 / 9 },
];

function ahpValueLabel(value: number): string {
  if (value >= 1) return value.toString();
  return `1/${Math.round(1 / value)}`;
}

const MODE_LABELS: Record<AhpGenerationMode, string> = {
  equal: "自动：等权",
  ranked: "自动：按重要性排序",
  manual: "手动：判断矩阵",
};

export function IndicatorSettings({
  indicators,
  scoringProfile,
  onChange,
  onProfileChange,
}: IndicatorSettingsProps) {
  const [draftIndicators, setDraftIndicators] = useState<Indicator[]>(() => [...indicators]);

  // Track rank ordering for ranked mode
  const [rankedOrder, setRankedOrder] = useState<string[]>(() => {
    const activeIds = draftIndicators.filter((ind) => ind.participatesInScoring).map((ind) => ind.id);
    if (scoringProfile.rankedOrderIds && scoringProfile.rankedOrderIds.length > 0) {
      // Preserve existing order, append new active IDs
      const existing = scoringProfile.rankedOrderIds.filter((id) => activeIds.includes(id));
      const newIds = activeIds.filter((id) => !existing.includes(id));
      return [...existing, ...newIds];
    }
    return activeIds;
  });

  useEffect(() => {
    setDraftIndicators([...indicators]);
  }, [indicators]);

  // Sync ranked order when scoring indicators change
  useEffect(() => {
    const activeIds = draftIndicators.filter((ind) => ind.participatesInScoring).map((ind) => ind.id);
    setRankedOrder((prev) => {
      const kept = prev.filter((id) => activeIds.includes(id));
      const newIds = activeIds.filter((id) => !kept.includes(id));
      return [...kept, ...newIds];
    });
  }, [draftIndicators]);

  // Prune stale comparisons when indicators are removed or deactivated
  useEffect(() => {
    const activeIds = new Set(
      draftIndicators.filter((ind) => ind.participatesInScoring).map((ind) => ind.id)
    );
    const comparisons = scoringProfile.ahpComparisons ?? {};
    const needsPruning = Object.keys(comparisons).some(
      (fromId) => !activeIds.has(fromId)
    );
    if (!needsPruning) {
      const hasStaleTarget = Object.entries(comparisons).some(([fromId, row]) =>
        activeIds.has(fromId) && row && Object.keys(row).some((toId) => !activeIds.has(toId))
      );
      if (!hasStaleTarget) return;
    }

    const pruned: Record<string, Record<string, number>> = {};
    for (const fromId of Object.keys(comparisons)) {
      if (!activeIds.has(fromId)) continue;
      pruned[fromId] = {};
      for (const toId of Object.keys(comparisons[fromId] ?? {})) {
        if (activeIds.has(toId)) {
          pruned[fromId]![toId] = comparisons[fromId]![toId]!;
        }
      }
    }
    onProfileChange({ ...scoringProfile, ahpComparisons: pruned });
  }, [draftIndicators]); // only re-run when draft indiciators change structurally

  const ahpResult = useMemo(
    () => calculateAhp(draftIndicators, scoringProfile.ahpComparisons),
    [draftIndicators, scoringProfile.ahpComparisons],
  );

  const scoringIndicators = useMemo(
    () => draftIndicators.filter((ind) => ind.participatesInScoring),
    [draftIndicators],
  );

  const mode: AhpGenerationMode = scoringProfile.ahpGenerationMode ?? "manual";

  function updateOne(id: string, patch: Partial<Indicator>) {
    const updated = draftIndicators.map((ind) => {
      if (ind.id === id) return { ...ind, ...patch };
      return ind;
    });
    setDraftIndicators(updated);
    onChange(updated);
  }

  function addNew() {
    const next: Indicator = {
      id: crypto.randomUUID(),
      name: "新指标",
      category: "其他",
      inputType: "rating10",
      direction: "higherBetter",
      subjectiveWeight: 1,
      objectiveWeight: 0,
      finalWeight: 1,
      objectiveWeightEnabled: false,
      objectiveWeightMethod: "entropy",
      participatesInScoring: true,
      participatesInObjectiveWeight: true,
      isHardFailCapable: false,
      fceRule: { type: "rating10" }
    };
    const updated = [...draftIndicators, next];
    setDraftIndicators(updated);
    onChange(updated);
  }

  function resetDefaults() {
    const defaults = [...DEFAULT_INDICATORS];
    setDraftIndicators(defaults);
    onChange(defaults);
    const activeIds = defaults.filter((ind) => ind.participatesInScoring).map((ind) => ind.id);
    setRankedOrder(activeIds);
    onProfileChange({ ...scoringProfile, ahpComparisons: {}, rankedOrderIds: activeIds });
  }

  function setMode(newMode: AhpGenerationMode) {
    if (newMode === mode) return;

    let newComparisons = scoringProfile.ahpComparisons;
    let newRankedOrderIds = scoringProfile.rankedOrderIds;

    if (newMode === "equal") {
      newComparisons = generateEqualAhpComparisons(draftIndicators);
      newRankedOrderIds = draftIndicators.filter((ind) => ind.participatesInScoring).map((ind) => ind.id);
    } else if (newMode === "ranked") {
      const order = rankedOrder.length > 0 ? rankedOrder : draftIndicators.filter((ind) => ind.participatesInScoring).map((ind) => ind.id);
      newComparisons = generateRankedAhpComparisons(draftIndicators, order);
      newRankedOrderIds = order;
    }
    // switching to manual keeps existing comparisons

    onProfileChange({
      ...scoringProfile,
      ahpGenerationMode: newMode,
      ahpComparisons: newComparisons,
      rankedOrderIds: newRankedOrderIds,
    });
  }

  function regenerateForRanked() {
    const order = rankedOrder.length > 0 ? rankedOrder : draftIndicators.filter((ind) => ind.participatesInScoring).map((ind) => ind.id);
    const newComparisons = generateRankedAhpComparisons(draftIndicators, order);
    onProfileChange({
      ...scoringProfile,
      ahpComparisons: newComparisons,
      rankedOrderIds: order,
    });
  }

  function moveRankedItem(id: string, direction: -1 | 1) {
    setRankedOrder((prev) => {
      const index = prev.indexOf(id);
      if (index < 0) return prev;
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex]!, next[index]!];
      return next;
    });
  }

  function applyWeights() {
    if (scoringProfile.ahpGenerationMode === "equal" || scoringProfile.ahpGenerationMode === "ranked") {
      const comparisons = scoringProfile.ahpComparisons ?? {};
      const weights = calculateAhpWeights(draftIndicators, comparisons);
      const weighted = applyAhpWeightsFromRecord(draftIndicators, weights);
      onChange(weighted);
    } else {
      const weighted = applyAhpWeightsFromMatrix(draftIndicators, scoringProfile.ahpComparisons);
      onChange(weighted);
    }
  }

  function handleComparisonChange(fromId: string, toId: string, value: number) {
    const next = setAhpComparison(
      scoringProfile.ahpComparisons ?? {},
      fromId,
      toId,
      value,
    );
    onProfileChange({ ...scoringProfile, ahpComparisons: next });
  }

  function updateInputType(indicator: Indicator, inputType: IndicatorInputType) {
    const direction: IndicatorDirection = inputType === "number" ? "lowerBetter" : inputType === "boolean" ? "mapping" : "higherBetter";
    const updated = draftIndicators.map((ind) =>
      ind.id === indicator.id
        ? {
            ...ind,
            inputType,
            direction,
            fceRule: defaultRuleFor(inputType)
          }
        : ind
    );
    setDraftIndicators(updated);
    onChange(updated);
  }

  function updateNumericBand(indicator: Indicator, index: number, value: number) {
    if (indicator.fceRule.type !== "numericThreshold" || !indicator.fceRule.bands || !Number.isFinite(value)) return;
    const bands = indicator.fceRule.bands.map((band, bandIndex) => (bandIndex === index ? { ...band, max: value } : band));
    if (index === 2 && bands[3]) {
      bands[3] = { ...bands[3], min: value };
    }
    const updated = draftIndicators.map((ind) =>
      ind.id === indicator.id ? { ...ind, fceRule: { ...ind.fceRule, bands } } : ind
    );
    setDraftIndicators(updated);
    onChange(updated);
  }

  function deleteIndicator(id: string) {
    const updated = draftIndicators.filter((ind) => ind.id !== id);
    setDraftIndicators(updated);
    onChange(updated);
  }

  const canApply = scoringIndicators.length >= 1;
  const crFailed = !ahpResult.consistency.passed && scoringIndicators.length >= 3;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2>指标配置</h2>
        </div>
        <div className="button-group">
          <button className="ghost-button" type="button" onClick={addNew}>
            新增指标
          </button>
          <button className="ghost-button" type="button" onClick={resetDefaults}>
            重置默认
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>分类</th>
              <th>类型</th>
              <th>方向</th>
              <th>FCE规则</th>
              <th>权重</th>
              <th>参与评分</th>
              <th>硬伤否决</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {draftIndicators.map((indicator) => (
              <tr key={indicator.id}>
                <td>
                  <input
                    className="inline-input"
                    value={indicator.name}
                    onChange={(event) => updateOne(indicator.id, { name: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="inline-input"
                    value={indicator.category}
                    onChange={(event) => updateOne(indicator.id, { category: event.target.value })}
                  />
                </td>
                <td>
                  <select
                    className="inline-input"
                    value={indicator.inputType}
                    onChange={(event) => updateInputType(indicator, event.target.value as IndicatorInputType)}
                  >
                    <option value="number">数字</option>
                    <option value="rating10">1-10评分</option>
                    <option value="select">四档选择</option>
                    <option value="boolean">是否项</option>
                  </select>
                </td>
                <td>
                  <select
                    className="inline-input"
                    value={indicator.direction}
                    onChange={(event) => updateOne(indicator.id, { direction: event.target.value as IndicatorDirection })}
                  >
                    <option value="higherBetter">越大越好</option>
                    <option value="lowerBetter">越小越好</option>
                    <option value="rangeBest">区间最好</option>
                    <option value="mapping">手动映射</option>
                  </select>
                </td>
                <td className="rule-cell">
                  {indicator.fceRule.type === "numericThreshold" && indicator.fceRule.bands ? (
                    <div className="rule-grid">
                      <label>
                        优秀≤
                        <input
                          type="number"
                          value={indicator.fceRule.bands[0]?.max ?? 25}
                          onChange={(event) => updateNumericBand(indicator, 0, Number(event.target.value))}
                        />
                      </label>
                      <label>
                        良好≤
                        <input
                          type="number"
                          value={indicator.fceRule.bands[1]?.max ?? 40}
                          onChange={(event) => updateNumericBand(indicator, 1, Number(event.target.value))}
                        />
                      </label>
                      <label>
                        一般≤
                        <input
                          type="number"
                          value={indicator.fceRule.bands[2]?.max ?? 60}
                          onChange={(event) => updateNumericBand(indicator, 2, Number(event.target.value))}
                        />
                      </label>
                    </div>
                  ) : (
                    <span className="rule-summary">
                      {indicator.fceRule.type === "rating10" && "9-10优秀 / 7-8良好 / 5-6一般"}
                      {indicator.fceRule.type === "selectMapping" && "选择：优秀/良好/一般/较差"}
                      {indicator.fceRule.type === "booleanMapping" && (indicator.isHardFailCapable ? "是=硬伤否决 / 否=不计分" : "是=优秀 / 否=不计分")}
                    </span>
                  )}
                </td>
                <td>
                  <span className="weight-pct">
                    {ahpResult.weights[indicator.id] !== undefined
                      ? `${(ahpResult.weights[indicator.id]! * 100).toFixed(1)}%`
                      : "-"}
                  </span>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={indicator.participatesInScoring}
                    onChange={(event) => updateOne(indicator.id, { participatesInScoring: event.target.checked })}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={indicator.isHardFailCapable}
                    onChange={(event) => updateOne(indicator.id, { isHardFailCapable: event.target.checked })}
                  />
                </td>
                <td>
                  <button
                    className="ghost-button danger-button"
                    type="button"
                    onClick={() => deleteIndicator(indicator.id)}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AHP Weight Configuration */}
      {scoringIndicators.length >= 2 ? (
        <div className="ahp-matrix">
          <h3>AHP 权重配置</h3>

          {/* Mode Selector */}
          <div className="ahp-mode-selector">
            {(["equal", "ranked", "manual"] as AhpGenerationMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`ahp-mode-button ${mode === m ? "ahp-mode-active" : ""}`}
                onClick={() => setMode(m)}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <p className="muted" style={{ marginTop: 8 }}>
            {mode === "equal" && "所有参与评分的指标同等重要，权重平均分配。一致性必然通过。"}
            {mode === "ranked" && "按下方顺序排列指标重要性，系统自动生成判断矩阵。排序靠前的指标权重更高。"}
            {mode === "manual" && "手动填写指标间的两两比较值（Saaty 1-9 标度）。对角线自动为1，下三角自动填倒数。"}
          </p>

          {/* Ranked Ordering UI */}
          {mode === "ranked" && (
            <div className="ahp-ranked-order">
              <h4>指标重要性排序（上→下：最重要→最不重要）</h4>
              <div className="ahp-ranked-list">
                {rankedOrder.map((id, index) => {
                  const ind = draftIndicators.find((i) => i.id === id);
                  if (!ind || !ind.participatesInScoring) return null;
                  return (
                    <div key={id} className="ahp-ranked-item">
                      <span className="ahp-ranked-num">{index + 1}</span>
                      <span className="ahp-ranked-name">{ind.name}</span>
                      <span className="ahp-ranked-category">{ind.category}</span>
                      <div className="ahp-ranked-buttons">
                        <button
                          className="order-button"
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveRankedItem(id, -1)}
                          title="上移"
                        >
                          ↑
                        </button>
                        <button
                          className="order-button"
                          type="button"
                          disabled={index === rankedOrder.length - 1}
                          onClick={() => moveRankedItem(id, 1)}
                          title="下移"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="primary-button" type="button" onClick={regenerateForRanked}>
                  重新生成判断矩阵
                </button>
              </div>
            </div>
          )}

          {/* Manual Matrix (only visible in manual mode) */}
          {mode === "manual" ? (
            <>
              <p className="muted" style={{ marginTop: 12 }}>
                在下三角填写指标间的相对重要程度。选择 <code>{">1"}</code> 表示行指标比列指标更重要，
                选择 <code>{"1/<n>"}</code> 表示行指标不如列指标重要。
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      {scoringIndicators.map((ind) => (
                        <th key={ind.id}>{ind.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scoringIndicators.map((rowInd, i) => (
                      <tr key={rowInd.id}>
                        <td className="label-cell">{rowInd.name}</td>
                        {scoringIndicators.map((colInd, j) => {
                          if (i === j) {
                            return <td key={colInd.id}>1</td>;
                          }
                          if (i < j) {
                            const selectedValue = ahpResult.matrix[i]?.[j] ?? 1;
                            return (
                              <td key={colInd.id}>
                                <select
                                  className="inline-input ahp-select"
                                  value={selectedValue}
                                  onChange={(event) =>
                                    handleComparisonChange(
                                      rowInd.id,
                                      colInd.id,
                                      Number(event.target.value),
                                    )
                                  }
                                >
                                  {AHP_SELECT_VALUES.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          }
                          const reciprocal = ahpResult.matrix[i]?.[j] ?? 1;
                          return (
                            <td key={colInd.id} className="reciprocal-cell">
                              {ahpValueLabel(reciprocal)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Auto-generated matrix preview */
            <div className="ahp-matrix-preview" style={{ marginTop: 12 }}>
              <h4>生成的判断矩阵预览</h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      {scoringIndicators.map((ind) => (
                        <th key={ind.id}>{ind.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ahpResult.matrix.map((row, i) => (
                      <tr key={scoringIndicators[i]?.id}>
                        <td className="label-cell">{scoringIndicators[i]?.name}</td>
                        {row.map((value, j) => (
                          <td key={j} className={i > j ? "reciprocal-cell" : ""}>
                            {i === j ? "1" : ahpValueLabel(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted" style={{ marginTop: 6 }}>
                切换到「手动：判断矩阵」可编辑此矩阵。
              </p>
            </div>
          )}

          {/* Consistency Metrics */}
          <div className="ahp-consistency">
            <h4>一致性检验</h4>
            <div className="ahp-stats">
              <div className="ahp-stat">
                <span className="ahp-stat-label">λ<sub>max</sub></span>
                <span className="ahp-stat-value">{ahpResult.consistency.lambdaMax.toFixed(4)}</span>
              </div>
              <div className="ahp-stat">
                <span className="ahp-stat-label">CI</span>
                <span className="ahp-stat-value">{ahpResult.consistency.ci.toFixed(4)}</span>
              </div>
              <div className="ahp-stat">
                <span className="ahp-stat-label">RI</span>
                <span className="ahp-stat-value">{ahpResult.consistency.ri.toFixed(2)}</span>
              </div>
              <div className="ahp-stat">
                <span className="ahp-stat-label">CR</span>
                <span className="ahp-stat-value">{ahpResult.consistency.cr.toFixed(4)}</span>
              </div>
              <div className={`ahp-pass-badge ${ahpResult.consistency.passed ? "ahp-pass" : "ahp-fail"}`}>
                {ahpResult.consistency.passed ? "✓ 通过 (CR ≤ 0.1)" : "✗ 不通过 (CR > 0.1)"}
              </div>
            </div>
          </div>

          {/* Apply Button */}
          <div style={{ marginTop: 16 }}>
            {crFailed ? (
              <p className="muted" style={{ color: "var(--error)", marginBottom: 8 }}>
                一致性检验未通过（CR &gt; 0.1），建议调整判断矩阵后再应用权重。
              </p>
            ) : null}
            <button
              className="primary-button"
              type="button"
              onClick={applyWeights}
              title={crFailed ? "CR 不通过，权重可能不稳定 — 仍然可以强制应用" : undefined}
            >
              应用权重
            </button>
          </div>
        </div>
      ) : scoringIndicators.length === 1 ? (
        <div className="ahp-matrix">
          <h3>AHP 权重配置</h3>
          <p className="muted">仅有一个参与评分的指标，权重自动为 100%。</p>
          <div className="ahp-consistency">
            <h4>一致性检验</h4>
            <div className="ahp-stats">
              <div className="ahp-pass-badge ahp-pass">✓ 通过 (n ≤ 2, CR = 0)</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="primary-button" type="button" onClick={applyWeights}>
              应用权重
            </button>
          </div>
        </div>
      ) : (
        <div className="ahp-matrix">
          <h3>AHP 权重配置</h3>
          <p className="muted">没有参与评分的指标，请先启用至少一个指标的「参与评分」选项。</p>
        </div>
      )}
    </section>
  );
}
