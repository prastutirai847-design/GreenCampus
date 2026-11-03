import { BarChart3, Building2, FileCheck2, Leaf } from 'lucide-react';
import { BrandMark } from './BrandMark.jsx';

const POINTS = [
  {
    icon: BarChart3,
    title: 'One credible inventory',
    description: 'Electricity, water, fuel, waste and commuting recorded in a single workspace.',
  },
  {
    icon: Building2,
    title: 'Building-level visibility',
    description: 'See which blocks drive consumption and where reductions are most practical.',
  },
  {
    icon: FileCheck2,
    title: 'Report-ready outputs',
    description: 'Scope summaries, methodology notes and CSV exports for internal review.',
  },
];

export function AuthLayout({ children, maxWidth = 'max-w-[420px]', panelLabel }) {
  return (
    <div className="min-h-screen bg-sand-50">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <aside className="relative hidden overflow-hidden bg-forest-900 px-10 py-10 text-white lg:flex lg:flex-col xl:px-14 xl:py-12">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full border border-white/5"
            aria-hidden="true"
          />

          <BrandMark tone="dark" />

          <div className="mt-16 max-w-md xl:mt-20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200">
              {panelLabel ?? 'College sustainability office'}
            </p>
            <h2 className="mt-4 font-display text-[32px] font-[650] leading-[1.15] tracking-[-0.025em] text-white xl:text-[36px]">
              Measure the campus.
              <br />
              Make the reductions count.
            </h2>
            <p className="mt-4 text-[13px] leading-relaxed text-white/65">
              GreenCampus keeps consumption records, estimates and reporting in one place, so the
              sustainability office can move from scattered spreadsheets to a defensible inventory.
            </p>

            <ul className="mt-9 space-y-5">
              {POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <li key={point.title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-lime-200">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-white">{point.title}</p>
                      <p className="mt-0.5 max-w-sm text-[12px] leading-relaxed text-white/50">
                        {point.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-auto flex items-start gap-2.5 border-t border-white/10 pt-6 text-[11px] leading-relaxed text-white/40">
            <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-200/80" aria-hidden="true" />
            <p>
              Frontend prototype. Sample data is illustrative, emission estimates are not verified
              measurements, and sign-in is mocked in this browser.
            </p>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="flex flex-1 items-center justify-center py-8 sm:py-10">
            <div className={`w-full ${maxWidth}`}>{children}</div>
          </div>
          <p className="mx-auto max-w-md text-center text-[11px] leading-relaxed text-ink-400 lg:hidden">
            Prototype workspace · sample data is illustrative · mock sign-in stored in this browser
          </p>
        </main>
      </div>
    </div>
  );
}
