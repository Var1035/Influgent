import React, { useEffect } from 'react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeNav: string;
  setActiveNav: (item: string) => void;
  onOpenWorkspace?: (tab?: 'trends' | 'studio' | 'library') => void;
  onGoHome?: () => void;
  onNavigateSection?: (target: string) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  activeNav,
  setActiveNav,
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

  // Handle escape key and window resize
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    function handleResize() {
      if (window.innerWidth > 720) {
        onClose();
      }
    }

    if (isOpen) {
      document.body.classList.add('menu-open');
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleResize);
    } else {
      document.body.classList.remove('menu-open');
    }

    return () => {
      document.body.classList.remove('menu-open');
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNavClick = (label: string, target: string) => {
    setActiveNav(label);
    onClose();
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
    <div
      className="mobile-overlay"
      id="mobileOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <nav
        className="mobile-menu-sheet"
        id="mobileMenu"
        aria-label="Mobile Navigation Menu"
      >
        <div className="mobile-nav-links">
          {navItems.map((item, index) => (
            <button
              key={item.label}
              className={`mobile-nav-link ${activeNav === item.label ? 'active' : ''}`}
              style={{ '--i': index } as React.CSSProperties}
              onClick={() => handleNavClick(item.label, item.target)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mobile-sign-in"
          style={{ '--i': 4 } as React.CSSProperties}
          onClick={() => {
            onClose();
            onOpenWorkspace?.('trends');
          }}
        >
          Launch Studio Free
        </button>
      </nav>
    </div>
  );
};
