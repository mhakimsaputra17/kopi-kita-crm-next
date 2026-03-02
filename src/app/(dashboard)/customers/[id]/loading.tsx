import { Skeleton } from "@/components/ui/skeleton";

export default function EditCustomerLoading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
      <div className="max-w-2xl mx-auto bg-card rounded-xl border border-border/40 p-6 sm:p-8 space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        {/* Contact */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        {/* Favorite Drink */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        {/* Tags */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="flex gap-1.5">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
