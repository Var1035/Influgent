import React from 'react';

interface ViralRadarSectionProps {
  onLaunchStudio: () => void;
}

export const ViralRadarSection: React.FC<ViralRadarSectionProps> = ({ onLaunchStudio }) => {
  const syncSchedules = [
    { time: '6:00 AM', label: 'Morning Surge', active: false },
    { time: '11:00 AM', label: 'Midday Velocity', active: false },
    { time: '3:00 PM', label: 'Afternoon Breakout', active: true },
    { time: '6:00 PM', label: 'Prime Creator Hour', active: false },
    { time: '9:00 PM', label: 'Late Night Viral Wrap', active: false },
  ];

  const sampleTrends = [
    {
      title: 'Cyclone Arnab Intensifies: Andhra Coast on Alert!',
      category: 'Breaking & Weather',
      location: 'India (IN)',
      score: 96,
      multiplier: '12.4x vs channel baseline',
      growth: '+380% view velocity',
    },
    {
      title: 'Autonomous Coding Agents & Local LLMs',
      category: 'Tech & AI',
      location: 'United States (US)',
      score: 94,
      multiplier: '8.7x vs channel baseline',
      growth: '+420% view velocity',
    },
    {
      title: 'Gamer Glitch Makes Enemy AI So Confused It Crashed The Game',
      category: 'Gaming',
      location: 'Worldwide (GLOBAL)',
      score: 89,
      multiplier: '6.2x vs channel baseline',
      growth: '+260% view velocity',
    },
  ];

  return (
    <section id="radar" className="landing-section viral-radar-section">
      <div className="section-header">
        <div className="section-pill">
          <i className="fa-solid fa-satellite-dish"></i>
          <span>LIVE MOMENTUM INTELLIGENCE</span>
        </div>
        <h2 className="section-title">Automated 5x Daily YouTube Radar</h2>
        <p className="section-subtitle">
          Influgent continuously tracks breakout velocity across 5 daily sync windows so creators never miss a surging topic.
        </p>
      </div>

      {/* Sync Timing Pills Bar */}
      <div className="sync-schedule-bar">
        <div className="schedule-bar-header">
          <span className="schedule-label">
            <i className="fa-regular fa-clock"></i> Automated Sync Schedule (500 Videos / Day)
          </span>
          <span className="live-pulse-badge">
            <span className="pulse-dot"></span> Live Sync Active
          </span>
        </div>
        <div className="schedule-pills-grid">
          {syncSchedules.map((sync) => (
            <div
              key={sync.time}
              className={`schedule-pill ${sync.active ? 'current-active' : ''}`}
            >
              <div className="pill-time">{sync.time}</div>
              <div className="pill-label">{sync.label}</div>
              {sync.active && <span className="active-tag">Next Window</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Sample Breakout Feed Preview */}
      <div className="radar-feed-preview">
        <div className="preview-header">
          <div className="preview-title">
            <i className="fa-solid fa-fire" style={{ color: '#ef4444' }}></i>
            <span>Live Breakout Radar Preview</span>
          </div>
          <div className="preview-location-badge">
            <i className="fa-solid fa-earth-americas"></i>
            <span>India + United States Active</span>
          </div>
        </div>

        <div className="preview-cards-stack">
          {sampleTrends.map((trend) => (
            <div key={trend.title} className="radar-trend-card">
              <div className="trend-card-left">
                <div className="trend-score-badge" title="Viral Momentum Score">
                  <span className="score-val">{trend.score}</span>
                  <span className="score-label">SCORE</span>
                </div>
                <div className="trend-info">
                  <h4 className="trend-title">{trend.title}</h4>
                  <div className="trend-tags">
                    <span className="tag-category">{trend.category}</span>
                    <span className="tag-location">
                      <i className="fa-solid fa-location-dot"></i> {trend.location}
                    </span>
                    <span className="tag-multiplier">
                      <i className="fa-solid fa-arrow-trend-up"></i> {trend.multiplier}
                    </span>
                  </div>
                </div>
              </div>

              <div className="trend-card-right">
                <button
                  type="button"
                  className="preview-generate-btn"
                  onClick={onLaunchStudio}
                  title="Generate voiceover script for this topic"
                >
                  <i className="fa-solid fa-bolt"></i>
                  <span>Create Video</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-cta-wrap">
        <button
          type="button"
          onClick={onLaunchStudio}
          className="cta-btn cta-btn-primary"
        >
          <span>Explore All 500+ Videos in Trends Explorer</span>
          <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px', fontSize: '12px' }}></i>
        </button>
      </div>
    </section>
  );
};

