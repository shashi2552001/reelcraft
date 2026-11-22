import React, { useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Database,
  Download,
  HardDrive,
  RefreshCw,
  RotateCcw,
  Server,
  Trash2,
  Upload,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useStudioData } from '../hooks/useStudioData';
import {
  API_ENDPOINTS_BLUEPRINT,
  DATABASE_BLUEPRINT,
  VIDEO_MODELS,
} from '../services/blueprints/infrastructureData';
import type { AspectRatio, ModelId, VisualStyle } from '../types/studio';
import { validateBackendUrl } from '../utils/validation';

type SettingsTab = 'studio' | 'database' | 'backend-storage' | 'models-gpu';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    backendHealth,
    isCheckingHealth,
    updateSettings,
    refreshBackendHealth,
    resetStarterDrafts,
    clearLocalData,
    exportBackup,
    importBackup,
  } = useStudioData();

  const [activeTab, setActiveTab] = useState<SettingsTab>('studio');
  const [backendUrlInput, setBackendUrlInput] = useState(settings.backendBaseUrl);
  const [urlError, setUrlError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleSaveBackendUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError('');
    setStatusMessage('');
    const check = validateBackendUrl(backendUrlInput);
    if (!check.valid) {
      setUrlError(check.error ?? 'Invalid backend URL.');
      return;
    }

    const clean = backendUrlInput.trim().replace(/\/+$/, '');
    updateSettings({ backendBaseUrl: clean });
    const health = await refreshBackendHealth(clean);
    setStatusMessage(
      health.connected
        ? `Backend Connected (${clean} · ${health.latencyMs}ms)`
        : health.statusText
    );
  };

  const handleDownloadBackup = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reelcraft-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (typeof reader.result === 'string') {
          importBackup(reader.result);
          setStatusMessage('Backup JSON imported into browser local drafts.');
        }
      } catch (err) {
        setUrlError(err instanceof Error ? err.message : 'Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#F8FAFC]">
          Settings & Infrastructure
        </h1>
        <p className="text-sm text-[#9CA3B2] mt-1">
          Configure studio defaults, connect your FastAPI backend URL, and inspect the PostgreSQL, S3, and Cloud GPU setup blueprints.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[#12151E] border border-white/[0.08] overflow-x-auto">
        {[
          { id: 'studio', label: 'Studio & Backend Connection' },
          { id: 'database', label: 'PostgreSQL Schema (12 Tables)' },
          { id: 'backend-storage', label: 'FastAPI & Storage' },
          { id: 'models-gpu', label: 'AI Models & Cloud GPU' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#1F2533] text-[#F8FAFC]'
                  : 'text-[#8E96A4] hover:text-[#E6E9F0]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'studio' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F3F5F8]">
              <HardDrive className="h-4 w-4 text-[#E59A1A]" />
              <span>Local Draft Mode vs. PostgreSQL Database</span>
            </div>
            <p className="text-xs text-[#9CA3B2] leading-relaxed">
              Your personal drafts (stories, character profiles, prompts) are saved in browser{' '}
              <code className="font-mono text-[#E6E9F0]">localStorage</code> until you start
              your FastAPI + PostgreSQL backend. Large videos and private secrets are never stored in browser local storage.
            </p>
          </div>

          <form
            onSubmit={handleSaveBackendUrl}
            className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-[#F3F5F8]">
                  FastAPI Backend Connection (VITE_API_BASE_URL)
                </h2>
                <p className="text-xs text-[#8E96A4] mt-0.5">
                  Enter http://localhost:8000 once your local FastAPI server is running, then click Save & Test Health.
                </p>
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  backendHealth.connected ? 'text-emerald-400' : 'text-[#E59A1A]'
                }`}
              >
                {backendHealth.connected ? 'Backend Connected' : 'Backend Not Connected'}
              </span>
            </div>

            {urlError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {urlError}
              </div>
            )}
            {statusMessage && (
              <div className="rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#CBD2DF]">
                {statusMessage}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={backendUrlInput}
                onChange={(e) => setBackendUrlInput(e.target.value)}
                placeholder="http://localhost:8000"
                className="flex-1 rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm font-mono text-[#F3F5F8] placeholder-[#5A6375] focus:outline-none focus:border-[#E59A1A]"
              />
              <button
                type="submit"
                disabled={isCheckingHealth}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] disabled:opacity-60 text-[#0B0D12] text-xs font-semibold whitespace-nowrap"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                <span>Save & Test Health</span>
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-[#F3F5F8]">
              Default Studio Preferences
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#9CA3B2] mb-1.5">Default Visual Style</label>
                <select
                  value={settings.defaultStyle}
                  onChange={(e) =>
                    updateSettings({ defaultStyle: e.target.value as VisualStyle })
                  }
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8]"
                >
                  {(
                    [
                      '3D Indian Anime',
                      'Cartoon',
                      'Realistic',
                      'Cinematic',
                      'Custom Style',
                    ] as VisualStyle[]
                  ).map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#9CA3B2] mb-1.5">Default Aspect Ratio</label>
                <select
                  value={settings.defaultAspectRatio}
                  onChange={(e) =>
                    updateSettings({ defaultAspectRatio: e.target.value as AspectRatio })
                  }
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8]"
                >
                  {(['9:16', '16:9', '1:1'] as AspectRatio[]).map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#9CA3B2] mb-1.5">Default Target Model</label>
                <select
                  value={settings.defaultModelId}
                  onChange={(e) =>
                    updateSettings({ defaultModelId: e.target.value as ModelId })
                  }
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8]"
                >
                  {VIDEO_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-[#F3F5F8]">
              Local Draft Backup & Reset
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-[#E6E9F0]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON Backup</span>
              </button>

              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-[#E6E9F0] cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>Import JSON Backup</span>
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImportBackup}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/[0.12] text-xs font-medium text-[#CBD2DF] hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restore Starter Drafts</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-200"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All Local Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F3F5F8]">
              <Database className="h-4 w-4 text-[#E59A1A]" />
              <span>PostgreSQL + SQLAlchemy + Alembic Schema (12 Tables)</span>
            </div>
            <p className="text-xs text-[#9CA3B2] leading-relaxed">
              Full ER diagram and migration commands are in{' '}
              <code className="font-mono text-[#E6E9F0]">docs/database/ER_DIAGRAM.md</code> and{' '}
              <code className="font-mono text-[#E6E9F0]">backend/alembic/</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DATABASE_BLUEPRINT.map((table) => (
              <div
                key={table.name}
                className="rounded-xl border border-white/[0.08] bg-[#12151E] p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-[#E59A1A]">
                    {table.name}
                  </span>
                  <span className="font-mono text-[11px] text-[#7B8494]">
                    {table.indexes.length} index{table.indexes.length === 1 ? '' : 'es'}
                  </span>
                </div>
                <p className="text-xs text-[#9CA3B2]">{table.purpose}</p>
                <ul className="space-y-1 font-mono text-[11px] text-[#CBD2DF] bg-[#0B0D12] rounded-lg p-3 border border-white/[0.06]">
                  {table.columns.map((col) => (
                    <li key={col}>{col}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'backend-storage' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F3F5F8]">
              <Server className="h-4 w-4 text-[#E59A1A]" />
              <span>FastAPI REST Endpoints (/api/v1/*)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[#8E96A4]">
                    <th className="py-2 pr-4 font-medium">Method</th>
                    <th className="py-2 pr-4 font-medium">Endpoint</th>
                    <th className="py-2 font-medium">Responsibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {API_ENDPOINTS_BLUEPRINT.map((ep) => (
                    <tr key={ep.path}>
                      <td className="py-2.5 pr-4 font-mono text-[#E59A1A] whitespace-nowrap">
                        {ep.method}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-[#F3F5F8] whitespace-nowrap">
                        {ep.path}
                      </td>
                      <td className="py-2.5 text-[#9CA3B2]">{ep.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-3">
            <h3 className="font-display text-base font-semibold text-[#F3F5F8]">
              Storage & Security Safeguards
            </h3>
            <ul className="space-y-2 text-xs text-[#B8C0CE] leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#E59A1A] shrink-0 mt-0.5" />
                <span>
                  Supports S3-compatible buckets (Cloudflare R2, Backblaze B2, MinIO, AWS S3) and safe local path-confined disk storage during local development.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#E59A1A] shrink-0 mt-0.5" />
                <span>
                  FastAPI enforces CORS restrictions, file size/MIME upload validation, generation rate limits, ownership scoping, and server-side env secrets.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'models-gpu' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F3F5F8]">
              <Cpu className="h-4 w-4 text-[#E59A1A]" />
              <span>Open-Weight Video Models & Cloud GPU Plan</span>
            </div>
            <p className="text-xs text-[#9CA3B2] leading-relaxed">
              Start with pretrained weights (<span className="text-[#F3F5F8]">Wan 2.2 TI2V-5B</span> or <span className="text-[#F3F5F8]">LTX-Video</span>) on an on-demand 24GB GPU. Each scene renders 4–5s clips that FFmpeg stitches into a verified 30–60s video.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {VIDEO_MODELS.map((model) => (
              <div
                key={model.id}
                className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-[#F8FAFC]">
                      {model.name}
                    </h3>
                    <div className="text-xs text-[#8E96A4] mt-0.5">
                      {model.family} · {model.license}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-[#E59A1A] tabular-nums">
                    {model.minVramGb}–{model.recommendedVramGb} GB VRAM
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg border border-white/[0.06] bg-[#0B0D12] p-3">
                    <div className="text-[#7B8494] mb-1">Max Single Clip & Supported Res</div>
                    <div className="text-[#E6E9F0] font-mono">
                      {model.maxSingleClipSeconds}s/clip · {model.supportedResolutions.length} modes
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-[#0B0D12] p-3">
                    <div className="text-[#7B8494] mb-1">Estimated Cloud GPU Cost</div>
                    <div className="text-[#E6E9F0]">{model.estimatedCloudCostPerHrUsd}</div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-[#0B0D12] p-3">
                    <div className="text-[#7B8494] mb-1">Character Conditioning</div>
                    <div className="text-[#CBD2DF]">{model.characterConsistencyNotes}</div>
                  </div>
                </div>

                <p className="text-xs text-[#9CA3B2] leading-relaxed">{model.strengths}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={resetStarterDrafts}
        title="Restore Starter Drafts"
        message="Reset local browser drafts back to the initial sample projects, stories, characters, and prompts?"
        confirmLabel="Restore Drafts"
        danger={false}
      />

      <ConfirmDialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={clearLocalData}
        title="Clear All Local Data"
        message="Delete all projects, stories, episodes, characters, prompts, and job logs from browser localStorage? This cannot be undone."
        confirmLabel="Clear Everything"
      />
    </div>
  );
};
