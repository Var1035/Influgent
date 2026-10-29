import React from 'react';

interface CallToActionSectionProps {
  onLaunchStudio: () => void;
}

export const CallToActionSection: React.FC<CallToActionSectionProps> = ({ onLaunchStudio }) => {
  return (
    <section className="landing-section cta-banner-section">
      <div className="cta-banner-card">
        <div className="cta-glow-bg"></div>
        <div className="cta-content">
          <div className="section-pill">
            <i className="fa-solid fa-sparkles"></i>
            <span>GET STARTED IN SECONDS</span>
          </div>

          <h2 className="cta-headline">
            Spot Your Next Viral Video Before It Peaks.
          </h2>

          <p className="cta-description">
            Join creators and influencers turning raw YouTube momentum into high-retention vertical videos with automated breakout detection, Mistral AI scripting, and in-browser teleprompting.
          </p>

          <div className="cta-actions-row">
            <button
              type="button"
              onClick={onLaunchStudio}
              className="cta-btn cta-btn-primary cta-btn-large"
            >
              <i className="fa-solid fa-rocket" style={{ marginRight: '8px', color: '#6366f1' }}></i>
              <span>Launch Studio Free</span>
              <i className="fa-solid fa-arrow-right" style={{ marginLeft: '10px', fontSize: '13px' }}></i>
            </button>
          </div>

          <div className="cta-guarantees">
            <span><i className="fa-solid fa-check"></i> No Camera Installation</span>
            <span><i className="fa-solid fa-check"></i> 500+ Videos / Day</span>
            <span><i className="fa-solid fa-check"></i> Zero Markdown Fluff</span>
          </div>
        </div>
      </div>
    </section>
  );
};

