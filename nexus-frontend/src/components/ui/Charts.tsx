import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

const CHART_COLORS = ['#4553FF', '#818CF8', '#C7D2FE', '#15803D', '#B45309', '#B91C1C'];

const gridStroke = 'rgb(var(--color-border))';
const tickFill = 'rgb(var(--color-ink-faint))';

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-ink">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-ink-muted">
          {p.name}: <span className="font-mono font-medium text-ink">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function TrendLineChart({ data, dataKey, xKey }: { data: any[]; dataKey: string; xKey: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: tickFill, fontSize: 12 }} axisLine={{ stroke: gridStroke }} tickLine={false} />
        <YAxis tick={{ fill: tickFill, fontSize: 12 }} axisLine={false} tickLine={false} />
        <RechartsTooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey={dataKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ComparisonBarChart({ data, dataKey, xKey }: { data: any[]; dataKey: string; xKey: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: tickFill, fontSize: 12 }} axisLine={{ stroke: gridStroke }} tickLine={false} />
        <YAxis tick={{ fill: tickFill, fontSize: 12 }} axisLine={false} tickLine={false} />
        <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--color-canvas))' }} />
        <Bar dataKey={dataKey} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DistributionDonutChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <RechartsTooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
