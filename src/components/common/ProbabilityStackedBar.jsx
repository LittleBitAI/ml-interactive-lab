import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

const tooltipLabels = {
  evidenceFromA: 'A에서 발생한 증거 B',
  evidenceFromNotA: 'A가 아닌 경우에서 발생한 증거 B',
  noEvidence: '증거 B가 발생하지 않은 부분',
};

export default function ProbabilityStackedBar({
  evidenceFromA,
  evidenceFromNotA,
  noEvidence,
}) {
  const data = [
    {
      name: '전체 경우',
      evidenceFromA,
      evidenceFromNotA,
      noEvidence,
    },
  ];

  return (
    <div className="probability-chart">
      <div className="probability-chart__canvas">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 12, right: 12, bottom: 10, left: 12 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={formatPercent}
            />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              formatter={(value, name) => [
                formatPercent(Number(value)),
                tooltipLabels[name] ?? name,
              ]}
              labelFormatter={() => '전체 확률을 100%로 본 구성'}
            />
            <Bar
              dataKey="evidenceFromA"
              stackId="probability"
              fill="#4f8ff7"
              radius={[8, 0, 0, 8]}
            />
            <Bar
              dataKey="evidenceFromNotA"
              stackId="probability"
              fill="#66c6a4"
            />
            <Bar
              dataKey="noEvidence"
              stackId="probability"
              fill="#e5e7eb"
              radius={[0, 8, 8, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="probability-chart__legend" aria-label="그래프 범례">
        <span>
          <i className="legend-dot legend-dot--from-a" />
          A에서 나온 B
        </span>
        <span>
          <i className="legend-dot legend-dot--from-not-a" />
          A가 아닌 경우에서 나온 B
        </span>
        <span>
          <i className="legend-dot legend-dot--no-b" />
          B가 발생하지 않음
        </span>
      </div>
    </div>
  );
}
