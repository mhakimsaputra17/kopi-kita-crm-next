import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
      {/* Greeting */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border/40 p-5 sm:p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <Skeleton className="w-10 h-10 rounded-[10px]" />
              <Skeleton className="w-8 h-6 rounded-md" />
            </div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Two-column: Chart + Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* Chart */}
        <div className="lg:col-span-3 bg-card rounded-xl border border-border/40 p-5 sm:p-6">
          <Skeleton className="h-5 w-36 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 flex-1 rounded" style={{ maxWidth: `${90 - i * 15}%` }} />
              </div>
            ))}
          </div>
        </div>

        {/* Campaigns */}
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border/40 p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
