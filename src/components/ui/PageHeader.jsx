export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-forest-700">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1.5 text-balance font-display text-[28px] font-[650] leading-[1.15] tracking-[-0.025em] text-ink-900 md:text-[30px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
