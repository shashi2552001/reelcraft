import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Film,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useStudioData } from '../../hooks/useStudioData';
import type { Episode, Scene, Story } from '../../types/studio';
import { buildNextScenePrompt } from '../../utils/promptComposer';
import { validateRequiredText } from '../../utils/validation';

interface EpisodeScenePanelProps {
  story: Story;
}

export const EpisodeScenePanel: React.FC<EpisodeScenePanelProps> = ({ story }) => {
  const {
    characters,
    addEpisode,
    updateEpisode,
    deleteEpisode,
    upsertScene,
    deleteScene,
    loadPromptIntoComposer,
  } = useStudioData();

  const sortedEpisodes = useMemo(
    () => [...story.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber),
    [story.episodes]
  );

  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>(
    sortedEpisodes[0]?.id ?? ''
  );

  const activeEpisode =
    sortedEpisodes.find((e) => e.id === selectedEpisodeId) ?? sortedEpisodes[0];

  // Episode Modal State
  const [episodeModalOpen, setEpisodeModalOpen] = useState(false);
  const [epTitle, setEpTitle] = useState('');
  const [epDesc, setEpDesc] = useState('');
  const [epContinuity, setEpContinuity] = useState('');
  const [epPrevContext, setEpPrevContext] = useState('');
  const [epError, setEpError] = useState('');

  // Scene Modal State
  const [sceneModalOpen, setSceneModalOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [scTitle, setScTitle] = useState('');
  const [scAction, setScAction] = useState('');
  const [scCamera, setScCamera] = useState('');
  const [scCharIds, setScCharIds] = useState<string[]>([]);
  const [scCompiled, setScCompiled] = useState('');
  const [scNegative, setScNegative] = useState(
    'blurry face, deformed anatomy, flickering outfit, watermark'
  );
  const [scDuration, setScDuration] = useState(5);
  const [scError, setScError] = useState('');

  const [copiedSceneId, setCopiedSceneId] = useState<string | null>(null);
  const [episodeToDelete, setEpisodeToDelete] = useState<Episode | null>(null);
  const [sceneToDelete, setSceneToDelete] = useState<Scene | null>(null);

  const storyCharacters = useMemo(
    () => characters.filter((c) => story.characterIds.includes(c.id)),
    [characters, story.characterIds]
  );

  const openNewEpisodeModal = () => {
    const lastEp = sortedEpisodes[sortedEpisodes.length - 1];
    setEpTitle('');
    setEpDesc('');
    setEpContinuity('');
    setEpPrevContext(
      lastEp ? lastEp.continuitySummary || lastEp.description : ''
    );
    setEpError('');
    setEpisodeModalOpen(true);
  };

  const handleCreateEpisode = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateRequiredText(epTitle, 'Episode title', 2, 180);
    if (!check.valid) {
      setEpError(check.error ?? 'Invalid episode title.');
      return;
    }
    const created = addEpisode(story.id, {
      title: epTitle.trim(),
      description: epDesc.trim(),
      continuitySummary: epContinuity.trim(),
      previousEpisodeContext: epPrevContext.trim(),
    });
    if (created) {
      setSelectedEpisodeId(created.id);
    }
    setEpisodeModalOpen(false);
  };

  const openNewSceneModal = () => {
    if (!activeEpisode) return;
    setEditingScene(null);
    setScTitle('');
    setScAction('');
    setScCamera('');
    setScCharIds(story.characterIds);
    setScCompiled('');
    setScNegative('blurry face, deformed anatomy, flickering outfit, watermark');
    setScDuration(5);
    setScError('');
    setSceneModalOpen(true);
  };

  const openEditSceneModal = (scene: Scene) => {
    setEditingScene(scene);
    setScTitle(scene.title);
    setScAction(scene.actionDescription);
    setScCamera(scene.cameraAndMood);
    setScCharIds(scene.characterIds);
    setScCompiled(scene.compiledPrompt);
    setScNegative(scene.negativePrompt);
    setScDuration(scene.durationSeconds);
    setScError('');
    setSceneModalOpen(true);
  };

  const handleComposeScenePrompt = () => {
    if (!activeEpisode) return;
    const nextNum =
      editingScene?.sceneNumber ??
      (activeEpisode.scenes.length > 0
        ? Math.max(...activeEpisode.scenes.map((s) => s.sceneNumber)) + 1
        : 1);

    const attachedChars = characters.filter((c) => scCharIds.includes(c.id));
    const composed = buildNextScenePrompt({
      story,
      episode: activeEpisode,
      sceneNumber: nextNum,
      sceneTitle: scTitle.trim(),
      actionDescription: scAction.trim(),
      cameraAndMood: scCamera.trim(),
      characters: attachedChars,
    });
    setScCompiled(composed);
  };

  const handleSaveScene = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEpisode) return;
    const actionCheck = validateRequiredText(scAction, 'Scene action description', 4, 4000);
    if (!actionCheck.valid) {
      setScError(actionCheck.error ?? 'Enter a scene action description.');
      return;
    }

    const attachedChars = characters.filter((c) => scCharIds.includes(c.id));
    const nextNum =
      editingScene?.sceneNumber ??
      (activeEpisode.scenes.length > 0
        ? Math.max(...activeEpisode.scenes.map((s) => s.sceneNumber)) + 1
        : 1);

    const finalCompiled =
      scCompiled.trim() ||
      buildNextScenePrompt({
        story,
        episode: activeEpisode,
        sceneNumber: nextNum,
        sceneTitle: scTitle.trim(),
        actionDescription: scAction.trim(),
        cameraAndMood: scCamera.trim(),
        characters: attachedChars,
      });

    upsertScene(story.id, activeEpisode.id, {
      id: editingScene?.id,
      title: scTitle.trim() || `Scene ${nextNum}`,
      actionDescription: scAction.trim(),
      cameraAndMood: scCamera.trim(),
      characterIds: scCharIds,
      compiledPrompt: finalCompiled,
      negativePrompt: scNegative.trim(),
      durationSeconds: scDuration,
      aspectRatio: story.defaultAspectRatio,
      visualStyle: story.visualStyle,
    });
    setSceneModalOpen(false);
  };

  const handleCopyScenePrompt = async (scene: Scene) => {
    try {
      await navigator.clipboard.writeText(scene.compiledPrompt);
      setCopiedSceneId(scene.id);
      window.setTimeout(() => setCopiedSceneId(null), 1600);
    } catch {
      // Ignore clipboard failure silently
    }
  };

  return (
    <div className="space-y-5">
      {/* Episodes Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {sortedEpisodes.map((ep) => {
            const active = activeEpisode?.id === ep.id;
            return (
              <button
                key={ep.id}
                type="button"
                onClick={() => setSelectedEpisodeId(ep.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[#E59A1A] bg-[#E59A1A]/15 text-[#F8FAFC]'
                    : 'border-white/[0.08] bg-[#0B0D12] text-[#9CA3B2] hover:text-white'
                }`}
              >
                <span className="font-mono">Ep {ep.episodeNumber}</span> · {ep.title}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={openNewEpisodeModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Episode</span>
        </button>
      </div>

      {/* Active Episode Details & Scenes */}
      {!activeEpisode ? (
        <div className="rounded-xl border border-dashed border-white/[0.12] bg-[#0F1219] p-8 text-center">
          <p className="text-sm text-[#CBD2DF] mb-2">No episodes added to "{story.title}" yet.</p>
          <p className="text-xs text-[#8E96A4] mb-4">
            Start Episode 1 to break your narrative into character-consistent video scenes.
          </p>
          <button
            type="button"
            onClick={openNewEpisodeModal}
            className="px-4 py-2 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-xs font-semibold"
          >
            Create Episode 1
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#0F1219] p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-semibold text-[#F3F5F8]">
                  Episode {activeEpisode.episodeNumber}: {activeEpisode.title}
                </h3>
                {activeEpisode.description && (
                  <p className="text-xs text-[#9CA3B2] mt-1 leading-relaxed">
                    {activeEpisode.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEpisodeToDelete(activeEpisode)}
                aria-label="Delete episode"
                className="p-1.5 rounded-md text-[#7B8494] hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
              <div>
                <label className="block text-[11px] font-medium text-[#8E96A4] mb-1">
                  Previous Episode Context (Carried Forward)
                </label>
                <textarea
                  rows={2}
                  value={activeEpisode.previousEpisodeContext}
                  onChange={(e) =>
                    updateEpisode(story.id, activeEpisode.id, {
                      previousEpisodeContext: e.target.value,
                    })
                  }
                  placeholder="Key events from previous episode carried into this episode..."
                  className="w-full rounded-lg border border-white/[0.08] bg-[#0B0D12] px-2.5 py-1.5 text-xs text-[#E6E9F0] placeholder-[#5A6375] focus:outline-none focus:border-[#E59A1A]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#8E96A4] mb-1">
                  Episode Continuity Summary (For Next Episode)
                </label>
                <textarea
                  rows={2}
                  value={activeEpisode.continuitySummary}
                  onChange={(e) =>
                    updateEpisode(story.id, activeEpisode.id, {
                      continuitySummary: e.target.value,
                    })
                  }
                  placeholder="Summarize where characters and plot end in this episode..."
                  className="w-full rounded-lg border border-white/[0.08] bg-[#0B0D12] px-2.5 py-1.5 text-xs text-[#E6E9F0] placeholder-[#5A6375] focus:outline-none focus:border-[#E59A1A]"
                />
              </div>
            </div>
          </div>

          {/* Scenes Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-[#F3F5F8]">
              Scenes ({activeEpisode.scenes.length})
            </h4>
            <button
              type="button"
              onClick={openNewSceneModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-[#F3F5F8]"
            >
              <Plus className="h-3.5 w-3.5 text-[#E59A1A]" />
              <span>Add Scene & Generate Prompt</span>
            </button>
          </div>

          {activeEpisode.scenes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.1] bg-[#0B0D12] p-6 text-center text-xs text-[#8E96A4]">
              No scenes yet in Episode {activeEpisode.episodeNumber}. Click "Add Scene & Generate Prompt" to create your first shot.
            </div>
          ) : (
            <div className="space-y-3">
              {[...activeEpisode.scenes]
                .sort((a, b) => a.sceneNumber - b.sceneNumber)
                .map((scene) => {
                  const sceneChars = characters.filter((c) =>
                    scene.characterIds.includes(c.id)
                  );
                  return (
                    <div
                      key={scene.id}
                      className="rounded-xl border border-white/[0.08] bg-[#0F1219] p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[#F3F5F8]">
                            Scene {scene.sceneNumber}: {scene.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#7B8494] mt-0.5">
                            <span>{scene.visualStyle}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{scene.aspectRatio}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{scene.durationSeconds}s</span>
                            {sceneChars.length > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#CBD2DF]">
                                  Cast: {sceneChars.map((c) => c.name).join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditSceneModal(scene)}
                            className="px-2.5 py-1.5 rounded-md border border-white/[0.1] text-xs text-[#CBD2DF] hover:text-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCopyScenePrompt(scene)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-white/[0.1] text-xs text-[#CBD2DF] hover:text-white"
                          >
                            {copiedSceneId === scene.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span>{copiedSceneId === scene.id ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              loadPromptIntoComposer({
                                title: `${story.title} — Ep ${activeEpisode.episodeNumber} Sc ${scene.sceneNumber}`,
                                prompt: scene.actionDescription,
                                storyPrompt: `Episode ${activeEpisode.episodeNumber}: ${activeEpisode.title}. ${
                                  activeEpisode.previousEpisodeContext || activeEpisode.description
                                }`,
                                negativePrompt: scene.negativePrompt,
                                visualStyle: story.visualStyle,
                                aspectRatio: story.defaultAspectRatio,
                                durationSeconds: 30,
                                storyId: story.id,
                                episodeId: activeEpisode.id,
                                sceneId: scene.id,
                                characterIds: scene.characterIds,
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-xs font-semibold"
                          >
                            <Film className="h-3.5 w-3.5" />
                            <span>Create Video</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSceneToDelete(scene)}
                            aria-label={`Delete scene ${scene.sceneNumber}`}
                            className="p-1.5 rounded-md text-[#7B8494] hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[#CBD2DF] leading-relaxed">
                        {scene.actionDescription}
                      </p>

                      {scene.compiledPrompt && (
                        <div className="rounded-lg border border-white/[0.06] bg-[#0B0D12] p-3 text-xs font-mono text-[#9CA3B2] whitespace-pre-wrap leading-relaxed">
                          {scene.compiledPrompt}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* New Episode Modal */}
      <Modal
        open={episodeModalOpen}
        onClose={() => setEpisodeModalOpen(false)}
        title={`Add Episode to ${story.title}`}
        subtitle="Previous episode continuity is pre-filled automatically."
      >
        <form onSubmit={handleCreateEpisode} className="space-y-4">
          {epError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {epError}
            </div>
          )}
          <div>
            <label htmlFor="ep-title" className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
              Episode Title
            </label>
            <input
              id="ep-title"
              type="text"
              value={epTitle}
              onChange={(e) => setEpTitle(e.target.value)}
              placeholder="e.g., North Relay Tower"
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>
          <div>
            <label htmlFor="ep-desc" className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
              Episode Description
            </label>
            <textarea
              id="ep-desc"
              rows={3}
              value={epDesc}
              onChange={(e) => setEpDesc(e.target.value)}
              placeholder="What happens in this episode..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>
          <div>
            <label htmlFor="ep-prev" className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
              Previous Episode Context
            </label>
            <textarea
              id="ep-prev"
              rows={2}
              value={epPrevContext}
              onChange={(e) => setEpPrevContext(e.target.value)}
              placeholder="Carried over from previous episode..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>
          <div>
            <label htmlFor="ep-cont" className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
              Continuity Summary (How this episode ends)
            </label>
            <textarea
              id="ep-cont"
              rows={2}
              value={epContinuity}
              onChange={(e) => setEpContinuity(e.target.value)}
              placeholder="Ending state carried into the next episode..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEpisodeModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-white/[0.1] text-sm text-[#E6E9F0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-sm font-semibold"
            >
              Add Episode
            </button>
          </div>
        </form>
      </Modal>

      {/* Scene & Next-Scene Prompt Composer Modal */}
      <Modal
        open={sceneModalOpen}
        onClose={() => setSceneModalOpen(false)}
        title={editingScene ? `Edit Scene ${editingScene.sceneNumber}` : 'Add Scene & Compose Prompt'}
        subtitle="Locked character appearances and previous episode context are automatically injected."
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleSaveScene} className="space-y-4">
          {scError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {scError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="sc-title" className="block text-xs font-medium text-[#CBD2DF] mb-1">
                Scene Title
              </label>
              <input
                id="sc-title"
                type="text"
                value={scTitle}
                onChange={(e) => setScTitle(e.target.value)}
                placeholder="e.g., Rooftop Relay Arrival"
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
              />
            </div>
            <div>
              <label htmlFor="sc-dur" className="block text-xs font-medium text-[#CBD2DF] mb-1">
                Duration (sec)
              </label>
              <select
                id="sc-dur"
                value={scDuration}
                onChange={(e) => setScDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
              >
                {[3, 4, 5, 6, 8, 10].map((d) => (
                  <option key={d} value={d}>
                    {d}s
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="sc-action" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Scene Action Description
            </label>
            <textarea
              id="sc-action"
              rows={3}
              value={scAction}
              onChange={(e) => setScAction(e.target.value)}
              placeholder="Describe character movement, action, and environment..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>

          <div>
            <label htmlFor="sc-cam" className="block text-xs font-medium text-[#CBD2DF] mb-1">
              Camera & Mood Notes
            </label>
            <input
              id="sc-cam"
              type="text"
              value={scCamera}
              onChange={(e) => setScCamera(e.target.value)}
              placeholder="e.g., Slow tracking shot, cool mist with warm rim lighting"
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-[#F3F5F8] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-[#CBD2DF] mb-1.5">
              Attach Characters (Consistent Appearance Lock)
            </span>
            <div className="flex flex-wrap gap-2">
              {(storyCharacters.length > 0 ? storyCharacters : characters).map((c) => {
                const active = scCharIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setScCharIds((prev) =>
                        prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#E59A1A] bg-[#E59A1A]/15 text-[#F8FAFC]'
                        : 'border-white/[0.08] bg-[#0B0D12] text-[#9CA3B2]'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="sc-compiled" className="text-xs font-medium text-[#CBD2DF]">
                Compiled Next-Scene Prompt
              </label>
              <button
                type="button"
                onClick={handleComposeScenePrompt}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E59A1A] hover:text-[#FBBF24]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Compose Prompt from Story + Characters</span>
              </button>
            </div>
            <textarea
              id="sc-compiled"
              rows={5}
              value={scCompiled}
              onChange={(e) => setScCompiled(e.target.value)}
              placeholder="Click 'Compose Prompt from Story + Characters' or write custom prompt..."
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-xs font-mono text-[#E6E9F0] focus:outline-none focus:border-[#E59A1A]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSceneModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-white/[0.1] text-sm text-[#E6E9F0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-sm font-semibold"
            >
              {editingScene ? 'Save Scene' : 'Add Scene'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(episodeToDelete)}
        onClose={() => setEpisodeToDelete(null)}
        onConfirm={() => {
          if (episodeToDelete) {
            deleteEpisode(story.id, episodeToDelete.id);
          }
        }}
        title="Delete Episode"
        message={`Delete Episode ${episodeToDelete?.episodeNumber}: "${episodeToDelete?.title}" and all its scenes?`}
        confirmLabel="Delete Episode"
      />

      <ConfirmDialog
        open={Boolean(sceneToDelete)}
        onClose={() => setSceneToDelete(null)}
        onConfirm={() => {
          if (sceneToDelete && activeEpisode) {
            deleteScene(story.id, activeEpisode.id, sceneToDelete.id);
          }
        }}
        title="Delete Scene"
        message={`Delete Scene ${sceneToDelete?.sceneNumber}: "${sceneToDelete?.title}"?`}
        confirmLabel="Delete Scene"
      />
    </div>
  );
};
