import React, { useState } from 'react';
import { BackgroundVideo } from './components/BackgroundVideo';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { StatsFooter } from './components/StatsFooter';
import { MobileMenu } from './components/MobileMenu';
import { FeaturesSection } from './components/Landing/FeaturesSection';
import { HowItWorksSection } from './components/Landing/HowItWorksSection';
import { ViralRadarSection } from './components/Landing/ViralRadarSection';
import { ComparisonSection } from './components/Landing/ComparisonSection';
import { CallToActionSection } from './components/Landing/CallToActionSection';
import { LandingFooter } from './components/Landing/LandingFooter';
import { VoiceWorkspace } from './components/VoiceWorkspace/VoiceWorkspace';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'workspace'>('landing');
  const [activeNav, setActiveNav] = useState('Home');
  const [workspaceTab, setWorkspaceTab] = useState<'trends' | 'studio' | 'library'>('trends');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleOpenWorkspace = (tab: 'trends' | 'studio' | 'library' = 'trends') => {
    setWorkspaceTab(tab);
    setCurrentView('workspace');
    if (tab === 'trends') setActiveNav('Trends Explorer');
    else if (tab === 'studio') setActiveNav('Content Studio');
    else if (tab === 'library') setActiveNav('Saved Library');
    else setActiveNav('Workspace');
  };

  const handleGoHome = () => {
    setCurrentView('landing');
    setActiveNav('Home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateSection = (target: string) => {
    if (currentView !== 'landing') {
      setCurrentView('landing');
      setTimeout(() => {
        const el = document.querySelector(target);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* View Switcher: Full Homepage vs Creator Studio Workspace */}
      {currentView === 'landing' ? (
        <div className="landing-page-wrapper">
          {/* 1. Hero Viewport with Dedicated Video Background */}
          <div className="hero-viewport-wrapper" id="hero">
            <BackgroundVideo />

            <div className="landing-header-bar">
              <Header
                activeNav={activeNav}
                setActiveNav={setActiveNav}
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
                onOpenWorkspace={handleOpenWorkspace}
                onGoHome={handleGoHome}
                onNavigateSection={handleNavigateSection}
              />
            </div>

            <main className="landing-hero-content">
              <Hero onGetStarted={handleOpenWorkspace} />
              <StatsFooter />
            </main>
          </div>

          {/* 2. Static Content Sections (Completely distinct, solid, static UI) */}
          <div className="static-sections-wrapper">
            <FeaturesSection onLaunchStudio={() => handleOpenWorkspace('trends')} />
            <HowItWorksSection onLaunchStudio={() => handleOpenWorkspace('studio')} />
            <ViralRadarSection onLaunchStudio={() => handleOpenWorkspace('trends')} />
            <ComparisonSection onLaunchStudio={() => handleOpenWorkspace('trends')} />
            <CallToActionSection onLaunchStudio={() => handleOpenWorkspace('trends')} />
            <LandingFooter
              onLaunchStudio={() => handleOpenWorkspace('trends')}
              onNavigateSection={handleNavigateSection}
            />
          </div>
        </div>
      ) : (
        <div className="workspace-view-wrap">
          <VoiceWorkspace onBackToHome={handleGoHome} initialTab={workspaceTab} />
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        onOpenWorkspace={handleOpenWorkspace}
        onGoHome={handleGoHome}
        onNavigateSection={handleNavigateSection}
      />
    </>
  );
};

export default App;
