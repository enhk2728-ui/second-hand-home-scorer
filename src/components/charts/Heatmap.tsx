import type { Indicator, PropertyRecord, PropertyScore } from "../../domain/types";

interface HeatmapProps {
  properties: PropertyRecord[];
  indicators: Indicator[];
  scores: PropertyScore[];
}

function scoreColor(n: number): string {
  if (n >= 90) return "#2d6a4f";
  if (n >= 80) return "#52b788";
  if (n >= 70) return "#f0c441";
  if (n >= 60) return "#dd9955";
  return "#c0392b";
}

export function Heatmap({ properties, indicators, scores }: HeatmapProps) {
  const scoreById = new Map(scores.map((score) => [score.propertyId, score]));
  const scoringIndicators = indicators.filter((ind) => ind.participatesInScoring);

  if (properties.length === 0 || scoringIndicators.length === 0) {
    return <p className="muted">暂无数据可展示热力图。</p>;
  }

  return (
    <div className="heatmap-wrap">
      <table>
        <thead>
          <tr>
            <th>房源</th>
            {scoringIndicators.map((ind) => (
              <th key={ind.id}>{ind.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => {
            const score = scoreById.get(property.id);
            return (
              <tr key={property.id}>
                <td>{property.name}</td>
                {scoringIndicators.map((ind) => {
                  const indicatorScore = score?.indicatorScores[ind.id] ?? 0;
                  return (
                    <td key={ind.id} style={{ backgroundColor: scoreColor(indicatorScore), color: "#fff", textAlign: "center" }}>
                      {Math.round(indicatorScore)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
