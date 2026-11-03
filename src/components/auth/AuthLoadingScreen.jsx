import { Loader2 } from 'lucide-react';
import { BrandMark } from './BrandMark.jsx';

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sand-50 px-6">
      <BrandMark />
      <div className="flex items-center gap-2 text-[12px] text-ink-500" role="status" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin text-forest-600" aria-hidden="true" />
        Restoring your session…
      </div>
    </div>
  );
}
