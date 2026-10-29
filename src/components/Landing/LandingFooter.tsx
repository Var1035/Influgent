import React from 'react';

interface LandingFooterProps {
  onLaunchStudio: () => void;
  onNavigateSection: (target: string) => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({
  onLaunchStudio,
  onNavigateSection,
}) => {
  return (
    <footer className="landing-footer">
      <div className="footer-container">
        <div className="footer-top-row">
          {/* Logo & Brand Info */}
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <img src="/assets/logo.webp" alt="Influgent" width="38" height="38" className="footer-logo-img" />
              <span className="footer-brand-name">Influgent Studio</span>
            </div>
            <p className="footer-brand-desc">
              AI-powered viral trend intelligence & in-browser recording studio for short-form video creators and influencers.
            </p>
          </div>

          {/* Quick Nav Links */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-links-list">
              <li>
                <button type="button" onClick={() => onNavigateSection('#hero')} className="footer-link-btn">
                  Home
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigateSection('#features')} className="footer-link-btn">
                  Features
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigateSection('#how-it-works')} className="footer-link-btn">
                  How It Works
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigateSection('#radar')} className="footer-link-btn">
                  Viral Radar (5x Sync)
                </button>
              </li>
            </ul>
          </div>

          {/* Platform Capabilities */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Platform Suite</h4>
            <ul className="footer-links-list">
              <li>
                <button type="button" onClick={onLaunchStudio} className="footer-link-btn">
                  YouTube Trends Explorer
                </button>
              </li>
              <li>
                <button type="button" onClick={onLaunchStudio} className="footer-link-btn">
                  Mistral AI Scriptwriter
                </button>
              </li>
              <li>
                <button type="button" onClick={onLaunchStudio} className="footer-link-btn">
                  Transparent Teleprompter
                </button>
              </li>
              <li>
                <button type="button" onClick={onLaunchStudio} className="footer-link-btn">
                  AI Video Scene Timestamps
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-row">
          <p className="footer-copy">
            © {new Date().getFullYear()} Influgent. Built for high-retention video creators. Powered by YouTube Data API v3 & Mistral AI.
          </p>
          <div className="footer-tech-badges">
            <span className="tech-badge"><i className="fa-brands fa-youtube" style={{ color: '#ef4444' }}></i> YouTube API v3</span>
            <span className="tech-badge"><i className="fa-solid fa-brain" style={{ color: '#f59e0b' }}></i> Mistral AI</span>
            <span className="tech-badge"><i className="fa-solid fa-bolt" style={{ color: '#10b981' }}></i> Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

