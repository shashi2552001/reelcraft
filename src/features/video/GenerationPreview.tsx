import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Film,
  Loader2,
  ServerOff,
  XCircle,
} from 'lucide-react';
import type {
  AspectRatio,
  GenerationJob,
  JobStatus,
  ScenePlanItem,
  TotalVideoDuration,
  VideoModelSpec,
  VisualStyle,
} from '../../types/studio';

interface GenerationPreviewProps {
  aspectRatio: AspectRatio;
  visualStyle: VisualStyle;
  durationSeconds: TotalVideoDuration;
  resolutionLabel: string;
  scenes: ScenePlanItem[];
  selectedModel: VideoModelSpec;
  compiledPrompt: string;
  activeJob: GenerationJob | null;
  backendConnected: boolean;
  onGoToSettings: () => void;
}

const JOB_STATES: JobStatus[] = [
  'Queued',
  'Processing',
  'Rendering',
  'Completed',
  'Failed',
  'Cancelled',
];

export const GenerationPreview: React.FC<GenerationPreviewProps> = ({
  aspectRatio,
  visualStyle,
  durationSeconds,
  resolutionLabel,
  scenes,
  selectedModel,
  compiledPrompt,
  activeJob,
  backendConnected,
  onGoToSettings,
}) => {
  const frameDimensionsClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16] max-h-[380px] mx-auto'
      : aspectRatio === '1:1'
      ? 'aspect-square max-h-[340px] mx-auto'
      : 'aspect-video w-full';

  const renderStatusIcon = (status: JobStatus) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'Failed':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'Cancelled':
        return <XCircle className="h-4 w-4 text-[#8E96A4]" />;
      case 'Processing':
      case 'Rendering':
        return <Loader2 className="h-4 w-4 text-[#E59A1A] animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-[#E59A1A]" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Preview Viewport */}
      <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-[#F3F5F8]">
            Output Preview Frame
          </h2>
          <span className="font-mono text-xs tabular-nums text-[#8E96A4]">
            {aspectRatio} · {durationSeconds}s ({scenes.length} scenes) · {visualStyle}
          </span>
        </div>

        <div className="rounded-lg bg-[#090B0F] border border-white/[0.06] p-4 flex items-center justify-center min-h-[250px]">
          {activeJob?.status === 'Completed' && activeJob.videoUrl ? (
            <video
              src={activeJob.videoUrl}
              controls
              className={`${frameDimensionsClass} rounded-md bg-black object-contain`}
            />
          ) : (
            <div
              className={`${frameDimensionsClass} w-full rounded-md border border-dashed border-white/[0.12] bg-[#0F1219] flex flex-col items-center justify-center p-5 text-center`}
            >
              {backendConnected ? (
                <Film className="h-7 w-7 text-[#6F7888] mb-2.5" />
              ) : (
                <ServerOff className="h-7 w-7 text-[#E59A1A] mb-2.5" />
              )}
              <div className="text-sm font-medium text-[#E6E9F0]">
                {activeJob
                  ? `Job Status: ${activeJob.status}`
                  : backendConnected
                  ? 'Backend Connected — Ready to Render'
                  : 'Backend Not Connected'}
              </div>
              <p className="text-xs text-[#8E96A4] mt-1.5 max-w-xs leading-relaxed">
                {activeJob?.errorMessage
                  ? activeJob.errorMessage
                  : backendConnected
                  ? `Target ${resolutionLabel} · ${durationSeconds}s stitched via FFmpeg from ${scenes.length} AI clips.`
                  : 'ReelCraft Studio never shows fake generated videos. Start your FastAPI backend and connect a Cloud GPU worker to render actual MP4 files.'}
              </p>
              {!backendConnected && (
                <button
                  type="button"
                  onClick={onGoToSettings}
                  className="mt-4 px-3 py-1.5 rounded-md border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-[#E6E9F0] transition-colors"
                >
                  Open Settings
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-[#8E96A4] flex flex-wrap items-center justify-between gap-2 pt-1">
          <span>Model: {selectedModel.name}</span>
          <span className="font-mono">{resolutionLabel}</span>
        </div>
      </div>

      {/* Generation Job State Machine */}
      <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-[#F3F5F8]">
            Pipeline Status
          </h3>
          {activeJob ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F3F5F8]">
              {renderStatusIcon(activeJob.status)}
              <span>{activeJob.status}</span>
            </span>
          ) : (
            <span className="text-xs text-[#7B8494]">Idle</span>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {JOB_STATES.map((state) => {
            const isCurrent = activeJob?.status === state;
            return (
              <div
                key={state}
                className={`px-2 py-1.5 rounded-md text-center text-[11px] font-medium border ${
                  isCurrent
                    ? state === 'Failed'
                      ? 'border-red-500/40 bg-red-500/15 text-red-200'
                      : state === 'Completed'
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                      : 'border-[#E59A1A]/50 bg-[#E59A1A]/15 text-[#FBBF24]'
                    : 'border-white/[0.06] bg-[#0B0D12] text-[#6F7888]'
                }`}
              >
                {state}
              </div>
            );
          })}
        </div>

        {activeJob?.errorMessage && (
          <div className="rounded-lg border border-red-500/25 bg-red-500/[0.08] px-3 py-2.5 text-xs text-red-200 leading-relaxed">
            {activeJob.errorMessage}
          </div>
        )}
      </div>

      {/* Compiled Context Preview */}
      <div className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-[#F3F5F8]">
            Compiled Generation Payload
          </h3>
          <span className="font-mono text-[11px] text-[#7B8494]">
            FFmpeg {durationSeconds}s Plan
          </span>
        </div>
        <pre className="rounded-lg border border-white/[0.06] bg-[#0B0D12] p-3 text-xs font-mono text-[#B8C0CE] whitespace-pre-wrap break-words max-h-56 overflow-y-auto leading-relaxed">
          {compiledPrompt ||
            'Enter a primary visual prompt or attach a story/character to inspect the compiled scene payload.'}
        </pre>
      </div>
    </div>
  );
};
