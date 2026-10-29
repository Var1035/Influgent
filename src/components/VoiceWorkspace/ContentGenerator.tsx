import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GeneratedContent, ContentFormat } from '../../types/workspace';
import { openaiService } from '../../services/openaiService';
import { mistralService, cleanSpokenText } from '../../services/mistralService';
import { WisprFlowBadge } from '../WisprFlowBadge';

interface ContentGeneratorProps {
  content: GeneratedContent;
  onUpdateContent: (updated: GeneratedContent) => void;
  onSaveContent: (content: GeneratedContent) => void;
  onRefine: (instruction: string) => void;
  isRefining: boolean;
  isGeneratingScript?: boolean;
  generationSeconds?: number;
}

export const ContentGenerator: React.FC<ContentGeneratorProps> = ({
  content,
  onUpdateContent,
  onSaveContent,
  onRefine,
  isRefining,
  isGeneratingScript = false,
  generationSeconds = 0,
}) => {
  const [activeHookTab, setActiveHookTab] = useState<'curiosity' | 'contrarian' | 'story'>('curiosity');
  const [refineInput, setRefineInput] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Voiceover & Hidden Technical Prompt state
  const [showTechnicalPrompt, setShowTechnicalPrompt] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [prompterSpeed, setPrompterSpeed] = useState(2);
  const [prompterFontSize, setPrompterFontSize] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 22 : 36
  );
  const [isPrompterScrolling, setIsPrompterScrolling] = useState(true);

  // ChatGPT & AI Video Pipeline Modal state
  const [showChatGPTModal, setShowChatGPTModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'chatgpt' | 'video-architecture'>('chatgpt');
  const [userApiKey, setUserApiKey] = useState(openaiService.getKey());
  const [isSendingToChatGPT, setIsSendingToChatGPT] = useState(false);
  const [chatGPTResponse, setChatGPTResponse] = useState<string | null>(null);
  const [chatGPTError, setChatGPTError] = useState<string | null>(null);

  // Mistral AI Voiceover Script Generator state
  const [showMistralModal, setShowMistralModal] = useState(false);
  const [mistralApiKeyInput, setMistralApiKeyInput] = useState(mistralService.getKey());
  const [selectedMistralModel, setSelectedMistralModel] = useState('ministral-8b-latest');
  const [isGeneratingWithMistral, setIsGeneratingWithMistral] = useState(false);
  const [mistralError, setMistralError] = useState<string | null>(null);
  const [mistralSuccess, setMistralSuccess] = useState<string | null>(null);
  const [showMistralKey, setShowMistralKey] = useState(false);

  // Camera Video Recording Studio with Transparent Teleprompter state
  const [showRecordingStudio, setShowRecordingStudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSpeechDoneListening, setIsSpeechDoneListening] = useState(false);

  // Studio Teleprompter controls
  const [studioPrompterSpeed, setStudioPrompterSpeed] = useState(2);
  const [studioPrompterFontSize, setStudioPrompterFontSize] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 20 : 32
  );
  const [isStudioPrompterScrolling, setIsStudioPrompterScrolling] = useState(false);

  // Lock background scroll when recording studio or modals are open
  useEffect(() => {
    if (showRecordingStudio || showTeleprompter || showChatGPTModal || showMistralModal) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [showRecordingStudio, showTeleprompter, showChatGPTModal, showMistralModal]);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);
  const studioPrompterScrollRef = useRef<HTMLDivElement>(null);

  const prompterScrollRef = useRef<HTMLDivElement>(null);

  // Studio Transparent Teleprompter Auto-Scroll Effect
  useEffect(() => {
    let animId: number;
    if (showRecordingStudio && isStudioPrompterScrolling && studioPrompterScrollRef.current) {
      const scrollStep = () => {
        if (studioPrompterScrollRef.current) {
          studioPrompterScrollRef.current.scrollTop += studioPrompterSpeed * 0.75;
          animId = requestAnimationFrame(scrollStep);
        }
      };
      animId = requestAnimationFrame(scrollStep);
    }
    return () => cancelAnimationFrame(animId);
  }, [showRecordingStudio, isStudioPrompterScrolling, studioPrompterSpeed]);

  // Teleprompter Auto-Scroll Effect
  useEffect(() => {
    let animId: number;
    if (showTeleprompter && isPrompterScrolling && prompterScrollRef.current) {
      const scrollStep = () => {
        if (prompterScrollRef.current) {
          prompterScrollRef.current.scrollTop += prompterSpeed * 0.75;
          animId = requestAnimationFrame(scrollStep);
        }
      };
      animId = requestAnimationFrame(scrollStep);
    }
    return () => cancelAnimationFrame(animId);
  }, [showTeleprompter, isPrompterScrolling, prompterSpeed]);

  const handleCopy = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    setTimeout(() => setCopiedSection(null), 2200);
  };

  const handleFormatChange = (format: ContentFormat) => {
    onUpdateContent({ ...content, format });
  };

  const handleSave = () => {
    onSaveContent(content);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refineInput.trim() || isRefining) return;
    onRefine(refineInput.trim());
    setRefineInput('');
  };

  // Camera & Recording Studio Handlers
  const handleOpenRecordingStudio = async () => {
    setShowRecordingStudio(true);
    setRecordedVideoUrl(null);
    setCameraError(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    setIsStudioPrompterScrolling(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera/Mic permission error:', err);
      setCameraError(
        'Unable to access camera and microphone. Please ensure camera permissions are allowed in your browser.'
      );
    }
  };

  const handleCloseRecordingStudio = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setShowRecordingStudio(false);
    setIsRecording(false);
    setIsStudioPrompterScrolling(false);
    setIsSpeechDoneListening(false);
  };

  const handleStartRecording = () => {
    if (!mediaStreamRef.current) return;
    setRecordedVideoUrl(null);
    chunksRef.current = [];

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }
    }

    try {
      const recorder = mimeType
        ? new MediaRecorder(mediaStreamRef.current, { mimeType })
        : new MediaRecorder(mediaStreamRef.current);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideoUrl(videoUrl);
        setIsRecording(false);
        setIsStudioPrompterScrolling(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsStudioPrompterScrolling(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      startDoneVoiceListener();
    } catch (e: any) {
      console.error('Failed to start MediaRecorder:', e);
      setCameraError('Failed to start video recording: ' + (e as any).message);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setIsStudioPrompterScrolling(false);
    setIsSpeechDoneListening(false);
  };

  const startDoneVoiceListener = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = 'en-US';

      recognizer.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const phrase = event.results[i][0].transcript.toLowerCase();
          if (
            phrase.includes('okay done') ||
            phrase.includes('ok done') ||
            phrase.includes('okay, done') ||
            phrase.includes("i'm done") ||
            phrase.includes('im done') ||
            phrase.includes('done recording')
          ) {
            handleStopRecording();
            break;
          }
        }
      };

      recognizer.onerror = () => {};
      recognizer.start();
      speechRecognitionRef.current = recognizer;
      setIsSpeechDoneListening(true);
    } catch {
      // Speech recognition fallback
    }
  };

  const formatTimer = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Build complete ChatGPT production payload
  const getFullProductionPrompt = (): string => {
    if (content.productionPrompt) {
      return content.productionPrompt;
    }
    return `Generate a high-retention short-form video based on the following voiceover script and visual production framework:

Topic: ${content.topicTitle}
Category: ${content.category}
Target Format: ${content.format.toUpperCase()} (Vertical 9:16)
Estimated Duration: ${content.voiceoverDurationSeconds || 42} seconds (${content.voiceoverWordCount || 135} words)

[INFLUENCER VOICEOVER SCRIPT]:
${content.voiceoverScript}

[SCENE-BY-SCENE VISUAL PRODUCTION TIMESTAMPS & CUES]:
Beginning (0:00 - 0:05 | Hook Frame):
${content.scriptOutline.beginning}

Middle (0:05 - 0:35 | Core Breakdown):
${content.scriptOutline.middle}

Ending (0:35 - 0:45 | Call to Action):
${content.scriptOutline.end}

Output detailed visual prompts, B-roll recommendations from Pexels, and exact prompt parameters for AI video generators (HeyGen, Runway Gen-3, Remotion).`;
  };

  // Send to ChatGPT API directly
  const handleSendToChatGPTApi = async () => {
    setIsSendingToChatGPT(true);
    setChatGPTError(null);
    setChatGPTResponse(null);

    if (userApiKey.trim()) {
      openaiService.saveKey(userApiKey.trim());
    }

    const promptPayload = getFullProductionPrompt();
    const resp = await openaiService.sendToChatGPT(promptPayload, userApiKey);

    setIsSendingToChatGPT(false);
    if (resp.success && resp.result) {
      setChatGPTResponse(resp.result);
    } else {
      setChatGPTError(
        resp.error ||
          'OpenAI key missing. You can paste your OpenAI API key above or click "Open Directly in ChatGPT" below!'
      );
    }
  };

  // 1-Click Launch to ChatGPT Web
  const handleOpenChatGPTWeb = () => {
    const promptPayload = getFullProductionPrompt();
    navigator.clipboard.writeText(promptPayload);
    handleCopy(promptPayload, 'chatgpt-web');
    window.open('https://chatgpt.com/', '_blank');
  };

  // Generate accurate, context-grounded voiceover script via Mistral API
  const handleGenerateWithMistral = async () => {
    setIsGeneratingWithMistral(true);
    setMistralError(null);
    setMistralSuccess(null);

    const cleanKey = mistralApiKeyInput.trim();
    if (cleanKey) {
      mistralService.saveKey(cleanKey);
    }

    try {
      const generated = await mistralService.generateVoiceoverScript({
        topicTitle: content.topicTitle,
        category: content.category,
        format: content.format,
        summary: content.whyTrending,
        userApiKey: cleanKey,
        model: selectedMistralModel,
      });

      onUpdateContent(generated);
      setMistralSuccess(`Voiceover script successfully generated via Mistral AI (${selectedMistralModel})!`);
      setTimeout(() => {
        setShowMistralModal(false);
        setMistralSuccess(null);
      }, 1600);
    } catch (err: any) {
      setMistralError(err.message || 'Failed to generate voiceover script via Mistral API.');
    } finally {
      setIsGeneratingWithMistral(false);
    }
  };

  // Calculate dynamic stats
  const wordCount = content.voiceoverWordCount || content.voiceoverScript?.trim().split(/\s+/).filter(Boolean).length || 135;
  const durationSec = content.voiceoverDurationSeconds || Math.max(30, Math.round((wordCount / 140) * 60));

  return (
    <div className="content-studio-panel">
      {/* Studio Header: Title, Category, Format Pills */}
      <div className="studio-header">
        <div>
          <div className="studio-tag-row">
            <span className="studio-tag">{content.category}</span>
            <WisprFlowBadge className="studio-wispr-badge" />
          </div>
          <h2 className="studio-title">{content.topicTitle}</h2>
          <p className="studio-meta">
            <span>
              <i className="fa-regular fa-clock"></i> ~{durationSec}s Voiceover ({wordCount} words)
            </span>
            <span>•</span>
            <span>
              <i className="fa-solid fa-fire"></i> Best Window: {content.bestPostingWindow}
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="studio-actions">
          <button
            type="button"
            className={`save-content-btn ${isSaved ? 'saved' : ''}`}
            onClick={handleSave}
          >
            <i className={`fa-solid ${isSaved ? 'fa-check' : 'fa-bookmark'}`}></i>
            <span>{isSaved ? 'Saved to Library' : 'Save Content'}</span>
          </button>
        </div>
      </div>

      {/* Active AI Script Generation Banner in Studio */}
      {isGeneratingScript && (
        <div className="studio-generating-bar">
          <div className="studio-generating-left">
            <div className="studio-generating-spinner">
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            </div>
            <div className="studio-generating-info">
              <div className="studio-generating-badge">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span>Mistral AI Active ({generationSeconds}s elapsed)</span>
              </div>
              <h4 className="studio-generating-heading">
                Synthesizing Conversational Voiceover Script...
              </h4>
              <p className="studio-generating-desc">
                Analyzing viral hooks and crafting a spoken teleprompter script tailored for 60-second video recording. Studio will update automatically as soon as generation completes.
              </p>
            </div>
          </div>
          <div className="studio-generating-right">
            <span className="studio-live-pulse-badge">
              <span className="pulsing-amber-dot"></span> Generating Live
            </span>
          </div>
        </div>
      )}

      {/* Format Selector Pills */}
      <div className="format-toggle-bar">
        <span className="toggle-label">Target Format:</span>
        <button
          type="button"
          className={`format-pill ${content.format === 'shorts' ? 'active' : ''}`}
          onClick={() => handleFormatChange('shorts')}
        >
          <i className="fa-brands fa-youtube"></i> YouTube Shorts
        </button>
        <button
          type="button"
          className={`format-pill ${content.format === 'reels' ? 'active' : ''}`}
          onClick={() => handleFormatChange('reels')}
        >
          <i className="fa-brands fa-instagram"></i> Instagram Reels
        </button>
        <button
          type="button"
          className={`format-pill ${content.format === 'linkedin' ? 'active' : ''}`}
          onClick={() => handleFormatChange('linkedin')}
        >
          <i className="fa-brands fa-linkedin"></i> LinkedIn Post
        </button>
      </div>

      {/* Main Content Workspace Layout */}
      <div className="studio-body-grid">
        {/* Left Column: Hook Variations, Influencer Voiceover Script, & Next Button */}
        <div className="studio-main-col">
          {/* Hook Variations Section */}
          <div className="studio-card hook-card">
            <div className="card-top-row">
              <div className="card-heading">
                <i className="fa-solid fa-bolt-lightning"></i>
                <h3>3-Second Hook Variations</h3>
              </div>
              <button
                type="button"
                className="copy-btn"
                onClick={() => handleCopy(content.hooks[activeHookTab], 'hook')}
              >
                <i className={`fa-regular ${copiedSection === 'hook' ? 'fa-circle-check' : 'fa-copy'}`}></i>
                <span>{copiedSection === 'hook' ? 'Copied' : 'Copy Hook'}</span>
              </button>
            </div>

            {/* Hook Archetype Tabs */}
            <div className="hook-archetype-tabs">
              <button
                type="button"
                className={`hook-tab ${activeHookTab === 'curiosity' ? 'active' : ''}`}
                onClick={() => setActiveHookTab('curiosity')}
              >
                <i className="fa-solid fa-circle-question"></i> Curiosity Gap
              </button>
              <button
                type="button"
                className={`hook-tab ${activeHookTab === 'contrarian' ? 'active' : ''}`}
                onClick={() => setActiveHookTab('contrarian')}
              >
                <i className="fa-solid fa-fire-flame-curved"></i> Contrarian Hot Take
              </button>
              <button
                type="button"
                className={`hook-tab ${activeHookTab === 'story' ? 'active' : ''}`}
                onClick={() => setActiveHookTab('story')}
              >
                <i className="fa-solid fa-book-open"></i> Story / Problem-First
              </button>
            </div>

            {/* Editable Selected Hook Text */}
            <div className="hook-display-box">
              <textarea
                className="hook-textarea"
                rows={2}
                value={content.hooks[activeHookTab]}
                onChange={(e) => {
                  const updatedHooks = { ...content.hooks, [activeHookTab]: e.target.value };
                  onUpdateContent({ ...content, hooks: updatedHooks });
                }}
              />
            </div>
          </div>

          {/* Format View: LinkedIn Post OR Influencer Voiceover Script */}
          {content.format === 'linkedin' ? (
            <div className="studio-card">
              <div className="card-top-row">
                <div className="card-heading">
                  <i className="fa-brands fa-linkedin"></i>
                  <h3>Full LinkedIn Post</h3>
                </div>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => handleCopy(content.linkedInPost || '', 'linkedin')}
                >
                  <i className={`fa-regular ${copiedSection === 'linkedin' ? 'fa-circle-check' : 'fa-copy'}`}></i>
                  <span>{copiedSection === 'linkedin' ? 'Copied' : 'Copy Post'}</span>
                </button>
              </div>
              <textarea
                className="post-textarea"
                rows={12}
                value={cleanSpokenText(content.linkedInPost || '')}
                onChange={(e) => onUpdateContent({ ...content, linkedInPost: e.target.value })}
              />
            </div>
          ) : (
            /* Primary Influencer Voiceover Script Card */
            <div className="studio-card voiceover-card">
              <div className="card-top-row">
                <div className="card-heading">
                  <i className="fa-solid fa-microphone-lines"></i>
                  <h3>Influencer Voiceover Script</h3>
                  <WisprFlowBadge className="studio-wispr-badge" />
                  <div className="voiceover-meta-badges">
                    <span className="stat-pill">
                      <i className="fa-regular fa-clock"></i> ~{durationSec}s
                    </span>
                    <span className="stat-pill">
                      <i className="fa-solid fa-align-left"></i> {wordCount} words
                    </span>
                    {isGeneratingScript ? (
                      <span className="stat-pill mistral-ai-pill generating">
                        <i className="fa-solid fa-circle-notch fa-spin"></i> Mistral AI Generating ({generationSeconds}s)...
                      </span>
                    ) : content.isMistralGenerated ? (
                      <span className="stat-pill mistral-ai-pill" title={`Generated using Mistral AI (${content.modelUsed || 'mistral-small-latest'})`}>
                        <i className="fa-solid fa-brain"></i> Mistral AI
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Voiceover Action Buttons: Cleaned of extra audio and modal buttons */}
                <div className="voiceover-actions-bar">
                  <button
                    type="button"
                    className="teleprompter-launch-btn"
                    onClick={() => setShowTeleprompter(true)}
                    title="Launch Fullscreen Teleprompter"
                  >
                    <i className="fa-solid fa-tv"></i>
                    <span>Teleprompter</span>
                  </button>

                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopy(cleanSpokenText(content.voiceoverScript), 'voiceover')}
                  >
                    <i className={`fa-regular ${copiedSection === 'voiceover' ? 'fa-circle-check' : 'fa-copy'}`}></i>
                    <span>{copiedSection === 'voiceover' ? 'Copied' : 'Copy Voiceover'}</span>
                  </button>
                </div>
              </div>

              {/* Word-for-Word Spoken Script Textarea */}
              <div className="voiceover-content-wrap">
                {isGeneratingScript && !content.voiceoverScript ? (
                  <div className="voiceover-generating-skeleton-card">
                    <div className="skeleton-status-header">
                      <div className="skeleton-spinner">
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                      </div>
                      <div className="skeleton-header-text">
                        <strong>Mistral AI is drafting your word-for-word spoken script...</strong>
                        <span className="skeleton-timer-chip">
                          <i className="fa-solid fa-stopwatch"></i> {generationSeconds}s elapsed
                        </span>
                      </div>
                    </div>
                    <div className="skeleton-bars-container">
                      <div className="skeleton-bar line-1"></div>
                      <div className="skeleton-bar line-2"></div>
                      <div className="skeleton-bar line-3"></div>
                      <div className="skeleton-bar line-4"></div>
                    </div>
                    <div className="skeleton-steps-indicators">
                      <span className={`skeleton-step ${generationSeconds >= 1 ? 'done' : 'current'}`}>
                        <i className="fa-solid fa-check"></i> Outlier Analysis
                      </span>
                      <span className={`skeleton-step ${generationSeconds >= 4 ? (generationSeconds >= 8 ? 'done' : 'current') : ''}`}>
                        <i className="fa-solid fa-brain"></i> Mistral Spoken Cadence
                      </span>
                      <span className={`skeleton-step ${generationSeconds >= 8 ? 'current' : ''}`}>
                        <i className="fa-solid fa-tv"></i> Teleprompter Pacing
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {isGeneratingScript && (
                      <div className="voiceover-generating-status-banner">
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <span>Mistral AI is actively refining your voiceover script ({generationSeconds}s elapsed)...</span>
                      </div>
                    )}
                    <textarea
                      className={`voiceover-textarea ${isGeneratingScript ? 'generating-shimmer' : ''}`}
                      rows={8}
                      value={cleanSpokenText(content.voiceoverScript)}
                      placeholder="Your word-for-word spoken teleprompter script..."
                      onChange={(e) => {
                        const newScript = e.target.value;
                        const wCount = newScript.trim().split(/\s+/).filter(Boolean).length;
                        const dSec = Math.max(25, Math.round((wCount / 140) * 60));
                        onUpdateContent({
                          ...content,
                          voiceoverScript: newScript,
                          voiceoverWordCount: wCount,
                          voiceoverDurationSeconds: dSec,
                        });
                      }}
                    />
                  </>
                )}
              </div>

              {/* Collapsed/Hidden Technical Production Script Accordion */}
              <div className="technical-prompt-accordion">
                <button
                  type="button"
                  className="accordion-toggle-btn"
                  onClick={() => setShowTechnicalPrompt(!showTechnicalPrompt)}
                  aria-expanded={showTechnicalPrompt}
                >
                  <div className="accordion-toggle-left">
                    <i className="fa-solid fa-code"></i>
                    <span>AI Video Production Prompt & Scene Timestamps (ChatGPT Payload)</span>
                  </div>
                  <div className="accordion-toggle-right">
                    <span className="hidden-pill">{showTechnicalPrompt ? 'Hide' : 'Hidden from Influencer'}</span>
                    <i className={`fa-solid ${showTechnicalPrompt ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                  </div>
                </button>

                {showTechnicalPrompt && (
                  <div className="technical-prompt-body">
                    <p className="technical-note">
                      <i className="fa-solid fa-circle-info"></i> This technical outline with timestamps and visual B-roll cues is sent to ChatGPT and AI video generation tools.
                    </p>

                    <div className="script-sections-stack">
                      <div className="script-part">
                        <span className="part-label">Beginning (0:00 - 0:05) Hook Frame</span>
                        <textarea
                          rows={2}
                          value={content.scriptOutline.beginning}
                          onChange={(e) => {
                            const updated = { ...content.scriptOutline, beginning: e.target.value };
                            onUpdateContent({ ...content, scriptOutline: updated });
                          }}
                        />
                      </div>
                      <div className="script-part">
                        <span className="part-label">Middle (0:05 - 0:35) Core Breakdown & Visual Cues</span>
                        <textarea
                          rows={4}
                          value={content.scriptOutline.middle}
                          onChange={(e) => {
                            const updated = { ...content.scriptOutline, middle: e.target.value };
                            onUpdateContent({ ...content, scriptOutline: updated });
                          }}
                        />
                      </div>
                      <div className="script-part">
                        <span className="part-label">End (0:35 - 0:45) Actionable Conclusion & CTA</span>
                        <textarea
                          rows={2}
                          value={content.scriptOutline.end}
                          onChange={(e) => {
                            const updated = { ...content.scriptOutline, end: e.target.value };
                            onUpdateContent({ ...content, scriptOutline: updated });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Record Video & Send to ChatGPT & AI Video Pipeline */}
              <div className="next-action-container">
                <div className="action-buttons-row">
                  {/* Record Video Button */}
                  <button
                    type="button"
                    className="record-video-cta-btn"
                    onClick={handleOpenRecordingStudio}
                    title="Open camera and record with transparent teleprompter overlay"
                  >
                    <div className="btn-icon-wrap rec-icon-wrap">
                      <i className="fa-solid fa-video"></i>
                    </div>
                    <div className="btn-text-wrap">
                      <span className="btn-main-label">
                        Record Video
                      </span>
                      <span className="btn-sub-label">
                        Camera access with transparent teleprompter
                      </span>
                    </div>
                    <div className="btn-icon-wrap rec-indicator-wrap">
                      <i className="fa-solid fa-circle-dot rec-pulse-dot"></i>
                    </div>
                  </button>

                  {/* Send to ChatGPT & AI Video Pipeline Button */}
                  <button
                    type="button"
                    className="next-chatgpt-cta-btn"
                    onClick={() => setShowChatGPTModal(true)}
                    title="Send technical framework to ChatGPT & AI video tools"
                  >
                    <div className="btn-icon-wrap">
                      <i className="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <div className="btn-text-wrap">
                      <span className="btn-main-label">
                        Send to ChatGPT & AI Video Pipeline
                      </span>
                      <span className="btn-sub-label">
                        OpenAI API generation & AI video studio
                      </span>
                    </div>
                    <div className="btn-icon-wrap">
                      <i className="fa-solid fa-arrow-right"></i>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Captions, Hashtags, and AI Voice Refinement */}
        <div className="studio-side-col">
          {/* Captions & Hashtags */}
          <div className="studio-card">
            <div className="card-top-row">
              <div className="card-heading">
                <i className="fa-solid fa-hashtag"></i>
                <h3>Caption & Search Tags</h3>
              </div>
              <button
                type="button"
                className="copy-btn"
                onClick={() => handleCopy(`${content.caption}\n\n${content.hashtags.join(' ')}`, 'caption')}
              >
                <i className={`fa-regular ${copiedSection === 'caption' ? 'fa-circle-check' : 'fa-copy'}`}></i>
                <span>{copiedSection === 'caption' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              className="caption-textarea"
              rows={3}
              value={content.caption}
              onChange={(e) => onUpdateContent({ ...content, caption: e.target.value })}
            />
            <div className="hashtags-list">
              {content.hashtags.map((tag, idx) => (
                <span key={idx} className="hashtag-chip">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* AI Refinement Box */}
          <div className="studio-card refinement-card">
            <div className="card-heading">
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              <h3>Refine with Voice or Prompt</h3>
            </div>
            <p className="refine-helper-text">
              Speak or type how you want to adjust this content (e.g. "make hook punchier", "shorten script", "add stronger CTA"):
            </p>
            <form onSubmit={handleRefineSubmit} className="refine-input-row">
              <input
                type="text"
                placeholder="Ask AI to refine this piece..."
                value={refineInput}
                onChange={(e) => setRefineInput(e.target.value)}
                disabled={isRefining}
              />
              <button type="submit" disabled={!refineInput.trim() || isRefining} className="refine-submit-btn">
                {isRefining ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-arrow-right"></i>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* --- MODAL: ChatGPT & AI Video Pipeline --- */}
      {showChatGPTModal &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setShowChatGPTModal(false)}>
            <div className="chatgpt-modal-container" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="chatgpt-modal-header">
                <div className="modal-title-wrap">
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                  <div>
                    <h3>Send to ChatGPT & AI Video Pipeline</h3>
                    <p>Process your voiceover and visual cues via OpenAI API or automated video engines</p>
                  </div>
                </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowChatGPTModal(false)}
                title="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="modal-tabs-row">
              <button
                type="button"
                className={`modal-tab ${activeModalTab === 'chatgpt' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('chatgpt')}
              >
                <i className="fa-solid fa-bolt"></i> Send to ChatGPT (API & Web)
              </button>
              <button
                type="button"
                className={`modal-tab ${activeModalTab === 'video-architecture' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('video-architecture')}
              >
                <i className="fa-solid fa-video"></i> Can ChatGPT Create Videos via API?
              </button>
            </div>

            {/* Modal Body */}
            <div className="chatgpt-modal-body">
              {activeModalTab === 'chatgpt' ? (
                <div className="chatgpt-dispatch-view">
                  {/* API Key Input Row */}
                  <div className="api-key-config-box">
                    <label htmlFor="openai-key">
                      <i className="fa-solid fa-key"></i> OpenAI API Key (Optional for in-app API execution):
                    </label>
                    <div className="api-key-input-row">
                      <input
                        id="openai-key"
                        type="password"
                        placeholder="sk-proj-..."
                        value={userApiKey}
                        onChange={(e) => setUserApiKey(e.target.value)}
                      />
                      <button
                        type="button"
                        className="execute-api-btn"
                        onClick={handleSendToChatGPTApi}
                        disabled={isSendingToChatGPT}
                      >
                        {isSendingToChatGPT ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin"></i> Processing...
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-paper-plane"></i> Send to ChatGPT API
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 1-Click Launch Directly in ChatGPT (chatgpt.com) */}
                  <div className="chatgpt-web-launch-card">
                    <div className="launch-card-left">
                      <div className="web-icon-badge">
                        <i className="fa-solid fa-up-right-from-square"></i>
                      </div>
                      <div>
                        <h4>Open Directly in ChatGPT (chatgpt.com)</h4>
                        <p>1-Click action: Automatically copies the entire production script and opens ChatGPT in a new tab.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="launch-web-btn"
                      onClick={handleOpenChatGPTWeb}
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square"></i>
                      <span>{copiedSection === 'chatgpt-web' ? 'Copied & Opening!' : 'Copy & Open ChatGPT'}</span>
                    </button>
                  </div>

                  {/* ChatGPT Response / Error Display */}
                  {chatGPTError && (
                    <div className="chatgpt-error-banner">
                      <i className="fa-solid fa-circle-exclamation"></i>
                      <span>{chatGPTError}</span>
                    </div>
                  )}

                  {chatGPTResponse && (
                    <div className="chatgpt-response-card">
                      <div className="response-header">
                        <span className="response-badge">
                          <i className="fa-solid fa-check"></i> Response from ChatGPT
                        </span>
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={() => handleCopy(chatGPTResponse, 'chatgpt-resp')}
                        >
                          <i className={`fa-regular ${copiedSection === 'chatgpt-resp' ? 'fa-circle-check' : 'fa-copy'}`}></i>
                          <span>{copiedSection === 'chatgpt-resp' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="response-text">{chatGPTResponse}</pre>
                    </div>
                  )}

                  {/* Prompt Payload Preview */}
                  <div className="prompt-preview-card">
                    <div className="prompt-preview-header">
                      <span>Payload sent to ChatGPT:</span>
                      <button
                        type="button"
                        className="copy-btn"
                        onClick={() => handleCopy(getFullProductionPrompt(), 'payload')}
                      >
                        <i className={`fa-regular ${copiedSection === 'payload' ? 'fa-circle-check' : 'fa-copy'}`}></i>
                        <span>{copiedSection === 'payload' ? 'Copied' : 'Copy Payload'}</span>
                      </button>
                    </div>
                    <pre className="prompt-preview-code">{getFullProductionPrompt()}</pre>
                  </div>
                </div>
              ) : (
                /* Educational / Architectural Answer to User's Question */
                <div className="video-architecture-view">
                  <div className="architecture-callout-box">
                    <div className="callout-icon">
                      <i className="fa-solid fa-circle-question"></i>
                    </div>
                    <div>
                      <h4>Can ChatGPT Create Videos via API on Our Website?</h4>
                      <p>
                        <strong>Short Answer:</strong> <strong>No, ChatGPT itself cannot directly output MP4 video files via public API.</strong>
                        OpenAI models (like GPT-4o) generate text, scene descriptions, and speech audio (TTS), while OpenAI's video model (Sora) is currently in closed preview without an open public API.
                      </p>
                    </div>
                  </div>

                  <h4 className="pipeline-title">
                    <i className="fa-solid fa-layer-group"></i> How Modern Websites Generate Videos from Scripts (The 3-Layer Pipeline):
                  </h4>

                  <div className="pipeline-steps-grid">
                    {/* Layer 1 */}
                    <div className="pipeline-step-card">
                      <div className="step-number">Step 1</div>
                      <div className="step-header">
                        <i className="fa-solid fa-brain"></i>
                        <h5>Script & Visual Director</h5>
                      </div>
                      <span className="step-tool">Powered by ChatGPT API</span>
                      <p>Generates the voiceover script, pacing timestamps, and scene visual prompts (which we already built!).</p>
                    </div>

                    {/* Layer 2 */}
                    <div className="pipeline-step-card">
                      <div className="step-number">Step 2</div>
                      <div className="step-header">
                        <i className="fa-solid fa-microphone"></i>
                        <h5>Audio & Speech</h5>
                      </div>
                      <span className="step-tool">OpenAI Audio API / ElevenLabs</span>
                      <p>Takes the voiceover script and converts it into studio-grade human speech in 2 seconds ($0.015 / 1,000 chars).</p>
                    </div>

                    {/* Layer 3 */}
                    <div className="pipeline-step-card">
                      <div className="step-number">Step 3</div>
                      <div className="step-header">
                        <i className="fa-solid fa-clapperboard"></i>
                        <h5>Automated Video Engine</h5>
                      </div>
                      <span className="step-tool">HeyGen / Remotion / Creatomate</span>
                      <p>Takes the audio + ChatGPT scene prompts and auto-stitches stock 4K B-roll, AI talking avatars, and kinetic viral captions into an MP4!</p>
                    </div>
                  </div>

                  {/* Implementation Options */}
                  <div className="video-options-table-wrap">
                    <h5>Top 3 Video APIs to connect with our website:</h5>
                    <div className="options-grid">
                      <div className="option-item">
                        <span className="option-name">
                          <i className="fa-solid fa-user-tie"></i> HeyGen API / D-ID API
                        </span>
                        <p>Best for <strong>AI Avatar Videos</strong>: An AI digital human influencer speaks your voiceover script realistically on camera.</p>
                      </div>
                      <div className="option-item">
                        <span className="option-name">
                          <i className="fa-solid fa-film"></i> Creatomate API / Remotion
                        </span>
                        <p>Best for <strong>Faceless Shorts & Reels</strong>: Automatically stitches 4K stock video from Pexels, kinetic word-by-word captions, and background music.</p>
                      </div>
                      <div className="option-item">
                        <span className="option-name">
                          <i className="fa-solid fa-wand-magic"></i> Runway Gen-3 API / Luma
                        </span>
                        <p>Best for <strong>Generative AI Video</strong>: Generates realistic cinematic AI scenes from ChatGPT's visual prompts.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- TELEPROMPTER FULLSCREEN OVERLAY --- */}
      {showTeleprompter &&
        createPortal(
          <div className="teleprompter-overlay">
            {/* Prompter Controls Header */}
            <div className="teleprompter-controls-bar">
              <div className="prompter-title-info">
                <span className="prompter-badge">TELEPROMPTER MODE</span>
                <h4>{content.topicTitle}</h4>
              </div>

            <div className="prompter-buttons-group">
              <button
                type="button"
                className="prompter-btn play-pause-btn"
                onClick={() => setIsPrompterScrolling(!isPrompterScrolling)}
              >
                <i className={`fa-solid ${isPrompterScrolling ? 'fa-pause' : 'fa-play'}`}></i>
                <span>{isPrompterScrolling ? 'Pause' : 'Play'}</span>
              </button>

              {/* Speed Controller */}
              <div className="prompter-speed-control">
                <span className="ctrl-label">Speed:</span>
                <button
                  type="button"
                  className="speed-chip"
                  onClick={() => setPrompterSpeed((prev) => Math.max(1, prev - 0.5))}
                >
                  -
                </button>
                <span className="speed-val">{prompterSpeed}x</span>
                <button
                  type="button"
                  className="speed-chip"
                  onClick={() => setPrompterSpeed((prev) => Math.min(5, prev + 0.5))}
                >
                  +
                </button>
              </div>

              {/* Font Size Controller */}
              <div className="prompter-font-control">
                <span className="ctrl-label">Font:</span>
                <button
                  type="button"
                  className="speed-chip"
                  onClick={() => setPrompterFontSize((prev) => Math.max(16, prev - 3))}
                >
                  A-
                </button>
                <button
                  type="button"
                  className="speed-chip"
                  onClick={() => setPrompterFontSize((prev) => Math.min(64, prev + 3))}
                >
                  A+
                </button>
              </div>

              <button
                type="button"
                className="prompter-btn close-prompter-btn"
                onClick={() => setShowTeleprompter(false)}
              >
                <i className="fa-solid fa-xmark"></i>
                <span>Exit</span>
              </button>
            </div>
          </div>

          {/* Reading Focus Guidelines */}
          <div className="prompter-reading-guide-line"></div>

          {/* Scrolling Text Viewport */}
          <div className="teleprompter-viewport" ref={prompterScrollRef}>
            <div className="teleprompter-text-container" style={{ fontSize: `${prompterFontSize}px` }}>
              <div className="teleprompter-lead-space"></div>
              {cleanSpokenText(content.voiceoverScript).split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="prompter-paragraph">
                  {paragraph}
                </p>
              ))}
              <div className="teleprompter-end-space">
                <span>END OF SCRIPT</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- CAMERA RECORDING STUDIO WITH TRANSPARENT TELEPROMPTER --- */}
      {showRecordingStudio &&
        createPortal(
          <div className="recording-studio-modal">
            {recordedVideoUrl ? (
              /* --- PLAYBACK REVIEW VIEW (When recording has completed) --- */
              <div className="playback-review-container">
              <div className="review-header">
                <div className="review-title">
                  <i className="fa-solid fa-circle-check"></i>
                  <div>
                    <h3>Recording Ready for Review</h3>
                    <p>Total Duration: {formatTimer(recordingSeconds)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="close-review-btn"
                  onClick={handleCloseRecordingStudio}
                  title="Close Studio"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <video
                src={recordedVideoUrl}
                controls
                autoPlay
                playsInline
                className="recorded-video-player"
              />

              {/* Strict Privacy Guarantee: No database upload */}
              <div className="privacy-local-badge">
                <i className="fa-solid fa-shield-halved"></i>
                <span>100% Client-Side Privacy: Video is stored locally in browser memory only. No video of the user is uploaded to the database or external servers.</span>
              </div>

              <div className="playback-actions-row">
                <a
                  href={recordedVideoUrl}
                  download={`${content.topicTitle.replace(/[^a-zA-Z0-9]/g, '_')}_take.webm`}
                  className="download-btn"
                >
                  <i className="fa-solid fa-download"></i>
                  <span>Download Video (.webm)</span>
                </a>

                <button
                  type="button"
                  className="rerecord-action-btn"
                  onClick={() => {
                    setRecordedVideoUrl(null);
                    setIsRecording(false);
                    setRecordingSeconds(0);
                    handleOpenRecordingStudio();
                  }}
                >
                  <i className="fa-solid fa-arrow-rotate-left"></i>
                  <span>Re-record Video</span>
                </button>

                <button
                  type="button"
                  className="finish-btn"
                  onClick={handleCloseRecordingStudio}
                >
                  <i className="fa-solid fa-check"></i>
                  <span>Return to Studio</span>
                </button>
              </div>
            </div>
          ) : (
            /* --- LIVE CAMERA & TRANSPARENT TELEPROMPTER VIEW --- */
            <div className="recording-camera-wrapper">
              {/* Fullscreen Live Camera View */}
              <video
                ref={liveVideoRef}
                autoPlay
                playsInline
                muted
                className="recording-camera-feed"
              />

              {cameraError && (
                <div className="camera-error-banner">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Transparent Teleprompter Overlay */}
              <div className="transparent-teleprompter-overlay">
                {/* Floating Top Controls Header */}
                <div className="prompter-top-controls">
                  <div className="studio-status-wrap">
                    {isRecording ? (
                      <div className="rec-live-badge">
                        <i className="fa-solid fa-circle-dot rec-pulse-dot"></i>
                        <span>REC {formatTimer(recordingSeconds)}</span>
                      </div>
                    ) : (
                      <div className="rec-standby-badge">
                        <i className="fa-solid fa-video"></i>
                        <span>CAMERA STANDBY</span>
                      </div>
                    )}
                    <span className="studio-topic-name">{content.topicTitle}</span>
                  </div>

                  {/* Prompter Controls: Speed, Font Size, Pause/Resume, Close */}
                  <div className="prompter-buttons-group">
                    <button
                      type="button"
                      className="prompter-btn"
                      onClick={() => setIsStudioPrompterScrolling(!isStudioPrompterScrolling)}
                      title="Pause or Resume Auto-Scroll"
                    >
                      <i className={`fa-solid ${isStudioPrompterScrolling ? 'fa-pause' : 'fa-play'}`}></i>
                      <span>{isStudioPrompterScrolling ? 'Pause' : 'Scroll'}</span>
                    </button>

                    {/* Speed Controls */}
                    <div className="prompter-speed-control">
                      <span className="ctrl-label">Speed:</span>
                      <button
                        type="button"
                        className="speed-chip"
                        onClick={() => setStudioPrompterSpeed((prev) => Math.max(1, prev - 0.5))}
                      >
                        -
                      </button>
                      <span className="speed-val">{studioPrompterSpeed}x</span>
                      <button
                        type="button"
                        className="speed-chip"
                        onClick={() => setStudioPrompterSpeed((prev) => Math.min(5, prev + 0.5))}
                      >
                        +
                      </button>
                    </div>

                    {/* Font Size Controls */}
                    <div className="prompter-font-control">
                      <span className="ctrl-label">Font:</span>
                      <button
                        type="button"
                        className="speed-chip"
                        onClick={() => setStudioPrompterFontSize((prev) => Math.max(14, prev - 3))}
                      >
                        A-
                      </button>
                      <button
                        type="button"
                        className="speed-chip"
                        onClick={() => setStudioPrompterFontSize((prev) => Math.min(56, prev + 3))}
                      >
                        A+
                      </button>
                    </div>

                    <button
                      type="button"
                      className="prompter-btn close-prompter-btn"
                      onClick={handleCloseRecordingStudio}
                      title="Exit Camera Studio"
                    >
                      <i className="fa-solid fa-xmark"></i>
                      <span>Exit</span>
                    </button>
                  </div>
                </div>

                {/* Subtle Eye-line Focus Guide */}
                <div className="prompter-reading-guide-line"></div>

                {/* Transparent Scrolling Text Viewport: Completely transparent so creator sees their video behind every word */}
                <div className="transparent-prompter-viewport" ref={studioPrompterScrollRef}>
                  <div
                    className="transparent-text-container"
                    style={{ fontSize: `${studioPrompterFontSize}px` }}
                  >
                    <div className="transparent-prompter-lead"></div>
                    {cleanSpokenText(content.voiceoverScript).split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="prompter-paragraph-live">
                        {paragraph}
                      </p>
                    ))}
                    <div className="teleprompter-end-space">
                      <span>END OF SCRIPT</span>
                    </div>
                  </div>
                </div>

                {/* Floating Bottom Recording Controls */}
                <div className="prompter-bottom-controls">
                  {!isRecording ? (
                    <button
                      type="button"
                      className="rec-btn-start"
                      onClick={handleStartRecording}
                    >
                      <i className="fa-solid fa-circle"></i>
                      <span>Start Recording</span>
                    </button>
                  ) : (
                    <div className="rec-active-controls">
                      <button
                        type="button"
                        className="rec-btn-done"
                        onClick={handleStopRecording}
                        title="Finish recording and view your video"
                      >
                        <i className="fa-solid fa-circle-check"></i>
                        <span>Okay, Done (Stop Recording)</span>
                      </button>
                      <span className={`voice-done-indicator ${isSpeechDoneListening ? 'listening' : ''}`}>
                        <i className={`fa-solid ${isSpeechDoneListening ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
                        Say "Okay, done" to auto-stop
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Mistral AI Script Generation Modal */}
      {showMistralModal && createPortal(
        <div
          className="chatgpt-pipeline-modal-backdrop"
          onClick={() => !isGeneratingWithMistral && setShowMistralModal(false)}
        >
          <div
            className="chatgpt-pipeline-modal mistral-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="modal-top-bar">
              <div className="modal-headline">
                <i className="fa-solid fa-brain mistral-glow-icon"></i>
                <div>
                  <h3 className="modal-title">Mistral AI Voiceover Generator</h3>
                  <span className="modal-subtitle">Generate 100% accurate, topic-grounded voiceover scripts via Mistral AI</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => !isGeneratingWithMistral && setShowMistralModal(false)}
                disabled={isGeneratingWithMistral}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Body */}
            <div className="modal-body-scroll">
              {/* Status Banner */}
              <div className={`mistral-status-banner ${mistralService.isConfigured() || mistralApiKeyInput.trim() ? 'configured' : 'unconfigured'}`}>
                <i className={`fa-solid ${mistralService.isConfigured() || mistralApiKeyInput.trim() ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
                <div>
                  <strong>
                    {mistralService.isConfigured() || mistralApiKeyInput.trim()
                      ? 'Mistral API Ready'
                      : 'Mistral API Key Required'}
                  </strong>
                  <p>
                    {mistralService.isConfigured() || mistralApiKeyInput.trim()
                      ? 'Connected to Mistral AI via Supabase Edge Function. Your script will be generated specifically for your selected topic.'
                      : 'Please paste your Mistral API key below to unlock real-time, topic-accurate voiceover scripts.'}
                  </p>
                </div>
              </div>

              {/* Target Topic Info */}
              <div className="mistral-topic-box">
                <span className="topic-box-label">Target Topic:</span>
                <h4 className="topic-box-title">{content.topicTitle}</h4>
                <div className="topic-box-meta">
                  <span className="meta-badge"><i className="fa-solid fa-folder"></i> {content.category}</span>
                  <span className="meta-badge"><i className="fa-solid fa-video"></i> {content.format.toUpperCase()}</span>
                </div>
              </div>

              {/* API Key Input */}
              <div className="api-key-input-card">
                <label className="api-key-label" htmlFor="mistral-key-input">
                  <i className="fa-solid fa-key"></i> Mistral API Key:
                </label>
                <div className="api-key-row">
                  <div className="api-key-input-wrap">
                    <input
                      id="mistral-key-input"
                      type={showMistralKey ? 'text' : 'password'}
                      className="api-key-text-input"
                      placeholder="Paste your Mistral API key here..."
                      value={mistralApiKeyInput}
                      onChange={(e) => setMistralApiKeyInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className="toggle-pw-btn"
                      onClick={() => setShowMistralKey(!showMistralKey)}
                      title={showMistralKey ? 'Hide key' : 'Show key'}
                    >
                      <i className={`fa-regular ${showMistralKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {mistralApiKeyInput.trim() && (
                    <button
                      type="button"
                      className="save-key-btn"
                      onClick={() => {
                        mistralService.saveKey(mistralApiKeyInput.trim());
                        setMistralSuccess('Key saved to local browser storage & Edge Function session.');
                        setTimeout(() => setMistralSuccess(null), 2500);
                      }}
                    >
                      <i className="fa-solid fa-floppy-disk"></i> Save Key
                    </button>
                  )}
                </div>
                <span className="api-key-help-hint">
                  Your key is securely stored in your browser's local storage and used directly for script generation.
                </span>
              </div>

              {/* Model Selection */}
              <div className="mistral-model-select-wrap">
                <label className="model-label">
                  <i className="fa-solid fa-microchip"></i> Mistral Model:
                </label>
                <div className="mistral-model-pills">
                  <button
                    type="button"
                    className={`model-pill ${selectedMistralModel === 'ministral-8b-latest' ? 'active' : ''}`}
                    onClick={() => setSelectedMistralModel('ministral-8b-latest')}
                  >
                    <strong>ministral-8b-latest</strong>
                    <span>(Recommended • High Retention & Fast Response)</span>
                  </button>
                  <button
                    type="button"
                    className={`model-pill ${selectedMistralModel === 'ministral-3b-latest' ? 'active' : ''}`}
                    onClick={() => setSelectedMistralModel('ministral-3b-latest')}
                  >
                    <strong>ministral-3b-latest</strong>
                    <span>(Ultra Lightweight • Instant Generation)</span>
                  </button>
                  <button
                    type="button"
                    className={`model-pill ${selectedMistralModel === 'mistral-small-latest' ? 'active' : ''}`}
                    onClick={() => setSelectedMistralModel('mistral-small-latest')}
                  >
                    <strong>mistral-small-latest</strong>
                    <span>(Standard Production)</span>
                  </button>
                  <button
                    type="button"
                    className={`model-pill ${selectedMistralModel === 'mistral-large-latest' ? 'active' : ''}`}
                    onClick={() => setSelectedMistralModel('mistral-large-latest')}
                  >
                    <strong>mistral-large-latest</strong>
                    <span>(Maximum Reasoning & Deep Context)</span>
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {mistralError && (
                <div className="pipeline-error-box">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{mistralError}</span>
                </div>
              )}

              {/* Success Alert */}
              {mistralSuccess && (
                <div className="pipeline-success-box">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>{mistralSuccess}</span>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="modal-bottom-actions">
              <button
                type="button"
                className="modal-secondary-btn"
                onClick={() => !isGeneratingWithMistral && setShowMistralModal(false)}
                disabled={isGeneratingWithMistral}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-primary-btn mistral-run-btn"
                onClick={handleGenerateWithMistral}
                disabled={isGeneratingWithMistral || (!mistralApiKeyInput.trim() && !mistralService.isConfigured())}
              >
                {isGeneratingWithMistral ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Mistral AI Generating Script...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                    <span>Generate Voiceover Script Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
