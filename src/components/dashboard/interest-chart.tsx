"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = ["#D4A574", "#8B9D77", "#C27A8A", "#A67C52", "#C4956A", "#B8A898", "#7B8FA1", "#6B9AC4", "#7A9D6B", "#A08060"];

interface InterestsChartProps {
  data: { tag: string; count: number }[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { name: string } }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3.5 py-2.5 shadow-lg">
      <p className="text-muted-foreground text-[0.7rem]">
        {payload[0].payload.name}
      </p>
      <p className="font-display text-foreground text-[1.15rem] font-semibold mt-0.5">
        {payload[0].value}{" "}
        <span className="text-muted-foreground text-[0.6rem] font-normal font-sans">
          pelanggan
        </span>
      </p>
    </div>
  );
}

export function InterestsChart({ data }: InterestsChartProps) {
  const chartData = data.map((d, i) => ({
    name: d.tag,
    value: d.count,
    color: COLORS[i % COLORS.length],
  }));
  return (
    <div className="bg-card rounded-xl border border-border/40 p-5 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <h3 className="font-display text-foreground text-lg sm:text-xl font-semibold">
            Minat Pelanggan Teratas
          </h3>
          <p className="text-muted-foreground text-sm mt-0.5">
            Interest tags berdasarkan jumlah pelanggan
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/60 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-[#8B9D77]" />
          <span className="text-muted-foreground text-xs font-medium">
            {chartData.length} tag dilacak
          </span>
        </div>
      </div>

      <div className="h-[280px] sm:h-[320px] lg:h-[360px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barCategoryGap="22%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={85}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--border)", opacity: 0.2 }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={30}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
