import type { GradeKey, PropertyRecord, PropertyScore, Indicator } from "../domain/types";
import { RadarChart, type RadarDatum } from "./charts/RadarChart";
import { EVALUATION_GRADES } from "../domain/defaults";

interface PropertyDetailProps {
  property: PropertyRecord;
  score: PropertyScore;
  indicators: Indicator[];
}

export function PropertyDetail({ property, score, indicators }: PropertyDetailProps) {
  const gradeLabel: Record<GradeKey, string> = {
    excellent: "优秀",
    good: "良好",
    average: "一般",
    poor: "较差"
  };

  const radarData: RadarDatum[] = indicators
    .filter((ind) => ind.participatesInScoring)
    .map((ind) => ({
      id: ind.id,
      label: ind.name,
      score: score.indicatorScores[ind.id] ?? 0
    }));

  return (
    <section className="panel detail-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Detail</p>
          <h2>{property.name}</h2>
        </div>
      </div>

      {score.eliminated ? (
        <div className="alert alert-error">
          已淘汰 — {score.hardFailReasons.join("; ")}
        </div>
      ) : (
        <>
          <div className="score-summary">
            <span className="score-big">{score.totalScore}</span>
            <span className="grade-tag" data-grade={score.dominantGrade}>
              {gradeLabel[score.dominantGrade]}
            </span>
          </div>

          <div className="membership-bars">
            {EVALUATION_GRADES.map((grade) => (
              <div key={grade.key} className="membership-row">
                <span className="membership-label">{grade.label}</span>
                <span className="membership-bar-track">
                  <span className="membership-bar-fill" style={{ width: `${score.membership[grade.key] * 100}%` }} />
                </span>
                <span className="membership-value">{Math.round(score.membership[grade.key] * 100)}%</span>
              </div>
            ))}
          </div>

          <h3>指标得分</h3>
          <RadarChart data={radarData} />
        </>
      )}
    </section>
  );
}
