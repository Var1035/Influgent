import React from 'react';

interface HeaderProps {
  activeNav: string;
  setActiveNav: (item: string) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenWorkspace?: (tab?: 'trends' | 'studio' | 'library') => void;
  onGoHome?: () => void;
  onNavigateSection?: (target: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeNav,
  setActiveNav,
  isMenuOpen,
  setIsMenuOpen,
  onOpenWorkspace,
  onGoHome,
  onNavigateSection,
}) => {
  const navItems = [
    { label: 'Home', target: '#hero' },
    { label: 'Features', target: '#features' },
    { label: 'How It Works', target: '#how-it-works' },
    { label: 'Viral Radar', target: '#radar' },
  ];

  const handleItemClick = (label: string, target: string) => {
    setActiveNav(label);
    if (onNavigateSection) {
      onNavigateSection(target);
    } else {
      const el = document.querySelector(target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        onGoHome?.();
      }
    }
  };

  return (
    <header className="header">
      {/* Brand Logo with Influgent Tooltip */}
      <a
        href="#hero"
        className="header-logo"
        aria-label="Influgent Studio Home"
        title="Influgent — AI Viral Trend Intelligence & Creator Studio"
        onClick={(e) => {
          e.preventDefault();
          handleItemClick('Home', '#hero');
        }}
      >
        <img src="/assets/logo.webp" alt="Influgent" width="52" height="52" />
      </a>

      {/* Desktop Nav Pill (White) */}
      <nav className="nav-pill" aria-label="Main Navigation">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`nav-link ${activeNav === item.label ? 'active' : ''}`}
            onClick={() => handleItemClick(item.label, item.target)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Desktop Launch Studio Pill */}
      <button
        type="button"
        className="sign-in-btn"
        onClick={() => onOpenWorkspace?.('trends')}
        title="Launch Influgent Studio"
      >
        <span>Launch Studio</span>
        <i className="fa-solid fa-arrow-right" style={{ fontSize: '11px', marginLeft: '7px' }}></i>
      </button>

      {/* Mobile Hamburger Button */}
      <button
        className={`burger-btn ${isMenuOpen ? 'open' : ''}`}
        aria-label="Toggle Navigation Menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        <span className="burger-bar"></span>
        <span className="burger-bar"></span>
        <span className="burger-bar"></span>
      </button>
    </header>
  );
};
