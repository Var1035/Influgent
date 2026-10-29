import React from 'react';

interface HowItWorksSectionProps {
  onLaunchStudio: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onLaunchStudio }) => {
  const steps = [
    {
      num: '01',
      tag: 'RADAR DISCOVERY',
      title: 'Spot Breakouts Before Saturation',
      desc: 'Our automated sync queries YouTube 5 times a day (6 AM, 11 AM, 3 PM, 6 PM, 9 PM) across India and the US. Algorithms compare view velocity against 7-day channel baselines to isolate true viral anomalies from big-studio uploads.',
      icon: 'fa-solid fa-radar',
      highlight: '500+ fresh videos daily',
    },
    {
      num: '02',
      tag: 'MISTRAL SCRIPTING',
      title: 'Generate Grounded Spoken Scripts',
      desc: 'Mistral AI analyzes the breaking topic and writes a 45-second high-retention voiceover script. All scripts are stripped of markdown formatting and dashes, equipped with 3 viral hooks (Curiosity, Contrarian, Story) and scene timestamps.',
      icon: 'fa-solid fa-pen-nib',
      highlight: 'Zero corporate fluff',
    },
    {
      num: '03',
      tag: 'IN-BROWSER STUDIO',
      title: 'Record Live with Eye-Line Teleprompter',
      desc: 'Launch the recording studio right in your browser. The transparent teleprompter scrolls smoothly over your live webcam video at eye level near your camera. Say "Okay, done" to auto-stop recording without ever touching the mouse.',
      icon: 'fa-solid fa-video',
      highlight: 'Hands-free voice stop',
    },
  ];

  return (
    <section id="how-it-works" className="landing-section how-it-works-section">
      <div className="section-header">
        <div className="section-pill">
          <i className="fa-solid fa-route"></i>
          <span>CREATOR WORKFLOW</span>
        </div>
        <h2 className="section-title">How Influgent Works in 3 Steps</h2>
        <p className="section-subtitle">
          Go from spotting a breaking trend to having a recorded, high-retention vertical video in under 60 seconds.
        </p>
      </div>

      <div className="steps-container">
        {steps.map((step, idx) => (
          <div key={step.num} className="step-card">
            <div className="step-badge-row">
              <span className="step-number">{step.num}</span>
              <span className="step-tag">{step.tag}</span>
              <div className="step-icon">
                <i className={step.icon}></i>
              </div>
            </div>
            <h3 className="step-title">{step.title}</h3>
            <p className="step-desc">{step.desc}</p>
            <div className="step-footer">
              <span className="step-highlight">
                <i className="fa-solid fa-check-circle"></i> {step.highlight}
              </span>
            </div>
            {idx < steps.length - 1 && <div className="step-connector-line"></div>}
          </div>
        ))}
      </div>

      <div className="section-cta-wrap">
        <button
          type="button"
          onClick={onLaunchStudio}
          className="cta-btn cta-btn-primary"
        >
          <span>Try the 3-Step Workflow</span>
          <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px', fontSize: '12px' }}></i>
        </button>
      </div>
    </section>
  );
};

