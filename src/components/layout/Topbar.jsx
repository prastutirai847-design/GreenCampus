import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Menu } from 'lucide-react';
import { useCampus } from '../../context/CampusContext.jsx';
import { initials } from '../../utils/format.js';

const PAGE_LABELS = {
  '/': 'Dashboard',
  '/analytics': 'Analytics',
  '/emissions': 'Emissions',
  '/data-entry': 'Consumption',
  '/buildings': 'Buildings',
  '/departments': 'Departments',
  '/reports': 'Reports',
  '/recommendations': 'Recommendations',
  '/settings': 'Settings',
};

export function Topbar({ onMenu }) {
  const { profile } = useCampus();
  const location = useLocation();
  const label = location.pathname.startsWith('/buildings/')
    ? 'Building analytics'
    : PAGE_LABELS[location.pathname] ?? 'Not found';

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-sand-50/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="-ml-1 rounded-lg p-2 text-ink-500 transition hover:bg-sand-100 hover:text-ink-900 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="hidden items-center gap-1.5 text-xs text-ink-400 sm:flex">
          <span>Sustainability</span>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="font-medium text-ink-700">{label}</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span
            className="hidden items-center gap-1.5 rounded-md border border-info-100 bg-info-50 px-2 py-1 text-[10px] font-[550] text-info-700 sm:inline-flex"
            title="This workspace is preloaded with illustrative sample data."
          >
            <span className="h-1.5 w-1.5 rounded-full bg-info" aria-hidden="true" />
            Sample dataset
          </span>
          {profile?.academicYear ? (
            <span className="hidden text-xs text-ink-400 md:block">AY {profile.academicYear}</span>
          ) : null}
          <span className="hidden h-5 w-px bg-line md:block" aria-hidden="true" />
          <Link
            to="/settings"
            aria-label="Open college settings"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-[11px] font-semibold text-forest-700 shadow-sm transition hover:border-forest-200 hover:bg-forest-50"
          >
            {initials(profile?.name || 'GreenCampus')}
          </Link>
        </div>
      </div>
    </header>
  );
}
