import React from 'react';

interface ComparisonSectionProps {
  onLaunchStudio: () => void;
}

export const ComparisonSection: React.FC<ComparisonSectionProps> = ({ onLaunchStudio }) => {
  const comparisonRows = [
    {
      metric: 'Trend Discovery',
      traditional: '2 - 3 hours doom-scrolling feeds and guessing what is trending.',
      influgent: 'Automated 5x daily sync analyzing 500+ videos with outlier multipliers.',
      influgentHighlight: 'Real-time velocity scoring',
    },
    {
      metric: 'Scriptwriting',
      traditional: 'Generic ChatGPT outputs packed with corporate buzzwords and robotic theory.',
      influgent: 'Topic-grounded Mistral AI voiceovers formatted for natural spoken delivery in 45s.',
      influgentHighlight: 'Zero markdown, zero dashes',
    },
    {
      metric: 'Video Recording',
      traditional: 'Awkward eye contact, forgetting lines, and recording 10+ frustrating retakes.',
      influgent: 'Transparent in-browser teleprompter right at eye level with hands-free voice stop.',
      influgentHighlight: 'Say "Okay, done" to stop',
    },
    {
      metric: 'Repurposing',
      traditional: 'Writing separate LinkedIn posts, captions, and AI video prompts by hand.',
      influgent: 'One-click content package with LinkedIn thought-leadership and scene B-roll cues.',
      influgentHighlight: 'Turnkey creator package',
    },
  ];

  return (
    <section className="landing-section comparison-section">
      <div className="section-header">
        <div className="section-pill">
          <i className="fa-solid fa-code-compare"></i>
          <span>CREATOR ADVANTAGE</span>
        </div>
        <h2 className="section-title">The Creator Edge: Traditional vs. Influgent</h2>
        <p className="section-subtitle">
          See why short-form creators and influencers switch to Influgent to save 10+ hours every content batch.
        </p>
      </div>

      <div className="comparison-table-wrap">
        <div className="comparison-table-header">
          <div className="col-feature">WORKFLOW STAGE</div>
          <div className="col-traditional">TRADITIONAL WORKFLOW</div>
          <div className="col-influgent">
            <i className="fa-solid fa-bolt" style={{ color: '#6366f1' }}></i>
            <span>INFLUGENT STUDIO</span>
          </div>
        </div>

        <div className="comparison-rows-stack">
          {comparisonRows.map((row) => (
            <div key={row.metric} className="comparison-row">
              <div className="col-feature">
                <strong>{row.metric}</strong>
              </div>
              <div className="col-traditional">
                <i className="fa-solid fa-xmark" style={{ color: '#ef4444', marginRight: '8px' }}></i>
                <span>{row.traditional}</span>
              </div>
              <div className="col-influgent">
                <i className="fa-solid fa-circle-check" style={{ color: '#10b981', marginRight: '8px' }}></i>
                <div>
                  <span className="influgent-text">{row.influgent}</span>
                  <span className="influgent-badge">{row.influgentHighlight}</span>
                </div>
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
          <span>Upgrade Your Creation Workflow</span>
          <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px', fontSize: '12px' }}></i>
        </button>
      </div>
    </section>
  );
};

