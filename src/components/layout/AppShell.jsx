import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useCampus } from '../../context/CampusContext.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { PageSkeleton } from '../ui/PageSkeleton.jsx';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  const { loading, error, reload } = useCampus();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-sand-50">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="lg:pl-[268px]">
        <Topbar onMenu={() => setNavOpen(true)} />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {loading ? (
            <PageSkeleton />
          ) : error ? (
            <ErrorState
              title="Workspace could not be loaded"
              message={error}
              onRetry={reload}
            />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
