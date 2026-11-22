import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useStudioData } from '../../hooks/useStudioData';
import type { AspectRatio, Project, VisualStyle } from '../../types/studio';
import { validateRequiredText } from '../../utils/validation';

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  editingProject?: Project | null;
}

const STYLES: VisualStyle[] = [
  '3D Indian Anime',
  'Cartoon',
  'Realistic',
  'Cinematic',
  'Custom Style',
];
const RATIOS: AspectRatio[] = ['9:16', '16:9', '1:1'];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  open,
  onClose,
  editingProject,
}) => {
  const { upsertProject, settings } = useStudioData();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetStyle, setTargetStyle] = useState<VisualStyle>(settings.defaultStyle);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(settings.defaultAspectRatio);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingProject) {
      setTitle(editingProject.title);
      setDescription(editingProject.description);
      setTargetStyle(editingProject.targetStyle);
      setAspectRatio(editingProject.aspectRatio);
    } else {
      setTitle('');
      setDescription('');
      setTargetStyle(settings.defaultStyle);
      setAspectRatio(settings.defaultAspectRatio);
    }
    setError('');
  }, [editingProject, open, settings.defaultAspectRatio, settings.defaultStyle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const titleCheck = validateRequiredText(title, 'Project title', 2, 160);
    if (!titleCheck.valid) {
      setError(titleCheck.error ?? 'Invalid title.');
      return;
    }

    upsertProject({
      id: editingProject?.id,
      title: title.trim(),
      description: description.trim(),
      targetStyle,
      aspectRatio,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingProject ? 'Edit Project' : 'New Production Project'}
      subtitle="Stored locally in browser drafts until connected to PostgreSQL."
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="project-title" className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
            Project Title
          </label>
          <input
            id="project-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Midnight Courier — Season 1"
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] placeholder-[#5A6375] focus:outline-none focus:border-[#E59A1A]"
          />
        </div>

        <div>
          <label htmlFor="project-desc" className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
            Description
          </label>
          <textarea
            id="project-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief production scope, tone, or distribution target..."
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] placeholder-[#5A6375] focus:outline-none focus:border-[#E59A1A]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="block text-xs font-medium text-[#CBD2DF] mb-1.5">Target Style</span>
            <select
              value={targetStyle}
              onChange={(e) => setTargetStyle(e.target.value as VisualStyle)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="block text-xs font-medium text-[#CBD2DF] mb-1.5">Aspect Ratio</span>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            >
              {RATIOS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.07] text-sm font-medium text-[#E6E9F0] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-sm font-semibold transition-colors"
          >
            {editingProject ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
