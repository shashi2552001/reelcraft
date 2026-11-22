import React, { useMemo, useState } from 'react';
import { Check, Copy, Film, Library, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { useStudioData } from '../hooks/useStudioData';
import { VIDEO_MODELS } from '../services/blueprints/infrastructureData';
import type {
  AspectRatio,
  ModelId,
  PromptItem,
  TotalVideoDuration,
  VisualStyle,
} from '../types/studio';
import { formatShortDate } from '../utils/id';
import { validateRequiredText } from '../utils/validation';

const STYLES: VisualStyle[] = [
  '3D Indian Anime',
  'Cartoon',
  'Realistic',
  'Cinematic',
  'Custom Style',
];
const RATIOS: AspectRatio[] = ['9:16', '16:9', '1:1'];
const DURATIONS: TotalVideoDuration[] = [30, 40, 45, 50, 60];

export const PromptLibraryPage: React.FC = () => {
  const { prompts, settings, upsertPrompt, deletePrompt, loadPromptIntoComposer } =
    useStudioData();

  const [styleFilter, setStyleFilter] = useState<'All' | VisualStyle>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [promptToDelete, setPromptToDelete] = useState<PromptItem | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromptItem | null>(null);
  const [title, setTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [storyPrompt, setStoryPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(settings.defaultStyle);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(settings.defaultAspectRatio);
  const [modelId, setModelId] = useState<ModelId>(settings.defaultModelId);
  const [durationSeconds, setDurationSeconds] = useState<TotalVideoDuration>(30);
  const [formError, setFormError] = useState('');

  const filtered = useMemo(() => {
    return prompts.filter((p) => {
      if (styleFilter !== 'All' && p.visualStyle !== styleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return `${p.title} ${p.prompt} ${p.storyPrompt}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [prompts, searchQuery, styleFilter]);

  const openCreateModal = () => {
    setEditing(null);
    setTitle('');
    setPromptText('');
    setStoryPrompt('');
    setNegativePrompt('blurry faces, extra limbs, watermark, text overlay');
    setVisualStyle(settings.defaultStyle);
    setAspectRatio(settings.defaultAspectRatio);
    setModelId(settings.defaultModelId);
    setDurationSeconds(30);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (item: PromptItem) => {
    setEditing(item);
    setTitle(item.title);
    setPromptText(item.prompt);
    setStoryPrompt(item.storyPrompt);
    setNegativePrompt(item.negativePrompt);
    setVisualStyle(item.visualStyle);
    setAspectRatio(item.aspectRatio);
    setModelId(item.modelId);
    setDurationSeconds(item.durationSeconds);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const titleCheck = validateRequiredText(title, 'Prompt title', 2, 160);
    if (!titleCheck.valid) {
      setFormError(titleCheck.error ?? 'Invalid title.');
      return;
    }
    const promptCheck = validateRequiredText(promptText, 'Prompt body', 4, 4000);
    if (!promptCheck.valid) {
      setFormError(promptCheck.error ?? 'Invalid prompt text.');
      return;
    }

    upsertPrompt({
      id: editing?.id,
      title: title.trim(),
      prompt: promptText.trim(),
      storyPrompt: storyPrompt.trim(),
      negativePrompt: negativePrompt.trim(),
      visualStyle,
      aspectRatio,
      durationSeconds,
      modelId,
      storyId: editing?.storyId,
      characterIds: editing?.characterIds ?? [],
    });
    setModalOpen(false);
  };

  const handleCopy = async (item: PromptItem) => {
    try {
      await navigator.clipboard.writeText(item.prompt);
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F8FAFC]">
            Prompt Library
          </h1>
          <p className="text-sm text-[#9CA3B2] mt-1">
            Save, refine, and reuse tested 30–60s video prompts with style, ratio, and negative prompt presets.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.25]" />
          <span>Save New Prompt</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#12151E] border border-white/[0.08] overflow-x-auto">
          {(['All', ...STYLES] as const).map((style) => {
            const active = styleFilter === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => setStyleFilter(style)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#1F2533] text-[#F8FAFC]'
                    : 'text-[#8E96A4] hover:text-[#E6E9F0]'
                }`}
              >
                {style}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="h-4 w-4 text-[#6F7888] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved prompts..."
            className="w-full rounded-lg border border-white/[0.1] bg-[#12151E] pl-9 pr-3 py-2 text-xs text-[#F3F5F8] placeholder-[#6F7888] focus:outline-none focus:border-[#E59A1A]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Library className="h-5 w-5" />}
          title={prompts.length === 0 ? 'Prompt library is empty' : 'No matching prompts'}
          description="Save reusable shot prompts, camera directions, and negative prompts for quick loading into Create Video."
          actionLabel={prompts.length === 0 ? 'Create First Prompt' : 'Clear Filters'}
          onAction={() => {
            if (prompts.length === 0) {
              openCreateModal();
            } else {
              setStyleFilter('All');
              setSearchQuery('');
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                    {item.title}
                  </h2>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      aria-label={`Edit ${item.title}`}
                      className="p-1.5 rounded-md text-[#8E96A4] hover:text-white hover:bg-white/[0.06]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromptToDelete(item)}
                      aria-label={`Delete ${item.title}`}
                      className="p-1.5 rounded-md text-[#8E96A4] hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-[#8E96A4]">
                  <span>{item.visualStyle}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{item.aspectRatio}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{item.durationSeconds}s</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{formatShortDate(item.updatedAt)}</span>
                </div>

                <p className="text-xs text-[#CBD2DF] leading-relaxed">{item.prompt}</p>

                {item.negativePrompt && (
                  <p className="text-[11px] text-[#7B8494]">Negative: {item.negativePrompt}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => void handleCopy(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.1] text-xs font-medium text-[#CBD2DF] hover:text-white"
                >
                  {copiedId === item.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedId === item.id ? 'Copied' : 'Copy Prompt'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    loadPromptIntoComposer({
                      title: item.title,
                      prompt: item.prompt,
                      storyPrompt: item.storyPrompt,
                      negativePrompt: item.negativePrompt,
                      visualStyle: item.visualStyle,
                      customStyleNote: item.customStyleNote ?? '',
                      aspectRatio: item.aspectRatio,
                      durationSeconds: item.durationSeconds,
                      modelId: item.modelId,
                      storyId: item.storyId ?? '',
                      characterIds: item.characterIds,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-xs font-semibold"
                >
                  <Film className="h-3.5 w-3.5" />
                  <span>Use in Create Video</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Prompt Template' : 'Save New Prompt'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="pl-title" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Title
            </label>
            <input
              id="pl-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Monsoon Courtyard Reel"
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>

          <div>
            <label htmlFor="pl-prompt" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Visual Prompt
            </label>
            <textarea
              id="pl-prompt"
              rows={4}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>

          <div>
            <label htmlFor="pl-story" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Story Context Note
            </label>
            <input
              id="pl-story"
              type="text"
              value={storyPrompt}
              onChange={(e) => setStoryPrompt(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>

          <div>
            <label htmlFor="pl-neg" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Negative Prompt
            </label>
            <input
              id="pl-neg"
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="pl-style" className="block text-xs font-medium text-[#CBD2DF] mb-1">
                Style
              </label>
              <select
                id="pl-style"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value as VisualStyle)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-2.5 py-2 text-xs text-[#F3F5F8]"
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pl-dur" className="block text-xs font-medium text-[#CBD2DF] mb-1">
                Duration
              </label>
              <select
                id="pl-dur"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value) as TotalVideoDuration)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-2.5 py-2 text-xs text-[#F3F5F8]"
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}s
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pl-ratio" className="block text-xs font-medium text-[#CBD2DF] mb-1">
                Ratio
              </label>
              <select
                id="pl-ratio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-2.5 py-2 text-xs text-[#F3F5F8]"
              >
                {RATIOS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pl-model" className="block text-xs font-medium text-[#CBD2DF] mb-1">
                Model
              </label>
              <select
                id="pl-model"
                value={modelId}
                onChange={(e) => setModelId(e.target.value as ModelId)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-2.5 py-2 text-xs text-[#F3F5F8]"
              >
                {VIDEO_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-white/[0.1] text-sm text-[#E6E9F0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-sm font-semibold"
            >
              {editing ? 'Update Prompt' : 'Save Prompt'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(promptToDelete)}
        onClose={() => setPromptToDelete(null)}
        onConfirm={() => {
          if (promptToDelete) deletePrompt(promptToDelete.id);
        }}
        title="Delete Prompt"
        message={`Delete "${promptToDelete?.title}" from your Prompt Library?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
