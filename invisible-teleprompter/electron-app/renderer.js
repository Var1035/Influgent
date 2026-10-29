const { ipcRenderer } = require('electron');

const DEFAULT_SCRIPT = `[0:00 - 0:22] THE CREATOR PROBLEM
Every content creator knows the struggle: you spend days scripting and filming, only for the algorithm to ignore your video. Most creators guess what is trending, copy huge channels, and read stiff scripts that sound robotic. That is why we built Influgent: your AI-powered viral momentum radar and recording studio.

[0:22 - 0:45] DISCOVERING BREAKOUT TRENDS (5X DAILY AUTOMATION)
Influgent begins in the Trend Explorer, which runs automatically five times a day to capture fresh breakouts as they happen. Instead of simply showing videos from massive celebrity channels, our algorithm benchmarks each upload against its channel's normal baseline, revealing true outliers performing ten to sixty times above average across India, the United States, and worldwide markets.

[0:45 - 1:10] VOICE-FIRST COMMANDS & PLATFORM SELECTION
Everything in Influgent is built voice-first with Wispr Flow. Instead of typing and clicking through menus, you can simply speak your creative intent. Tell Influgent to query live trends, or switch your target platform between YouTube Shorts, Instagram Reels, and LinkedIn, and the system executes your spoken commands instantly without touching the keyboard.

[1:10 - 1:35] MULTI-PLATFORM AI SCRIPT GENERATION (YOUTUBE & LINKEDIN)
When you select a breakout topic, Influgent crafts a platform-tailored creative package. Select YouTube for rapid-fire video hooks and spoken teleprompter scripts, or switch to LinkedIn for structured, long-form thought-leadership posts. Powered by Mistral AI, your voiceover is engineered specifically for natural speaking cadence, hooking viewers in the first three seconds.

[1:35 - 2:00] STUDIO RECORDING & INSTANT PRODUCTION
Finally, transition straight into the Content Studio to record. Launch the transparent teleprompter directly over your camera feed, maintain direct eye contact with your lens, and let the teleprompter scroll at your speaking pace. With five automated daily syncs keeping your pipeline fresh, turning a breakout trend into a recorded video takes less than two minutes.`;

// State
let scriptText = DEFAULT_SCRIPT;
let isPlaying = false;
let scrollSpeed = 1.2; // Speed multiplier
let currentY = 140; // Initial start position in px
let fontSize = 24;
let opacityIndex = 2; // [50%, 75%, 88%, 100%]
const opacityLevels = [0.50, 0.75, 0.88, 1.0];
let animFrameId = null;
let countdownTimer = null;
let isCountdownActive = false;

// DOM Elements
const windowContainer = document.getElementById('windowContainer');
const viewport = document.getElementById('viewport');
const scriptContent = document.getElementById('scriptContent');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const playLabel = document.getElementById('playLabel');
const rewindBtn = document.getElementById('rewindBtn');
const speedDownBtn = document.getElementById('speedDownBtn');
const speedUpBtn = document.getElementById('speedUpBtn');
const speedDisplay = document.getElementById('speedDisplay');
const fontDownBtn = document.getElementById('fontDownBtn');
const fontUpBtn = document.getElementById('fontUpBtn');
const opacityBtn = document.getElementById('opacityBtn');
const opacityLabel = document.getElementById('opacityLabel');
const statsDisplay = document.getElementById('statsDisplay');
const hideToolbarBtn = document.getElementById('hideToolbarBtn');
const controlsBar = document.getElementById('controlsBar');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');

// Modal Elements
const editScriptBtn = document.getElementById('editScriptBtn');
const editorModal = document.getElementById('editorModal');
const scriptTextarea = document.getElementById('scriptTextarea');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const applyScriptBtn = document.getElementById('applyScriptBtn');
const loadDemoScriptBtn = document.getElementById('loadDemoScriptBtn');

// Render Script Text with Timing Markers Highlighted
function renderScript() {
  const paragraphs = scriptText.split('\n\n');
  const html = paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('[')) {
        const parts = trimmed.split('\n');
        const header = parts[0];
        const body = parts.slice(1).join(' ');
        return `<div><span class="script-section-header">${header}</span><p>${body}</p></div>`;
      }
      return `<p style="margin-bottom: 24px;">${trimmed}</p>`;
    })
    .join('');

  scriptContent.innerHTML = html;
  scriptContent.style.fontSize = `${fontSize}px`;
  updatePosition();
  updateStats();
}

function updatePosition() {
  scriptContent.style.transform = `translateY(${currentY}px)`;
}

function updateStats() {
  const words = scriptText.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.floor(words / 130);
  const secs = Math.floor(((words / 130) - mins) * 60);
  statsDisplay.textContent = `${words} words • ~${mins}m ${secs.toString().padStart(2, '0')}s`;
}

// Auto-Scroll Loop using requestAnimationFrame (60 FPS fluid)
function scrollLoop() {
  if (isPlaying && !isCountdownActive) {
    const pixelsPerFrame = 0.75 * scrollSpeed;
    currentY -= pixelsPerFrame;
    updatePosition();
  }
  animFrameId = requestAnimationFrame(scrollLoop);
}

// Start / Pause Control
function togglePlay() {
  if (isPlaying) {
    isPlaying = false;
    playIcon.className = 'fa-solid fa-play';
    playLabel.textContent = 'Resume [Space]';
    playBtn.classList.remove('active');
  } else {
    // If starting from top, trigger 3-second countdown
    if (currentY >= 130) {
      startCountdown(3);
    } else {
      isPlaying = true;
      playIcon.className = 'fa-solid fa-pause';
      playLabel.textContent = 'Pause [Space]';
      playBtn.classList.add('active');
    }
  }
}

function startCountdown(seconds) {
  isCountdownActive = true;
  countdownOverlay.classList.remove('hidden');
  countdownNumber.textContent = seconds;

  countdownTimer = setInterval(() => {
    seconds--;
    if (seconds > 0) {
      countdownNumber.textContent = seconds;
    } else {
      clearInterval(countdownTimer);
      isCountdownActive = false;
      countdownOverlay.classList.add('hidden');
      isPlaying = true;
      playIcon.className = 'fa-solid fa-pause';
      playLabel.textContent = 'Pause [Space]';
      playBtn.classList.add('active');
    }
  }, 1000);
}

function rewindToTop() {
  isPlaying = false;
  isCountdownActive = false;
  if (countdownTimer) clearInterval(countdownTimer);
  countdownOverlay.classList.add('hidden');
  currentY = 140;
  updatePosition();
  playIcon.className = 'fa-solid fa-play';
  playLabel.textContent = 'Start [Space]';
  playBtn.classList.remove('active');
}

// Speed Adjustment
function changeSpeed(delta) {
  scrollSpeed = Math.max(0.2, Math.min(4.0, Math.round((scrollSpeed + delta) * 10) / 10));
  speedDisplay.textContent = `${scrollSpeed.toFixed(1)}x`;
}

// Font Adjustment
function changeFontSize(delta) {
  fontSize = Math.max(14, Math.min(48, fontSize + delta));
  scriptContent.style.fontSize = `${fontSize}px`;
}

// Opacity Cycling
function cycleOpacity() {
  opacityIndex = (opacityIndex + 1) % opacityLevels.length;
  const level = opacityLevels[opacityIndex];
  windowContainer.style.background = `rgba(15, 17, 21, ${level})`;
  opacityLabel.textContent = `Glass ${Math.round(level * 100)}%`;
}

// Event Listeners
playBtn.addEventListener('click', togglePlay);
rewindBtn.addEventListener('click', rewindToTop);
viewport.addEventListener('click', togglePlay);

speedDownBtn.addEventListener('click', () => changeSpeed(-0.1));
speedUpBtn.addEventListener('click', () => changeSpeed(0.1));

fontDownBtn.addEventListener('click', () => changeFontSize(-2));
fontUpBtn.addEventListener('click', () => changeFontSize(2));

opacityBtn.addEventListener('click', cycleOpacity);

// Mouse Wheel Manual Positioning
viewport.addEventListener('wheel', (e) => {
  currentY -= e.deltaY * 0.4;
  updatePosition();
});

// Window Controls
minimizeBtn.addEventListener('click', () => ipcRenderer.send('window-minimize'));
closeBtn.addEventListener('click', () => ipcRenderer.send('window-close'));

hideToolbarBtn.addEventListener('click', () => {
  controlsBar.classList.toggle('hidden');
  if (controlsBar.classList.contains('hidden')) {
    controlsBar.style.display = 'none';
  } else {
    controlsBar.style.display = 'flex';
  }
});

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  if (!editorModal.classList.contains('hidden')) return;

  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.code === 'ArrowUp') {
    e.preventDefault();
    changeSpeed(0.1);
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    changeSpeed(-0.1);
  } else if (e.key === 'r' || e.key === 'R') {
    rewindToTop();
  } else if (e.key === '+' || e.key === '=') {
    changeFontSize(2);
  } else if (e.key === '-' || e.key === '_') {
    changeFontSize(-2);
  }
});

// Modal Logic
editScriptBtn.addEventListener('click', () => {
  isPlaying = false;
  scriptTextarea.value = scriptText;
  editorModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => editorModal.classList.add('hidden'));
cancelModalBtn.addEventListener('click', () => editorModal.classList.add('hidden'));

loadDemoScriptBtn.addEventListener('click', () => {
  scriptTextarea.value = DEFAULT_SCRIPT;
});

applyScriptBtn.addEventListener('click', () => {
  const newText = scriptTextarea.value.trim();
  if (newText) {
    scriptText = newText;
    renderScript();
    rewindToTop();
  }
  editorModal.classList.add('hidden');
});

// Initialize on Load
renderScript();
scrollLoop();

