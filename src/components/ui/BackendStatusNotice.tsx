import React from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Settings } from 'lucide-react';
import { useStudioData } from '../../hooks/useStudioData';

interface BackendStatusNoticeProps {
  compact?: boolean;
}

export const BackendStatusNotice: React.FC<BackendStatusNoticeProps> = ({ compact = false }) => {
  const { backendHealth, isCheckingHealth, refreshBackendHealth, setActivePage } =
    useStudioData();

  if (backendHealth.connected) {
    return (
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium text-[#D1FAE5]">
            Backend Connected
            {backendHealth.activeModel ? ` · Model: ${backendHealth.activeModel}` : ''}
            {typeof backendHealth.latencyMs === 'number'
              ? ` · ${backendHealth.latencyMs} ms`
              : ''}
          </p>
        </div>
        <button
          type="button"
          disabled={isCheckingHealth}
          onClick={() => void refreshBackendHealth()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
          <span>Recheck</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E59A1A]/25 bg-[#151821] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <AlertTriangle className="h-4 w-4 text-[#E59A1A] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-[#F3F5F8]">
            Backend Not Connected – Start the backend server and try again.
          </p>
          {!compact && (
            <p className="text-xs text-[#9CA3B2] leading-relaxed">
              Stories, characters, and prompt drafts are safely saved locally in your browser.
              Video generation requires running your FastAPI backend and Cloud GPU worker.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
        <button
          type="button"
          disabled={isCheckingHealth}
          onClick={() => void refreshBackendHealth()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-[#E6E9F0] transition-colors whitespace-nowrap"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
          <span>Retry</span>
        </button>
        <button
          type="button"
          onClick={() => setActivePage('settings')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-[#E6E9F0] transition-colors whitespace-nowrap"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};
