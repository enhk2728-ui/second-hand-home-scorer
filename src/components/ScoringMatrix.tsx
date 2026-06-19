import type { Indicator, PropertyRecord } from "../domain/types";

interface ScoringMatrixProps {
  properties: PropertyRecord[];
  indicators: Indicator[];
  onChange: (property: PropertyRecord) => void;
  onComplete: () => void;
}

function groupedIndicators(indicators: Indicator[]) {
  return indicators
    .filter((indicator) => indicator.participatesInScoring || indicator.isHardFailCapable)
    .reduce<Record<string, Indicator[]>>((groups, indicator) => {
      groups[indicator.category] ??= [];
      groups[indicator.category].push(indicator);
      return groups;
    }, {});
}

export function ScoringMatrix({ properties, indicators, onChange, onComplete }: ScoringMatrixProps) {
  const groups = groupedIndicators(indicators);

  if (properties.length === 0) {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Scoring</p>
            <h2>统一打分</h2>
          </div>
        </div>
        <p className="muted">暂无房源。请先在「录入」页面添加房源。</p>
      </section>
    );
  }

  function updatePropertyValue(property: PropertyRecord, indicator: Indicator, value: string | number | boolean | "") {
    const valuesByIndicatorId = { ...property.valuesByIndicatorId, [indicator.id]: value };
    const hardFails = new Set(property.hardFails);
    if (indicator.isHardFailCapable) {
      if (value === true) hardFails.add(indicator.name);
      else hardFails.delete(indicator.name);
    }
    onChange({
      ...property,
      valuesByIndicatorId,
      hardFails: Array.from(hardFails),
      updatedAt: new Date().toISOString()
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Scoring</p>
          <h2>统一打分</h2>
        </div>
      </div>

      <p className="muted">逐项对比所有房源，统一打分。硬伤否决项勾选后将进入淘汰列表。</p>

      {Object.entries(groups).map(([category, items]) => (
        <div className="section-block" key={category}>
          <h3>{category}</h3>
          {items.map((indicator) => (
            <div className="score-card" key={indicator.id}>
              <div className="score-card-header">
                <span className="score-card-title">{indicator.name}</span>
                {indicator.isHardFailCapable && <span className="badge badge-warn">硬伤否决</span>}
              </div>
              <div className="score-card-body">
                {properties.map((property) => {
                  const value = property.valuesByIndicatorId[indicator.id] ?? "";

                  return (
                    <div className="score-row" key={property.id}>
                      <span className="score-property-name">{property.name}</span>

                      {indicator.inputType === "rating10" && (
                        <div className="score-control">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={Number(value || 5)}
                            onChange={(event) => updatePropertyValue(property, indicator, Number(event.target.value))}
                          />
                          <span className="score-value">{value || 5}</span>
                        </div>
                      )}

                      {indicator.inputType === "number" && (
                        <div className="score-control">
                          <input
                            type="number"
                            value={String(value)}
                            onChange={(event) =>
                              updatePropertyValue(property, indicator, Number(event.target.value) || "")
                            }
                          />
                        </div>
                      )}

                      {indicator.inputType === "select" && (
                        <div className="score-control">
                          <select
                            value={String(value)}
                            onChange={(event) => updatePropertyValue(property, indicator, event.target.value)}
                          >
                            <option value="">未选择</option>
                            {indicator.fceRule.type === "selectMapping" &&
                              indicator.fceRule.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {indicator.inputType === "boolean" && (
                        <div className="score-control">
                          <label className="checkbox-row">
                            <input
                              type="checkbox"
                              checked={value === true}
                              onChange={(event) => updatePropertyValue(property, indicator, event.target.checked)}
                            />
                            {indicator.isHardFailCapable ? "存在硬伤" : "是"}
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div style={{ marginTop: 20 }}>
        <button className="primary-button" type="button" onClick={onComplete}>
          完成打分，查看结果
        </button>
      </div>
    </section>
  );
}
