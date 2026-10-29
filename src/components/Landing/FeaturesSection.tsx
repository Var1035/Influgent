import React from 'react';

interface FeaturesSectionProps {
  onLaunchStudio: () => void;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ onLaunchStudio }) => {
  return (
    <section id="features" className="landing-section features-section">
      <div className="section-header">
        <div className="section-pill">
          <i className="fa-solid fa-wand-magic-sparkles"></i>
          <span>CREATOR INTELLIGENCE SUITE</span>
        </div>
        <h2 className="section-title">Built for High-Retention Video Creators</h2>
        <p className="section-subtitle">
          Everything you need to discover emerging YouTube trends, write context-accurate voiceovers, and record with zero camera friction.
        </p>
      </div>

      <div className="features-grid">
        {/* Feature 1 */}
        <div className="feature-card">
          <div className="feature-top">
            <div className="feature-icon-wrap icon-red">
              <i className="fa-brands fa-youtube"></i>
            </div>
            <span className="feature-badge">5x Daily Sync</span>
          </div>
          <h3 className="feature-name">Automated Viral Radar</h3>
          <p className="feature-desc">
            Scrapes 500+ trending videos daily across 5 automated runs (6 AM, 11 AM, 3 PM, 6 PM, 9 PM). Identifies true breakouts by calculating view multipliers against 7-day channel baselines.
          </p>
          <div className="feature-meta-pills">
            <span className="meta-pill"><i className="fa-solid fa-location-dot"></i> India & United States</span>
            <span className="meta-pill"><i className="fa-solid fa-chart-line"></i> Outlier Scoring</span>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="feature-card">
          <div className="feature-top">
            <div className="feature-icon-wrap icon-amber">
              <i className="fa-solid fa-brain"></i>
            </div>
            <span className="feature-badge">Mistral AI</span>
          </div>
          <h3 className="feature-name">Grounded Voiceover Scripts</h3>
          <p className="feature-desc">
            Generates 100% topic-relevant voiceover scripts tailored to the exact breaking news or event. Zero corporate fluff, cleaned of markdown syntax and dashes for natural spoken delivery.
          </p>
          <div className="feature-meta-pills">
            <span className="meta-pill"><i className="fa-solid fa-bolt"></i> Curiosity, Contrarian & Story Hooks</span>
            <span className="meta-pill"><i className="fa-solid fa-clock"></i> 35-45s Pacing</span>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="feature-card">
          <div className="feature-top">
            <div className="feature-icon-wrap icon-purple">
              <i className="fa-solid fa-tv"></i>
            </div>
            <span className="feature-badge">In-Browser Camera</span>
          </div>
          <h3 className="feature-name">Transparent Teleprompter</h3>
          <p className="feature-desc">
            Record directly in your browser with transparent auto-scrolling script lines positioned at eye level near your lens. Eliminates memorization and awkward eye glances.
          </p>
          <div className="feature-meta-pills">
            <span className="meta-pill"><i className="fa-solid fa-microphone"></i> Voice Auto-Stop ("Okay, done")</span>
            <span className="meta-pill"><i className="fa-solid fa-shield-halved"></i> 100% Local Privacy</span>
          </div>
        </div>

        {/* Feature 4 */}
        <div className="feature-card">
          <div className="feature-top">
            <div className="feature-icon-wrap icon-emerald">
              <i className="fa-solid fa-share-nodes"></i>
            </div>
            <span className="feature-badge">Multi-Platform</span>
          </div>
          <h3 className="feature-name">Cross-Platform Repurposing</h3>
          <p className="feature-desc">
            Turn every viral trend into a complete content package: formatted LinkedIn thought-leadership posts, Instagram/YouTube captions, and scene B-roll timestamps for AI video generators.
          </p>
          <div className="feature-meta-pills">
            <span className="meta-pill"><i className="fa-brands fa-linkedin"></i> LinkedIn Posts</span>
            <span className="meta-pill"><i className="fa-solid fa-clapperboard"></i> AI Video Scene Prompts</span>
          </div>
        </div>
      </div>

      <div className="section-cta-wrap">
        <button
          type="button"
          onClick={onLaunchStudio}
          className="cta-btn cta-btn-primary"
        >
          <span>Launch Studio Now</span>
          <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px', fontSize: '12px' }}></i>
        </button>
      </div>
    </section>
  );
};

