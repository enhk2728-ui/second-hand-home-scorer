interface RadarChartProps {
  scores: Record<string, number>;
}

export function RadarChart({ scores }: RadarChartProps) {
  const entries = Object.entries(scores);
  if (entries.length === 0) return <p className="muted">暂无维度得分。</p>;

  const center = 120;
  const radius = 90;
  const points = entries.map(([, score], index) => {
    const angle = (Math.PI * 2 * index) / entries.length - Math.PI / 2;
    const scaled = radius * Math.max(0, Math.min(100, score)) / 100;
    return `${center + Math.cos(angle) * scaled},${center + Math.sin(angle) * scaled}`;
  });

  return (
    <svg className="radar" viewBox="0 0 240 240" role="img" aria-label="维度雷达图">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#cbd5c0" />
      <polygon points={points.join(" ")} fill="rgba(65, 107, 89, 0.28)" stroke="#416b59" strokeWidth="2" />
      {entries.map(([label], index) => {
        const angle = (Math.PI * 2 * index) / entries.length - Math.PI / 2;
        return (
          <text key={label} x={center + Math.cos(angle) * 108} y={center + Math.sin(angle) * 108} textAnchor="middle" fontSize="10">
            {label}
          </text>
        );
      })}
    </svg>
  );
}
