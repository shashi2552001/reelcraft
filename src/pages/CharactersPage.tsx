import React, { useMemo, useState } from 'react';
import { Film, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ReferenceImage } from '../components/ui/ReferenceImage';
import { CharacterFormModal } from '../features/characters/CharacterFormModal';
import { useStudioData } from '../hooks/useStudioData';
import type { Character, VisualStyle } from '../types/studio';
import { buildCharacterConsistencyBlock } from '../utils/promptComposer';

const STYLE_FILTERS: Array<'All' | VisualStyle> = [
  'All',
  '3D Indian Anime',
  'Cartoon',
  'Realistic',
  'Cinematic',
  'Custom Style',
];

export const CharactersPage: React.FC = () => {
  const { characters, stories, deleteCharacter, loadPromptIntoComposer } =
    useStudioData();

  const [styleFilter, setStyleFilter] = useState<'All' | VisualStyle>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);

  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      if (styleFilter !== 'All' && c.visualStyle !== styleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return `${c.name} ${c.description} ${c.clothing} ${c.faceAndAppearance} ${c.personality ?? ''}`
          .toLowerCase()
          .includes(q);
      }
      return true;
    });
  }, [characters, searchQuery, styleFilter]);

  const handleOpenNew = () => {
    setEditingCharacter(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (char: Character) => {
    setEditingCharacter(char);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F8FAFC]">
            Character Consistency System
          </h1>
          <p className="text-sm text-[#9CA3B2] mt-1">
            Save face, hair, body, personality, clothing, and reference images. Reference-image conditioning is passed automatically when supported by the selected model.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.25]" />
          <span>New Character</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#12151E] border border-white/[0.08] overflow-x-auto">
          {STYLE_FILTERS.map((style) => {
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
            placeholder="Search characters or outfits..."
            className="w-full rounded-lg border border-white/[0.1] bg-[#12151E] pl-9 pr-3 py-2 text-xs text-[#F3F5F8] placeholder-[#6F7888] focus:outline-none focus:border-[#E59A1A]"
          />
        </div>
      </div>

      {filteredCharacters.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title={
            characters.length === 0
              ? 'No characters registered yet'
              : 'No characters match your filter'
          }
          description="Register character facial features, hairstyle, body, personality, clothing, and a reference image so scenes preserve identity."
          actionLabel={characters.length === 0 ? 'Register First Character' : 'Reset Filters'}
          onAction={() => {
            if (characters.length === 0) {
              handleOpenNew();
            } else {
              setStyleFilter('All');
              setSearchQuery('');
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredCharacters.map((char) => {
            const linkedStoryTitles = stories
              .filter((st) => char.associatedStoryIds.includes(st.id))
              .map((st) => st.title);
            const consistencySnippet = buildCharacterConsistencyBlock(char);

            return (
              <article
                key={char.id}
                className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-32 h-44 sm:h-32 rounded-lg overflow-hidden border border-white/[0.08] bg-[#0B0D12] shrink-0">
                    <ReferenceImage
                      src={char.referenceImageUrl}
                      alt={`${char.name} reference portrait`}
                      name={char.name}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
                          {char.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#8E96A4] mt-0.5">
                          <span>{char.visualStyle}</span>
                          <span aria-hidden="true">·</span>
                          <span>{char.ageAppearance}</span>
                          {linkedStoryTitles.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#CBD2DF]">
                                {linkedStoryTitles.join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(char)}
                          aria-label={`Edit ${char.name}`}
                          className="p-2 rounded-md text-[#8E96A4] hover:text-white hover:bg-white/[0.06]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCharacterToDelete(char)}
                          aria-label={`Delete ${char.name}`}
                          className="p-2 rounded-md text-[#8E96A4] hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {char.description && (
                      <p className="text-xs text-[#CBD2DF] leading-relaxed">
                        {char.description}
                      </p>
                    )}

                    <dl className="grid grid-cols-1 gap-1 text-xs pt-1">
                      <div>
                        <dt className="inline text-[#7B8494]">Face: </dt>
                        <dd className="inline text-[#B8C0CE]">{char.faceAndAppearance}</dd>
                      </div>
                      <div>
                        <dt className="inline text-[#7B8494]">Hair: </dt>
                        <dd className="inline text-[#B8C0CE]">{char.hairstyle}</dd>
                      </div>
                      {char.bodyDescription && (
                        <div>
                          <dt className="inline text-[#7B8494]">Body: </dt>
                          <dd className="inline text-[#B8C0CE]">{char.bodyDescription}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="inline text-[#7B8494]">Clothing: </dt>
                        <dd className="inline text-[#B8C0CE]">{char.clothing}</dd>
                      </div>
                      {char.personality && (
                        <div>
                          <dt className="inline text-[#7B8494]">Personality: </dt>
                          <dd className="inline text-[#B8C0CE]">{char.personality}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Locked Consistency Block */}
                <div className="rounded-lg border border-white/[0.06] bg-[#0B0D12] p-3 space-y-1">
                  <div className="text-[11px] font-medium text-[#8E96A4]">
                    Injected Consistency Lock
                  </div>
                  <p className="text-xs font-mono text-[#9CA3B2] leading-relaxed">
                    {consistencySnippet}
                  </p>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      loadPromptIntoComposer({
                        title: `${char.name} — Scene Draft`,
                        visualStyle: char.visualStyle,
                        characterIds: [char.id],
                        storyId: char.associatedStoryIds[0] ?? '',
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-[#F3F5F8] transition-colors"
                  >
                    <Film className="h-3.5 w-3.5 text-[#E59A1A]" />
                    <span>Use in Create Video</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <CharacterFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingCharacter={editingCharacter}
      />

      <ConfirmDialog
        open={Boolean(characterToDelete)}
        onClose={() => setCharacterToDelete(null)}
        onConfirm={() => {
          if (characterToDelete) deleteCharacter(characterToDelete.id);
        }}
        title="Delete Character"
        message={`Remove "${characterToDelete?.name}" from your character registry? Existing scenes will unlink this character.`}
        confirmLabel="Delete Character"
      />
    </div>
  );
};
