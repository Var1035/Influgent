import React from 'react';
import { WisprFlowBadge } from './WisprFlowBadge';

interface HeroProps {
  onGetStarted?: (tab?: 'trends' | 'studio' | 'library') => void;
}

export const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  return (
    <section id="hero" className="hero" aria-label="Introduction">
      {/* Live Sync Radar Trust Row */}
      <div
        className="trust-row anim"
        style={{ '--d': '0.05s' } as React.CSSProperties}
      >
        <div className="trust-avatars">
          {/* Avatar 1: YouTube Data API v3 */}
          <div
            className="avatar-ring avatar-1"
            title="YouTube Data API v3 Live Scraper"
          >
            <div className="avatar-inner">
              <i className="fa-brands fa-youtube" style={{ color: '#ef4444' }}></i>
            </div>
          </div>
          {/* Avatar 2: Mistral AI */}
          <div
            className="avatar-ring avatar-2"
            title="Mistral AI Context-Grounded Voiceovers"
          >
            <div className="avatar-inner">
              <i className="fa-solid fa-brain" style={{ color: '#f59e0b' }}></i>
            </div>
          </div>
          {/* Avatar 3: Supabase PostgreSQL */}
          <div
            className="avatar-ring avatar-3"
            title="Supabase PostgreSQL Real-time Storage"
          >
            <div className="avatar-inner">
              <i className="fa-solid fa-bolt" style={{ color: '#10b981' }}></i>
            </div>
          </div>
        </div>
        {/* Trust Pill */}
        <div className="trust-pill">
          <span className="trust-text">5x Daily Sync • India, US & Global Trends</span>
        </div>
      </div>

      {/* Headline (Solid white, retro dot-matrix display) */}
      <h1 className="headline anim">
        <span className="headline-line">Spot Breakout Trends.</span>
        <span className="headline-line">Record Viral Shorts.</span>
      </h1>

      {/* Subhead */}
      <p
        className="subhead anim"
        style={{ '--d': '0.28s' } as React.CSSProperties}
      >
        Automated viral momentum radar for creators. Scrape YouTube breakouts across India and the US, generate grounded Mistral AI voiceovers, and record with live in-browser transparent teleprompting.
      </p>

      {/* Single Primary Launch Studio CTA Button & Wispr Flow Voice-First Badge */}
      <div
        className="hero-single-cta anim"
        style={{ '--d': '0.38s' } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={() => onGetStarted?.('trends')}
          className="cta-btn cta-btn-primary"
          title="Launch Influgent Studio"
        >
          <span>Launch Studio</span>
          <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px', fontSize: '12px' }}></i>
        </button>

        <WisprFlowBadge className="hero-wispr-badge" />
      </div>
    </section>
  );
};
