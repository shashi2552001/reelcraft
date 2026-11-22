import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useStudioData } from '../../hooks/useStudioData';
import type { AspectRatio, Story, VisualStyle } from '../../types/studio';
import { validateRequiredText } from '../../utils/validation';

interface StoryEditorModalProps {
  open: boolean;
  onClose: () => void;
  editingStory?: Story | null;
  onSaved?: (story: Story) => void;
}

const STYLES: VisualStyle[] = [
  '3D Indian Anime',
  'Cartoon',
  'Realistic',
  'Cinematic',
  'Custom Style',
];
const RATIOS: AspectRatio[] = ['9:16', '16:9', '1:1'];

export const StoryEditorModal: React.FC<StoryEditorModalProps> = ({
  open,
  onClose,
  editingStory,
  onSaved,
}) => {
  const { projects, characters, settings, upsertStory } = useStudioData();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(settings.defaultStyle);
  const [defaultAspectRatio, setDefaultAspectRatio] = useState<AspectRatio>(
    settings.defaultAspectRatio
  );
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingStory) {
      setTitle(editingStory.title);
      setDescription(editingStory.description);
      setProjectId(editingStory.projectId ?? '');
      setVisualStyle(editingStory.visualStyle);
      setDefaultAspectRatio(editingStory.defaultAspectRatio);
      setCharacterIds(editingStory.characterIds);
    } else {
      setTitle('');
      setDescription('');
      setProjectId(projects[0]?.id ?? '');
      setVisualStyle(settings.defaultStyle);
      setDefaultAspectRatio(settings.defaultAspectRatio);
      setCharacterIds([]);
    }
    setError('');
  }, [editingStory, open, projects, settings.defaultAspectRatio, settings.defaultStyle]);

  const toggleCharacter = (id: string) => {
    setCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const titleCheck = validateRequiredText(title, 'Story title', 2, 180);
    if (!titleCheck.valid) {
      setError(titleCheck.error ?? 'Invalid story title.');
      return;
    }
    const descCheck = validateRequiredText(description, 'Story description', 5, 4000);
    if (!descCheck.valid) {
      setError(descCheck.error ?? 'Provide a story description.');
      return;
    }

    const saved = upsertStory({
      id: editingStory?.id,
      projectId: projectId || undefined,
      title: title.trim(),
      description: description.trim(),
      visualStyle,
      defaultAspectRatio,
      characterIds,
    });
    onSaved?.(saved);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingStory ? 'Edit Story' : 'Create Continuing Story'}
      subtitle="Story world details and locked cast carry across every episode and scene."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="story-title" className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
            Story Title
          </label>
          <input
            id="story-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Midnight Courier"
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] placeholder-[#5A6375] focus:outline-none focus:border-[#E59A1A]"
          />
        </div>

        <div>
          <label htmlFor="story-desc" className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
            Story Description & World Lore
          </label>
          <textarea
            id="story-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Setting, core conflict, visual tone, and continuity rules..."
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] placeholder-[#5A6375] focus:outline-none focus:border-[#E59A1A]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="story-proj" className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
              Project
            </label>
            <select
              id="story-proj"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            >
              <option value="">Unassigned</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="story-style" className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
              Visual Style
            </label>
            <select
              id="story-style"
              value={visualStyle}
              onChange={(e) => setVisualStyle(e.target.value as VisualStyle)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="story-ratio" className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
              Default Ratio
            </label>
            <select
              id="story-ratio"
              value={defaultAspectRatio}
              onChange={(e) => setDefaultAspectRatio(e.target.value as AspectRatio)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            >
              {RATIOS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-[#CBD2DF] mb-2">
            Recurring Cast (Locked Characters)
          </span>
          {characters.length === 0 ? (
            <p className="text-xs text-[#7B8494]">
              No characters registered yet. Add characters in the Characters tab to attach them here.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {characters.map((c) => {
                const selected = characterIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCharacter(c.id)}
                    className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors ${
                      selected
                        ? 'border-[#E59A1A] bg-[#E59A1A]/12 text-[#F8FAFC]'
                        : 'border-white/[0.08] bg-[#0B0D12] text-[#9CA3B2]'
                    }`}
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-[11px] text-[#7B8494] truncate">{c.visualStyle}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.07] text-sm font-medium text-[#E6E9F0]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-sm font-semibold"
          >
            {editingStory ? 'Save Story' : 'Create Story'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
