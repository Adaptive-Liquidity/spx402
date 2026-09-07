import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/**
 * Token price context chart for the agent dossier. Lives in its own module
 * so the charting library is code-split and only downloaded when a tokenized
 * agent with a price series is actually on screen.
 */
export default function PriceContextChart({ data }: { data: { t: string; v: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="amberFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="oklch(0.32 0.04 65)" strokeOpacity={0.3} vertical={false} />
          <XAxis
            dataKey="t"
            stroke="var(--wire)"
            tick={{ fontSize: 10, fontFamily: "monospace" }}
          />
          <YAxis
            stroke="var(--wire)"
            tick={{ fontSize: 10, fontFamily: "monospace" }}
            width={70}
          />
          <Tooltip
            contentStyle={{
              background: "var(--panel-deep)",
              border: "1px solid var(--bronze)",
              borderRadius: 0,
              fontFamily: "monospace",
              fontSize: 11,
            }}
            labelStyle={{ color: "var(--wire)" }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke="var(--amber)"
            strokeWidth={2}
            fill="url(#amberFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
