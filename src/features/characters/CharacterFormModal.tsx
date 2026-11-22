import React, { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { ReferenceImage } from '../../components/ui/ReferenceImage';
import { useStudioData } from '../../hooks/useStudioData';
import { assetStorageService } from '../../services/api/storageInterface';
import type { Character, VisualStyle } from '../../types/studio';
import { validateRequiredText } from '../../utils/validation';

interface CharacterFormModalProps {
  open: boolean;
  onClose: () => void;
  editingCharacter?: Character | null;
}

const STYLES: VisualStyle[] = [
  '3D Indian Anime',
  'Cartoon',
  'Realistic',
  'Cinematic',
  'Custom Style',
];

export const CharacterFormModal: React.FC<CharacterFormModalProps> = ({
  open,
  onClose,
  editingCharacter,
}) => {
  const { stories, settings, upsertCharacter } = useStudioData();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [faceAndAppearance, setFaceAndAppearance] = useState('');
  const [hairstyle, setHairstyle] = useState('');
  const [clothing, setClothing] = useState('');
  const [ageAppearance, setAgeAppearance] = useState('');
  const [bodyDescription, setBodyDescription] = useState('');
  const [personality, setPersonality] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [referenceImageName, setReferenceImageName] = useState('');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(settings.defaultStyle);
  const [associatedStoryIds, setAssociatedStoryIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingCharacter) {
      setName(editingCharacter.name);
      setDescription(editingCharacter.description);
      setFaceAndAppearance(editingCharacter.faceAndAppearance);
      setHairstyle(editingCharacter.hairstyle);
      setClothing(editingCharacter.clothing);
      setAgeAppearance(editingCharacter.ageAppearance);
      setBodyDescription(editingCharacter.bodyDescription ?? '');
      setPersonality(editingCharacter.personality ?? '');
      setReferenceImageUrl(editingCharacter.referenceImageUrl);
      setReferenceImageName(editingCharacter.referenceImageName ?? '');
      setVisualStyle(editingCharacter.visualStyle);
      setAssociatedStoryIds(editingCharacter.associatedStoryIds);
    } else {
      setName('');
      setDescription('');
      setFaceAndAppearance('');
      setHairstyle('');
      setClothing('');
      setAgeAppearance('');
      setBodyDescription('');
      setPersonality('');
      setReferenceImageUrl('');
      setReferenceImageName('');
      setVisualStyle(settings.defaultStyle);
      setAssociatedStoryIds([]);
    }
    setError('');
  }, [editingCharacter, open, settings.defaultStyle]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const prepared = await assetStorageService.prepareCharacterImagePreview(file);
      setReferenceImageUrl(prepared.dataUrl);
      setReferenceImageName(prepared.fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reference image.');
    }
  };

  const toggleStory = (storyId: string) => {
    setAssociatedStoryIds((prev) =>
      prev.includes(storyId) ? prev.filter((id) => id !== storyId) : [...prev, storyId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const checks = [
      validateRequiredText(name, 'Character name', 2, 120),
      validateRequiredText(faceAndAppearance, 'Face description', 3, 1000),
      validateRequiredText(hairstyle, 'Hairstyle', 2, 500),
      validateRequiredText(clothing, 'Clothing', 2, 1000),
      validateRequiredText(ageAppearance, 'Age appearance', 2, 80),
      validateRequiredText(bodyDescription, 'Body description', 2, 500),
      validateRequiredText(personality, 'Personality', 2, 500),
    ];
    const failed = checks.find((c) => !c.valid);
    if (failed) {
      setError(failed.error ?? 'Complete all required character consistency fields.');
      return;
    }

    upsertCharacter({
      id: editingCharacter?.id,
      name: name.trim(),
      description: description.trim(),
      faceAndAppearance: faceAndAppearance.trim(),
      hairstyle: hairstyle.trim(),
      clothing: clothing.trim(),
      ageAppearance: ageAppearance.trim(),
      bodyDescription: bodyDescription.trim(),
      personality: personality.trim(),
      referenceImageUrl: referenceImageUrl.trim(),
      referenceImageName: referenceImageName.trim() || undefined,
      visualStyle,
      associatedStoryIds,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingCharacter ? `Edit ${editingCharacter.name}` : 'Register Character Profile'}
      subtitle="Saved details and reference image are passed to I2V-capable models to maintain identity across scenes."
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-28 h-28 rounded-xl overflow-hidden border border-white/[0.1] bg-[#0B0D12] shrink-0">
            <ReferenceImage
              src={referenceImageUrl}
              alt={name || 'Character preview'}
              name={name || 'Portrait'}
            />
          </div>

          <div className="flex-1 w-full space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-[#E6E9F0] cursor-pointer transition-colors">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Reference Image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                  className="sr-only"
                />
              </label>
              {referenceImageName && (
                <span className="text-xs text-[#8E96A4] truncate max-w-[200px]">
                  {referenceImageName}
                </span>
              )}
            </div>
            <div>
              <label htmlFor="char-ref-url" className="block text-[11px] text-[#8E96A4] mb-1">
                Or Reference Image URL
              </label>
              <input
                id="char-ref-url"
                type="text"
                value={referenceImageUrl}
                onChange={(e) => setReferenceImageUrl(e.target.value)}
                placeholder="https://... or /src/assets/..."
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-1.5 text-xs text-[#F3F5F8] placeholder-[#5A6375] focus:outline-none focus:border-[#E59A1A]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="char-name" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Character Name
            </label>
            <input
              id="char-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Kaito Mori"
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>

          <div>
            <label htmlFor="char-age" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Age Appearance
            </label>
            <input
              id="char-age"
              type="text"
              value={ageAppearance}
              onChange={(e) => setAgeAppearance(e.target.value)}
              placeholder="e.g., Early twenties (21)"
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>

          <div>
            <label htmlFor="char-style" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Visual Style
            </label>
            <select
              id="char-style"
              value={visualStyle}
              onChange={(e) => setVisualStyle(e.target.value as VisualStyle)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="char-desc" className="block text-xs font-medium text-[#CBD2DF] mb-1">
            Character Description
          </label>
          <textarea
            id="char-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Role, demeanor, posture, and recurring visual traits..."
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="char-face" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Face Description
            </label>
            <textarea
              id="char-face"
              rows={2}
              value={faceAndAppearance}
              onChange={(e) => setFaceAndAppearance(e.target.value)}
              placeholder="Eye color, jawline, skin tone, marks..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>

          <div>
            <label htmlFor="char-hair" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Hairstyle
            </label>
            <textarea
              id="char-hair"
              rows={2}
              value={hairstyle}
              onChange={(e) => setHairstyle(e.target.value)}
              placeholder="Exact cut, color, part, length..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="char-body" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Body Description
            </label>
            <textarea
              id="char-body"
              rows={2}
              value={bodyDescription}
              onChange={(e) => setBodyDescription(e.target.value)}
              placeholder="Height, build, posture..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>

          <div>
            <label htmlFor="char-pers" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Personality
            </label>
            <textarea
              id="char-pers"
              rows={2}
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="Calm, observant, energetic..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="char-cloth" className="block text-xs font-medium text-[#CBD2DF] mb-1">
            Clothing & Accessories
          </label>
          <textarea
            id="char-cloth"
            rows={2}
            value={clothing}
            onChange={(e) => setClothing(e.target.value)}
            placeholder="Exact jacket, coat, color palette, boots, satchel..."
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
          />
        </div>

        <div>
          <span className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
            Associated Stories
          </span>
          {stories.length === 0 ? (
            <p className="text-xs text-[#7B8494]">No stories created yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stories.map((st) => {
                const active = associatedStoryIds.includes(st.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => toggleStory(st.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#E59A1A] bg-[#E59A1A]/15 text-[#F8FAFC]'
                        : 'border-white/[0.08] bg-[#0B0D12] text-[#9CA3B2]'
                    }`}
                  >
                    {st.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/[0.1] text-sm text-[#E6E9F0]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-sm font-semibold"
          >
            {editingCharacter ? 'Save Character' : 'Register Character'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
