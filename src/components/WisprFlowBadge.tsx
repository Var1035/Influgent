import React from 'react';

interface WisprFlowBadgeProps {
  className?: string;
  style?: React.CSSProperties;
}

export const WisprFlowBadge: React.FC<WisprFlowBadgeProps> = ({ className = '', style }) => {
  return (
    <div
      className={`wispr-flow-pill ${className}`}
      style={style}
      title="Influgent is built voice-first with Wispr Flow"
      aria-label="Built voice-first with Wispr Flow"
    >
      <span className="wispr-dot" aria-hidden="true"></span>
      <span className="wispr-text">
        Built voice-first with <span className="wispr-brand">Wispr Flow</span>
      </span>
      <span className="wispr-wave-bars" aria-hidden="true">
        <span className="wave-bar wb-1"></span>
        <span className="wave-bar wb-2"></span>
        <span className="wave-bar wb-3"></span>
        <span className="wave-bar wb-4"></span>
        <span className="wave-bar wb-5"></span>
      </span>
    </div>
  );
};

export default WisprFlowBadge;

