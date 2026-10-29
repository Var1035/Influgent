/**
 * Browser-native Web Speech API wrapper for Voice Commands.
 * Does not depend on external APIs (e.g., Wispr Flow) and exposes no keys.
 */

// Declare Web Speech API types for TypeScript
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class VoiceRecognitionService {
  private recognition: any = null;
  private isListening = false;
  private isSupportedBrowser = false;

  public onTranscript?: (text: string, isFinal: boolean) => void;
  public onError?: (error: string, code?: string) => void;
  public onStateChange?: (state: 'idle' | 'listening' | 'processing' | 'error') => void;

  constructor() {
    const win = typeof window !== 'undefined' ? (window as unknown as IWindow) : null;
    if (win) {
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        this.isSupportedBrowser = true;
        try {
          this.recognition = new SpeechRecognitionClass();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = 'en-US';

          this.recognition.onstart = () => {
            this.isListening = true;
            this.onStateChange?.('listening');
          };

          this.recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript;
              } else {
                interimTranscript += transcript;
              }
            }

            const current = (finalTranscript || interimTranscript).trim();
            if (current) {
              this.onTranscript?.(current, Boolean(finalTranscript));
            }
          };

          this.recognition.onerror = (event: any) => {
            let errorMsg = 'Voice recognition error occurred.';
            const errCode = event.error;

            if (errCode === 'not-allowed' || errCode === 'permission-denied') {
              errorMsg = 'Microphone permission was denied. Please allow microphone access in your browser.';
            } else if (errCode === 'no-speech') {
              errorMsg = 'No speech was detected. Please try speaking again.';
            } else if (errCode === 'audio-capture') {
              errorMsg = 'No microphone was found. Please ensure your microphone is plugged in.';
            } else if (errCode === 'network') {
              errorMsg = 'Network error during speech recognition.';
            }

            this.onStateChange?.('error');
            this.onError?.(errorMsg, errCode);
          };

          this.recognition.onend = () => {
            this.isListening = false;
            this.onStateChange?.('idle');
          };
        } catch (err: any) {
          this.isSupportedBrowser = false;
        }
      }
    }
  }

  public isSupported(): boolean {
    return this.isSupportedBrowser;
  }

  public start(): void {
    if (!this.isSupportedBrowser || !this.recognition) {
      this.onError?.('Voice recognition is not supported in this browser. Please use the text input.');
      return;
    }

    if (this.isListening) {
      return;
    }

    try {
      this.recognition.start();
    } catch (err: any) {
      // If already started or throwing an exception
      try {
        this.recognition.stop();
        setTimeout(() => this.recognition.start(), 200);
      } catch (e) {
        this.onError?.('Unable to activate microphone. Please try again or use text input.');
      }
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        // ignore
      }
      this.isListening = false;
      this.onStateChange?.('idle');
    }
  }

  public abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (err) {
        // ignore
      }
      this.isListening = false;
      this.onStateChange?.('idle');
    }
  }
}

export const voiceService = new VoiceRecognitionService();

