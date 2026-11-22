import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { StudioProvider, useStudioData } from './hooks/useStudioData';
import { CharactersPage } from './pages/CharactersPage';
import { CreateVideoPage } from './pages/CreateVideoPage';
import { DashboardPage } from './pages/DashboardPage';
import { HelpPage } from './pages/HelpPage';
import { MyVideosPage } from './pages/MyVideosPage';
import { PromptLibraryPage } from './pages/PromptLibraryPage';
import { SettingsPage } from './pages/SettingsPage';
import { StoriesPage } from './pages/StoriesPage';

const StudioShell: React.FC = () => {
  const { activePage } = useStudioData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'create-video':
        return <CreateVideoPage />;
      case 'my-videos':
        return <MyVideosPage />;
      case 'stories':
        return <StoriesPage />;
      case 'characters':
        return <CharactersPage />;
      case 'prompt-library':
        return <PromptLibraryPage />;
      case 'settings':
        return <SettingsPage />;
      case 'help':
        return <HelpPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#E6E9F0] flex">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1440px] w-full mx-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <StudioProvider>
      <StudioShell />
    </StudioProvider>
  );
}
