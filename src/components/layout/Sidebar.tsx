import React from 'react';
import {
  BookOpen,
  Film,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  Library,
  PlusSquare,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useStudioData } from '../../hooks/useStudioData';
import type { StudioPage } from '../../types/studio';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: StudioPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create-video', label: 'Create Video', icon: PlusSquare },
  { id: 'my-videos', label: 'My Videos', icon: Film },
  { id: 'stories', label: 'My Stories', icon: BookOpen },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'prompt-library', label: 'Prompt Library', icon: Library },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help', icon: HelpCircle },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activePage, setActivePage, backendHealth, generationJobs } = useStudioData();

  const handleSelect = (page: StudioPage) => {
    setActivePage(page);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col bg-[#0F1219] border-r border-white/[0.07]">
      {/* Brand Wordmark */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.07]">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E59A1A] rounded-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#E59A1A] text-[#0B0D12]">
            <FolderKanban className="h-4 w-4 stroke-[2.25]" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-[#F3F5F8] whitespace-nowrap">
            ReelCraft Studio
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-2 rounded-md text-[#8E96A4] hover:text-white hover:bg-white/[0.06]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Primary Navigation */}
      <nav aria-label="Studio navigation" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          const count = item.id === 'my-videos' ? generationJobs.length : undefined;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E59A1A] whitespace-nowrap ${
                isActive
                  ? 'bg-[#191E2A] text-[#F8FAFC]'
                  : 'text-[#9CA3B2] hover:text-[#F3F5F8] hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-[#E59A1A]' : 'text-[#737C8C]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof count === 'number' && count > 0 && (
                <span className="font-mono text-xs tabular-nums text-[#8E96A4]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Honest Storage & Backend Mode Footer */}
      <div className="px-5 py-4 border-t border-white/[0.07] space-y-1">
        <div
          className={`text-xs font-medium ${
            backendHealth.connected ? 'text-emerald-400' : 'text-[#CBD2DF]'
          }`}
        >
          {backendHealth.connected ? 'Backend Connected' : 'Backend Not Connected'}
        </div>
        <div className="text-xs text-[#7B8494] leading-relaxed">
          {backendHealth.connected
            ? 'FastAPI server reachable'
            : 'Local Drafts · Start backend server'}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">{navContent}</aside>
        </div>
      )}
    </>
  );
};
