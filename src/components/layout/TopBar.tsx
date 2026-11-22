import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { useStudioData } from '../../hooks/useStudioData';
import type { StudioPage } from '../../types/studio';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

const PAGE_LABELS: Record<StudioPage, { title: string; breadcrumb: string }> = {
  dashboard: { title: 'Dashboard', breadcrumb: 'Studio / Dashboard' },
  'create-video': { title: 'Create Video', breadcrumb: 'Studio / Create Video' },
  'my-videos': { title: 'My Videos', breadcrumb: 'Studio / My Videos' },
  stories: { title: 'My Stories', breadcrumb: 'Studio / My Stories' },
  characters: { title: 'Characters', breadcrumb: 'Studio / Characters' },
  'prompt-library': { title: 'Prompt Library', breadcrumb: 'Studio / Prompt Library' },
  settings: { title: 'Settings', breadcrumb: 'Studio / Settings' },
  help: { title: 'Help', breadcrumb: 'Studio / Beginner Setup Guide' },
};

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu }) => {
  const { activePage, setActivePage } = useStudioData();
  const meta = PAGE_LABELS[activePage];

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0B0D12]/90 backdrop-blur-md border-b border-white/[0.07] px-4 sm:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 rounded-md text-[#9CA3B2] hover:text-white hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E59A1A]"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm text-[#8E96A4] truncate">{meta.breadcrumb}</span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {activePage !== 'create-video' && (
          <button
            type="button"
            onClick={() => setActivePage('create-video')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-sm font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]"
          >
            <Plus className="h-4 w-4 stroke-[2.25]" />
            <span>Create New Video</span>
          </button>
        )}
      </div>
    </header>
  );
};
