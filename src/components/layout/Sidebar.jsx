import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ClipboardList,
  Factory,
  FileText,
  LayoutDashboard,
  Leaf,
  LogOut,
  Settings,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import { NAV_SECTIONS } from '../../data/options.js';
import { classNames, initials } from '../../utils/format.js';
import { useCampus } from '../../context/CampusContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const ICONS = {
  dashboard: LayoutDashboard,
  analytics: BarChart3,
  emissions: Factory,
  data: ClipboardList,
  buildings: Building2,
  departments: UsersRound,
  reports: FileText,
  recommendations: Sparkles,
};

export function Sidebar({ open, onClose }) {
  const { profile } = useCampus();
  const { user, logout } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      push({
        tone: 'info',
        title: 'Signed out',
        description: 'Your local workspace remains saved on this device.',
      });
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <div
        className={classNames(
          'fixed inset-0 z-40 bg-forest-950/50 backdrop-blur-[2px] transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Primary navigation"
        className={classNames(
          'no-print fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col bg-forest-900 text-white transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <Link to="/" onClick={onClose} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-300 text-forest-900">
              <Leaf className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-display text-[15px] font-semibold tracking-tight">
                GreenCampus
              </span>
              <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.18em] text-forest-300">
                Sustainability office
              </span>            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-forest-300 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mt-4 first:mt-2">
              <p className="px-3 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          classNames(
                            'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-[550] transition-colors',
                            isActive
                              ? 'bg-white/10 text-white'
                              : 'text-white/65 hover:bg-white/5 hover:text-white',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={classNames(
                                'h-4 w-4 shrink-0',
                                isActive ? 'text-lime-200' : 'text-white/40 group-hover:text-white/75',
                              )}
                              aria-hidden="true"
                            />
                            <span>{item.label}</span>
                            {isActive ? (
                              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-lime-300" aria-hidden="true" />
                            ) : null}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              classNames(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-[550] transition-colors',
                isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Settings className="h-4 w-4 text-white/40" aria-hidden="true" />
            Settings
          </NavLink>

          <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-lime-200">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-300" aria-hidden="true" />
              Pilot workspace
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
              Sample data stored locally in this browser.
            </p>
          </div>

          <div className="mt-2 flex items-center gap-1 rounded-lg pr-1">
            <Link
              to="/settings"
              onClick={onClose}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-white/5"
              title={user?.email ?? 'Open settings'}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-700 text-[11px] font-semibold text-lime-200">
                {initials(profile?.name || user?.name || 'GreenCampus')}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium text-white">
                  {profile?.shortName || profile?.name || 'GreenCampus'}
                </span>
                <span className="block truncate text-[10px] text-white/45">
                  {user?.name || 'Sustainability admin'}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
