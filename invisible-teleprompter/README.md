# Influgent Stealth Desktop Teleprompter

A standalone desktop teleprompter with a transparent, floating screen engineered specifically for **recording YouTube demos, tutorials, and screen shares without the teleprompter ever appearing on video**.

---

## How the Screen Recording Invisibility Works

Under the hood, the application leverages the **Windows Desktop Window Manager (DWM) API**:

```c
SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE); // 0x00000011
```

* **To You (The Creator)**: The teleprompter floats on top of your screen, directly underneath your webcam bezel. It displays clean, high-contrast, auto-scrolling text with customizable transparency.
* **To Your Screen Recording / Screen Share**: Windows DWM completely strips this window from the capture buffer. Whether you record using **OBS Studio**, **Loom**, **Camtasia**, **Zoom**, **Google Meet**, **Microsoft Teams**, or **Discord**, the teleprompter is **completely invisible**. The recording captures whatever is behind it as if the teleprompter does not exist.

---

## Folder Structure

```text
invisible-teleprompter/
├── teleprompter.py          # Standalone Python desktop app (Zero extra dependencies)
├── run-teleprompter.bat      # One-click Windows batch launcher
├── demo-script.txt          # Preloaded 2-minute Influgent voiceover demo script
├── README.md                # This documentation file
└── electron-app/            # Alternative Electron version (HTML/CSS/JS)
    ├── package.json
    ├── main.js              # Uses win.setContentProtection(true)
    ├── index.html
    ├── renderer.js
    └── styles.css
```

---

## Quick Start (Two Ways to Run)

### Option A: Standalone Python (Instant, No Dependencies Required)

Requirements: Python 3.x (already installed on this machine).

1. Open a terminal in this folder or double-click `run-teleprompter.bat`.
2. Or run via command line:
   ```powershell
   cd invisible-teleprompter
   python teleprompter.py
   ```
3. The floating transparent window will appear at the top center of your screen.

---

### Option B: Electron Desktop Version (Modern HTML5 UI)

Requirements: Node.js (already installed on this machine).

1. Navigate to the `electron-app` directory:
   ```powershell
   cd invisible-teleprompter/electron-app
   npm install
   npm start
   ```

---

## Features & Controls

* **Stealth Capture Protection**: Excludes window from all video capture software.
* **Semi-Transparent Glassmorphism**: Toggle transparency from 50% to 100% to keep your underlying workflow visible.
* **Auto-Scrolling with 60 FPS Fluidity**: Sub-pixel smooth gliding without distracting line jumps.
* **Speed Adjuster**: 0.2x to 4.0x fine-tuning.
* **Reading Focus Marker**: Subtle horizontal guide line helping you maintain direct eye contact near your camera lens.
* **3-Second Countdown**: Countdown overlay before scrolling begins so you can prepare your posture and breath.
* **Built-in Script Editor**: Click "Edit Script" to paste any custom script, with automatic word count and duration estimation.
* **Preloaded 2-Minute Script**: Ready out-of-the-box with the Influgent 2-minute demo explanation.

---

## Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **Space** | Start / Pause auto-scrolling |
| **Up Arrow** | Increase scroll speed (+0.1x) |
| **Down Arrow** | Decrease scroll speed (-0.1x) |
| **R** | Rewind to top |
| **+ / =** | Increase font size |
| **-** | Decrease font size |
| **Mouse Wheel** | Manually scroll up or down |
| **Escape** | Toggle/hide control toolbar for ultra-minimalist view |

