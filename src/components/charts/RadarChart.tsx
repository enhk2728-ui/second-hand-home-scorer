export interface RadarDatum {
  id: string;
  label: string;
  score: number;
}

interface RadarChartProps {
  data: RadarDatum[];
}

function shortLabel(label: string, maxLen: number): string {
  return label.length > maxLen ? label.slice(0, maxLen) : label;
}

export function RadarChart({ data }: RadarChartProps) {
  const n = data.length;
  if (n === 0) return <p className="muted">暂无指标得分。</p>;

  if (n < 3) {
    return (
      <div className="radar-bar-list">
        {data.map((d) => (
          <div key={d.id} className="radar-bar-row">
            <span className="radar-bar-label" title={d.label}>{shortLabel(d.label, 6)}</span>
            <div className="radar-bar-track">
              <div
                className="radar-bar-fill"
                style={{ width: `${Math.max(0, Math.min(100, d.score))}%` }}
              />
            </div>
            <span className="radar-bar-value">{Math.round(d.score)}</span>
          </div>
        ))}
      </div>
    );
  }

  const cx = 150;
  const baseRadius = 80;
  const labelMaxLen = n > 10 ? 4 : n > 6 ? 6 : 20;

  const angleStep = (Math.PI * 2) / n;
  const startAngle = -Math.PI / 2;

  const vertices = data.map((d, i) => {
    const angle = startAngle + angleStep * i;
    const scaled = baseRadius * Math.max(0, Math.min(100, d.score)) / 100;
    return { x: cx + Math.cos(angle) * scaled, y: cx + Math.sin(angle) * scaled };
  });

  const axisEndpoints = data.map((_, i) => {
    const angle = startAngle + angleStep * i;
    return { x: cx + Math.cos(angle) * baseRadius, y: cx + Math.sin(angle) * baseRadius };
  });

  return (
    <svg className="radar" viewBox="0 0 300 300" role="img" aria-label="指标雷达图">
      {[25, 50, 75].map((level) => (
        <circle
          key={level}
          cx={cx}
          cy={cx}
          r={baseRadius * level / 100}
          fill="none"
          stroke="#cbd5e0"
          strokeWidth="0.5"
          strokeDasharray="3,3"
          opacity={0.5}
        />
      ))}
      <circle cx={cx} cy={cx} r={baseRadius} fill="none" stroke="#94a3b8" strokeWidth="1.5" />

      {/* Ring scale labels */}
      {[25, 50, 75].map((level) => (
        <text
          key={`s-${level}`}
          x={cx + 4}
          y={cx - baseRadius * level / 100 + 4}
          fontSize="8"
          fill="#94a3b8"
        >
          {level}
        </text>
      ))}

      {/* Axis lines */}
      {axisEndpoints.map((ep, i) => (
        <line key={`ax-${i}`} x1={cx} y1={cx} x2={ep.x} y2={ep.y} stroke="#e2e8f0" strokeWidth="0.5" />
      ))}

      {/* Data polygon */}
      <polygon
        points={vertices.map((v) => `${v.x},${v.y}`).join(" ")}
        fill="rgba(13, 148, 136, 0.18)"
        stroke="#0d9488"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {vertices.map((v, i) => (
        <circle key={`dp-${i}`} cx={v.x} cy={v.y} r="3" fill="#0d9488" />
      ))}

      {/* Labels */}
      {data.map((d, i) => {
        const angle = startAngle + angleStep * i;
        const labelR = baseRadius + 26;
        const lx = cx + Math.cos(angle) * labelR;
        const ly = cx + Math.sin(angle) * labelR;
        const anchor = angle > 0.01 && angle < Math.PI - 0.01 ? "start" : angle < -0.01 && angle > -Math.PI + 0.01 ? "end" : "middle";

        return (
          <text
            key={d.id}
            x={lx}
            y={ly}
            textAnchor={anchor}
            fontSize={n > 10 ? "9" : "10"}
            fill="#334155"
            dominantBaseline="middle"
          >
            <title>{d.label}</title>
            {shortLabel(d.label, labelMaxLen)}
          </text>
        );
      })}
    </svg>
  );
}
