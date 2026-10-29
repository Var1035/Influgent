import React, { useState, useEffect, useRef } from 'react';
import { voiceService } from '../../services/voiceRecognition';
import { VoiceState } from '../../types/workspace';

interface VoiceInputBarProps {
  onExecuteCommand: (command: string) => void;
  isLoading: boolean;
}

export const VoiceInputBar: React.FC<VoiceInputBarProps> = ({
  onExecuteCommand,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsSupported(voiceService.isSupported());

    voiceService.onTranscript = (transcript: string) => {
      setInputText(transcript);
    };

    voiceService.onStateChange = (state: VoiceState) => {
      setVoiceState(state);
    };

    voiceService.onError = (error: string) => {
      setErrorMessage(error);
      setVoiceState('error');
    };

    return () => {
      voiceService.abort();
    };
  }, []);

  const toggleVoiceRecording = () => {
    setErrorMessage(null);
    if (voiceState === 'listening') {
      voiceService.stop();
    } else {
      voiceService.start();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    if (voiceState === 'listening') {
      voiceService.stop();
    }

    onExecuteCommand(inputText.trim());
  };

  const handleQuickPrompt = (promptText: string) => {
    setInputText(promptText);
    onExecuteCommand(promptText);
  };

  return (
    <div className="voice-input-container">
      {/* Microphone status or error warning */}
      {errorMessage && (
        <div className="voice-error-banner" role="alert">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="banner-close-btn"
            onClick={() => setErrorMessage(null)}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Main command bar with microphone */}
      <form onSubmit={handleSubmit} className="voice-command-bar">
        {/* Microphone Button */}
        <button
          type="button"
          className={`mic-button ${voiceState === 'listening' ? 'listening' : ''} ${
            !isSupported ? 'disabled' : ''
          }`}
          onClick={toggleVoiceRecording}
          title={
            !isSupported
              ? 'Speech recognition is not supported in this browser. Use text input below.'
              : voiceState === 'listening'
              ? 'Click to stop listening'
              : 'Click to speak a voice command'
          }
          aria-label={
            voiceState === 'listening' ? 'Stop listening' : 'Start voice command'
          }
        >
          {voiceState === 'listening' ? (
            <div className="audio-wave">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : (
            <i className="fa-solid fa-microphone"></i>
          )}
        </button>

        {/* Editable Recognized Text / Text Fallback Input */}
        <div className="command-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="command-text-input"
            placeholder={
              voiceState === 'listening'
                ? 'Listening... speak your command now...'
                : 'Speak or type: "Find trending AI topics", "Generate YouTube Shorts script"...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
          />
          {inputText && (
            <button
              type="button"
              className="clear-input-btn"
              onClick={() => setInputText('')}
              title="Clear input"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>

        {/* Execute Action Button */}
        <button
          type="submit"
          className="execute-btn"
          disabled={!inputText.trim() || isLoading}
          title="Execute command"
        >
          {isLoading ? (
            <i className="fa-solid fa-circle-notch fa-spin"></i>
          ) : (
            <>
              <span>Run</span>
              <i className="fa-solid fa-arrow-right"></i>
            </>
          )}
        </button>
      </form>

      {/* Quick Prompt Suggestion Pills */}
      <div className="quick-prompts-row">
        <span className="quick-prompt-label">Try asking:</span>
        <button
          type="button"
          className="quick-prompt-pill"
          onClick={() => handleQuickPrompt('Find trending AI topics')}
        >
          <i className="fa-solid fa-arrow-trend-up"></i> Find trending AI topics
        </button>
        <button
          type="button"
          className="quick-prompt-pill"
          onClick={() => handleQuickPrompt('Find trends for Lenovo laptop')}
        >
          <i className="fa-solid fa-laptop"></i> Lenovo laptop trends
        </button>
        <button
          type="button"
          className="quick-prompt-pill"
          onClick={() => handleQuickPrompt('Generate a YouTube Shorts script for Autonomous Coding Agents')}
        >
          <i className="fa-solid fa-wand-magic-sparkles"></i> Generate Shorts script
        </button>
        <button
          type="button"
          className="quick-prompt-pill"
          onClick={() => handleQuickPrompt('Create a LinkedIn post on AI workflows')}
        >
          <i className="fa-brands fa-linkedin"></i> Create LinkedIn post
        </button>
        <button
          type="button"
          className="quick-prompt-pill"
          onClick={() => handleQuickPrompt('Make the hook punchier and shorter')}
        >
          <i className="fa-solid fa-bolt"></i> Make hook punchier
        </button>
      </div>
    </div>
  );
};

