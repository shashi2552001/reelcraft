import React, { useEffect, useState } from 'react';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { EpisodeScenePanel } from '../features/stories/EpisodeScenePanel';
import { StoryEditorModal } from '../features/stories/StoryEditorModal';
import { useStudioData } from '../hooks/useStudioData';
import type { Story } from '../types/studio';
import { formatShortDate } from '../utils/id';

export const StoriesPage: React.FC = () => {
  const { stories, characters, focusedStoryId, setFocusedStoryId, deleteStory } =
    useStudioData();
  const [selectedStoryId, setSelectedStoryId] = useState<string>(
    focusedStoryId || stories[0]?.id || ''
  );
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);

  useEffect(() => {
    if (focusedStoryId && stories.some((s) => s.id === focusedStoryId)) {
      setSelectedStoryId(focusedStoryId);
    }
  }, [focusedStoryId, stories]);

  const activeStory = stories.find((s) => s.id === selectedStoryId) ?? stories[0];

  const handleCreateStory = () => {
    setEditingStory(null);
    setStoryModalOpen(true);
  };

  const handleEditStory = (story: Story) => {
    setEditingStory(story);
    setStoryModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F8FAFC]">My Stories</h1>
          <p className="text-sm text-[#9CA3B2] mt-1">
            Build continuing multi-episode stories, preserve prior episode context, and generate the next episode using saved lore and cast.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateStory}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.25]" />
          <span>New Story</span>
        </button>
      </div>

      {stories.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="No stories created yet"
          description="Create your first continuing story to organize episodes, scenes, and recurring characters."
          actionLabel="Create First Story"
          onAction={handleCreateStory}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Story List Column */}
          <div className="lg:col-span-4 space-y-2.5">
            {stories.map((story) => {
              const active = activeStory?.id === story.id;
              return (
                <div
                  key={story.id}
                  className={`rounded-xl border transition-colors ${
                    active
                      ? 'border-[#E59A1A]/70 bg-[#161A26]'
                      : 'border-white/[0.08] bg-[#12151E] hover:bg-[#161A24]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStoryId(story.id);
                      setFocusedStoryId(story.id);
                    }}
                    className="w-full text-left p-4 space-y-1.5"
                  >
                    <div className="font-display text-sm font-semibold text-[#F3F5F8] line-clamp-1">
                      {story.title}
                    </div>
                    <p className="text-xs text-[#9CA3B2] line-clamp-2 leading-relaxed">
                      {story.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#7B8494] pt-1">
                      <span>{story.visualStyle}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{story.defaultAspectRatio}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{story.episodes.length} episodes</span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Selected Story Workspace */}
          {activeStory && (
            <div className="lg:col-span-8 rounded-xl border border-white/[0.08] bg-[#12151E] p-5 sm:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-white/[0.07]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#8E96A4]">
                    <span>{activeStory.visualStyle}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {activeStory.defaultAspectRatio}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      Updated {formatShortDate(activeStory.updatedAt)}
                    </span>
                  </div>
                  <h2 className="font-display text-xl font-semibold text-[#F8FAFC]">
                    {activeStory.title}
                  </h2>
                  <p className="text-sm text-[#B8C0CE] leading-relaxed">
                    {activeStory.description}
                  </p>
                  {activeStory.characterIds.length > 0 && (
                    <div className="text-xs text-[#9CA3B2] pt-1">
                      Locked Cast:{' '}
                      <span className="text-[#F3F5F8]">
                        {characters
                          .filter((c) => activeStory.characterIds.includes(c.id))
                          .map((c) => c.name)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditStory(activeStory)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.07] text-xs font-medium text-[#E6E9F0]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit Story</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoryToDelete(activeStory)}
                    aria-label={`Delete ${activeStory.title}`}
                    className="p-2 rounded-lg border border-white/[0.1] text-[#8E96A4] hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <EpisodeScenePanel key={activeStory.id} story={activeStory} />
            </div>
          )}
        </div>
      )}

      <StoryEditorModal
        open={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        editingStory={editingStory}
        onSaved={(saved) => {
          setSelectedStoryId(saved.id);
          setFocusedStoryId(saved.id);
        }}
      />

      <ConfirmDialog
        open={Boolean(storyToDelete)}
        onClose={() => setStoryToDelete(null)}
        onConfirm={() => {
          if (storyToDelete) {
            deleteStory(storyToDelete.id);
          }
        }}
        title="Delete Story"
        message={`Delete "${storyToDelete?.title}" along with all its episodes and scenes?`}
        confirmLabel="Delete Story"
      />
    </div>
  );
};
