import type { Indicator, PropertyRecord, PropertyScore } from "../domain/types";
import { Heatmap } from "./charts/Heatmap";

interface ResultsViewProps {
  properties: PropertyRecord[];
  indicators: Indicator[];
  scores: PropertyScore[];
}

export function ResultsView({ properties, indicators, scores }: ResultsViewProps) {
  const scoreById = new Map(scores.map((score) => [score.propertyId, score]));
  const normal = properties.filter((p) => !scoreById.get(p.id)?.eliminated);
  const eliminated = properties.filter((p) => scoreById.get(p.id)?.eliminated);

  normal.sort((a, b) => {
    const sa = scoreById.get(a.id)?.totalScore ?? 0;
    const sb = scoreById.get(b.id)?.totalScore ?? 0;
    return sb - sa;
  });

  const gradeLabel: Record<string, string> = {
    excellent: "优秀",
    good: "良好",
    average: "一般",
    poor: "较差"
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Results</p>
          <h2>评分结果</h2>
        </div>
      </div>

      <h3>正常排名</h3>
      {normal.length === 0 ? (
        <p className="muted">暂无正常房源。</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>房源</th>
                <th>综合分</th>
                <th>等级</th>
              </tr>
            </thead>
            <tbody>
              {normal.map((property, index) => {
                const score = scoreById.get(property.id);
                return (
                  <tr key={property.id}>
                    <td>{index + 1}</td>
                    <td>{property.name}</td>
                    <td>{score?.totalScore}</td>
                    <td>{score ? gradeLabel[score.dominantGrade] : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {eliminated.length > 0 && (
        <>
          <h3>淘汰列表</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>房源</th>
                  <th>硬伤原因</th>
                </tr>
              </thead>
              <tbody>
                {eliminated.map((property) => {
                  const score = scoreById.get(property.id);
                  return (
                    <tr key={property.id} className="eliminated-row">
                      <td>{property.name}</td>
                      <td>{score?.hardFailReasons.join("; ") ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3>指标热力图</h3>
      <Heatmap properties={normal} indicators={indicators.filter((ind) => ind.participatesInScoring)} scores={scores} />
    </section>
  );
}
