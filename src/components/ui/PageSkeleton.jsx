import { Skeleton } from './Skeleton.jsx';

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading workspace">
      <div className="space-y-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-7 w-28" />
            <Skeleton className="mt-4 h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card xl:col-span-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-2 h-3 w-64" />
          <Skeleton className="mt-6 h-[260px] w-full" />
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mx-auto mt-8 h-44 w-44 rounded-full" />
          <Skeleton className="mt-6 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-4/5" />
        </div>
      </div>
    </div>
  );
}
