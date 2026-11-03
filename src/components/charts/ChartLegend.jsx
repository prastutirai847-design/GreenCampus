export function ChartLegend({ items, className }) {
  return (
    <div className={className ?? 'mt-4 flex flex-wrap items-center gap-x-4 gap-y-2'}>
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-500"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          {item.label}
          {item.value ? <span className="font-medium text-ink-700">{item.value}</span> : null}
        </span>
      ))}
    </div>
  );
}
