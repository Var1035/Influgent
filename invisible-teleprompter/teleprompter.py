#!/usr/bin/env python3
"""
Influgent Stealth Teleprompter
A floating, semi-transparent desktop teleprompter that is completely invisible 
to screen recorders, OBS Studio, Zoom, Teams, Discord, and Windows screen captures.

Built using Windows SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE).
"""

import sys
import os
import math
import ctypes
from ctypes import wintypes
import tkinter as tk
from tkinter import font as tkfont
from tkinter import ttk, messagebox

# Windows Display Affinity Constants
WDA_NONE = 0x00000000
WDA_MONITOR = 0x00000001
WDA_EXCLUDEFROMCAPTURE = 0x00000011  # Windows 10 version 2004+ (Excludes from all screen captures)

DEFAULT_SCRIPT = """[0:00 - 0:22] THE CREATOR PROBLEM
Every content creator knows the struggle: you spend days scripting and filming, only for the algorithm to ignore your video. Most creators guess what is trending, copy huge channels, and read stiff scripts that sound robotic. That is why we built Influgent: your AI-powered viral momentum radar and recording studio.

[0:22 - 0:45] DISCOVERING BREAKOUT TRENDS (5X DAILY AUTOMATION)
Influgent begins in the Trend Explorer, which runs automatically five times a day to capture fresh breakouts as they happen. Instead of simply showing videos from massive celebrity channels, our algorithm benchmarks each upload against its channel's normal baseline, revealing true outliers performing ten to sixty times above average across India, the United States, and worldwide markets.

[0:45 - 1:10] VOICE-FIRST COMMANDS & PLATFORM SELECTION
Everything in Influgent is built voice-first with Wispr Flow. Instead of typing and clicking through menus, you can simply speak your creative intent. Tell Influgent to query live trends, or switch your target platform between YouTube Shorts, Instagram Reels, and LinkedIn, and the system executes your spoken commands instantly without touching the keyboard.

[1:10 - 1:35] MULTI-PLATFORM AI SCRIPT GENERATION (YOUTUBE & LINKEDIN)
When you select a breakout topic, Influgent crafts a platform-tailored creative package. Select YouTube for rapid-fire video hooks and spoken teleprompter scripts, or switch to LinkedIn for structured, long-form thought-leadership posts. Powered by Mistral AI, your voiceover is engineered specifically for natural speaking cadence, hooking viewers in the first three seconds.

[1:35 - 2:00] STUDIO RECORDING & INSTANT PRODUCTION
Finally, transition straight into the Content Studio to record. Launch the transparent teleprompter directly over your camera feed, maintain direct eye contact with your lens, and let the teleprompter scroll at your speaking pace. With five automated daily syncs keeping your pipeline fresh, turning a breakout trend into a recorded video takes less than two minutes."""

class StealthTeleprompter:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Influgent Stealth Teleprompter")
        
        # State variables
        self.is_playing = False
        self.scroll_speed = 1.2          # Multiplier (0.2 to 4.0)
        self.base_pixels_per_tick = 0.9  # Base step per 25ms tick
        self.font_size = 22
        self.opacity = 0.88
        self.countdown_val = 0
        self.text_y = 180                # Initial vertical start position
        self.script_text = self.load_initial_script()
        self.is_mirrored = False
        self.show_controls = True
        self.protection_enabled = False
        
        # Drag & resize state
        self.drag_start_x = 0
        self.drag_start_y = 0
        self.resize_start_x = 0
        self.resize_start_y = 0
        self.resize_orig_w = 0
        self.resize_orig_h = 0
        
        # Configure root window
        self.root.overrideredirect(True)
        self.root.attributes("-topmost", True)
        self.root.attributes("-alpha", self.opacity)
        self.root.configure(bg="#0f1115")
        
        # Window sizing & positioning (Centered horizontally near top below webcam)
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        default_w = min(680, screen_w - 60)
        default_h = min(420, screen_h - 120)
        start_x = (screen_w - default_w) // 2
        start_y = 45  # Positioned right under the top bezel webcam
        self.root.geometry(f"{default_w}x{default_h}+{start_x}+{start_y}")
        
        # Build UI
        self.setup_fonts()
        self.build_ui()
        self.bind_shortcuts()
        
        # Apply Screen Capture Protection via Windows API
        self.root.after(100, self.apply_capture_protection)
        
        # Initial draw of text
        self.root.after(150, self.render_script)
        
        # Start timer tick loop (runs continuously)
        self.root.after(25, self.scroll_tick)

    def load_initial_script(self) -> str:
        script_file = os.path.join(os.path.dirname(__file__), "demo-script.txt")
        if os.path.exists(script_file):
            try:
                with open(script_file, "r", encoding="utf-8") as f:
                    return f.read().strip()
            except Exception:
                pass
        return DEFAULT_SCRIPT

    def apply_capture_protection(self):
        """Invokes SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)"""
        if sys.platform != "win32":
            self.protection_status_label.config(
                text="CAPTURE PROTECTION: N/A (Windows Only)",
                fg="#f59e0b"
            )
            return

        try:
            self.root.update_idletasks()
            hwnd = ctypes.windll.user32.GetParent(self.root.winfo_id())
            if not hwnd:
                hwnd = self.root.winfo_id()
            
            # WDA_EXCLUDEFROMCAPTURE hides window from OBS, Zoom, Teams, Loom, etc.
            result = ctypes.windll.user32.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
            if result != 0:
                self.protection_enabled = True
                self.protection_status_label.config(
                    text="STEALTH ACTIVE: INVISIBLE ON SCREEN RECORDINGS & SHARES",
                    fg="#10b981"
                )
            else:
                # Fallback for earlier Windows
                result2 = ctypes.windll.user32.SetWindowDisplayAffinity(hwnd, WDA_MONITOR)
                if result2 != 0:
                    self.protection_enabled = True
                    self.protection_status_label.config(
                        text="STEALTH ACTIVE (MONITOR MODE)",
                        fg="#10b981"
                    )
                else:
                    self.protection_status_label.config(
                        text="STEALTH WARNING: SetWindowDisplayAffinity Failed",
                        fg="#ef4444"
                    )
        except Exception as e:
            self.protection_status_label.config(
                text=f"STEALTH ERROR: {e}",
                fg="#ef4444"
            )

    def setup_fonts(self):
        self.font_script = tkfont.Font(family="Segoe UI", size=self.font_size, weight="bold")
        self.font_header = tkfont.Font(family="Segoe UI", size=9, weight="bold")
        self.font_status = tkfont.Font(family="Segoe UI", size=8, weight="bold")
        self.font_controls = tkfont.Font(family="Segoe UI", size=9, weight="bold")

    def build_ui(self):
        # Main container with subtle border
        self.outer_frame = tk.Frame(self.root, bg="#1a1c23", bd=1, relief="solid")
        self.outer_frame.pack(fill="both", expand=True)

        # 1. Custom Title Bar / Drag Bar
        self.title_bar = tk.Frame(self.outer_frame, bg="#121318", height=32)
        self.title_bar.pack(fill="x", side="top")
        self.title_bar.pack_propagate(False)

        # Title Label & Drag handle
        self.title_label = tk.Label(
            self.title_bar,
            text="INFLUGENT STEALTH TELEPROMPTER",
            bg="#121318",
            fg="#e2e8f0",
            font=self.font_header,
            padx=10
        )
        self.title_label.pack(side="left")

        # Stealth Status Badge
        self.protection_status_label = tk.Label(
            self.title_bar,
            text="INITIALIZING STEALTH CAPTURE...",
            bg="#121318",
            fg="#94a3b8",
            font=self.font_status,
            padx=6
        )
        self.protection_status_label.pack(side="left", padx=4)

        # Window Controls (Close, Toggle Controls)
        self.close_btn = tk.Button(
            self.title_bar,
            text="X",
            bg="#121318",
            fg="#94a3b8",
            activebackground="#ef4444",
            activeforeground="#ffffff",
            bd=0,
            padx=10,
            font=self.font_header,
            command=self.root.destroy,
            cursor="hand2"
        )
        self.close_btn.pack(side="right")

        self.min_btn = tk.Button(
            self.title_bar,
            text="-",
            bg="#121318",
            fg="#94a3b8",
            activebackground="#27272a",
            activeforeground="#ffffff",
            bd=0,
            padx=8,
            font=self.font_header,
            command=self.root.iconify,
            cursor="hand2"
        )
        self.min_btn.pack(side="right")

        self.toggle_ctrls_btn = tk.Button(
            self.title_bar,
            text="Hide Toolbar",
            bg="#121318",
            fg="#94a3b8",
            activebackground="#27272a",
            activeforeground="#ffffff",
            bd=0,
            padx=8,
            font=self.font_status,
            command=self.toggle_toolbar,
            cursor="hand2"
        )
        self.toggle_ctrls_btn.pack(side="right")

        # Bind dragging on title bar and title label
        for w in (self.title_bar, self.title_label, self.protection_status_label):
            w.bind("<Button-1>", self.on_drag_start)
            w.bind("<B1-Motion>", self.on_drag_motion)

        # 2. Canvas Area for Scrolling Text
        self.canvas_frame = tk.Frame(self.outer_frame, bg="#000000")
        self.canvas_frame.pack(fill="both", expand=True)

        self.canvas = tk.Canvas(
            self.canvas_frame,
            bg="#000000",
            highlightthickness=0,
            bd=0
        )
        self.canvas.pack(fill="both", expand=True)
        self.canvas.bind("<Configure>", lambda e: self.render_script())
        self.canvas.bind("<Button-1>", self.canvas_click)
        self.canvas.bind("<MouseWheel>", self.on_mouse_wheel)

        # 3. Reading Focus Guide (Horizontal subtle focus guide bar)
        self.guide_overlay = tk.Frame(
            self.canvas,
            bg="#3b82f6",
            height=2
        )
        # Positioned dynamically in render_script()

        # 4. Interactive Bottom Control Bar
        self.control_bar = tk.Frame(self.outer_frame, bg="#121318", height=46)
        self.control_bar.pack(fill="x", side="bottom")
        self.control_bar.pack_propagate(False)

        # Play / Pause Button
        self.play_btn = tk.Button(
            self.control_bar,
            text="START [Space]",
            bg="#2563eb",
            fg="#ffffff",
            activebackground="#1d4ed8",
            activeforeground="#ffffff",
            font=self.font_controls,
            bd=0,
            padx=12,
            pady=4,
            command=self.toggle_play,
            cursor="hand2"
        )
        self.play_btn.pack(side="left", padx=8, pady=7)

        # Reset / Rewind Button
        self.reset_btn = tk.Button(
            self.control_bar,
            text="Rewind [R]",
            bg="#27272a",
            fg="#e4e4e7",
            activebackground="#3f3f46",
            activeforeground="#ffffff",
            font=self.font_controls,
            bd=0,
            padx=10,
            pady=4,
            command=self.reset_scroll,
            cursor="hand2"
        )
        self.reset_btn.pack(side="left", padx=4, pady=7)

        # Speed Down / Up Controls
        self.slower_btn = tk.Button(
            self.control_bar,
            text="Speed -",
            bg="#27272a",
            fg="#e4e4e7",
            font=self.font_controls,
            bd=0,
            padx=8,
            pady=4,
            command=self.speed_down,
            cursor="hand2"
        )
        self.slower_btn.pack(side="left", padx=3, pady=7)

        self.speed_label = tk.Label(
            self.control_bar,
            text=f"{self.scroll_speed:.1f}x",
            bg="#121318",
            fg="#38bdf8",
            font=self.font_controls,
            width=5
        )
        self.speed_label.pack(side="left")

        self.faster_btn = tk.Button(
            self.control_bar,
            text="Speed +",
            bg="#27272a",
            fg="#e4e4e7",
            font=self.font_controls,
            bd=0,
            padx=8,
            pady=4,
            command=self.speed_up,
            cursor="hand2"
        )
        self.faster_btn.pack(side="left", padx=3, pady=7)

        # Font Size Controls
        self.font_down_btn = tk.Button(
            self.control_bar,
            text="A-",
            bg="#27272a",
            fg="#e4e4e7",
            font=self.font_controls,
            bd=0,
            padx=8,
            pady=4,
            command=self.font_down,
            cursor="hand2"
        )
        self.font_down_btn.pack(side="left", padx=3, pady=7)

        self.font_up_btn = tk.Button(
            self.control_bar,
            text="A+",
            bg="#27272a",
            fg="#e4e4e7",
            font=self.font_controls,
            bd=0,
            padx=8,
            pady=4,
            command=self.font_up,
            cursor="hand2"
        )
        self.font_up_btn.pack(side="left", padx=3, pady=7)

        # Transparency Toggle Button (Cycles 50%, 75%, 90%, 100%)
        self.trans_btn = tk.Button(
            self.control_bar,
            text=f"Glass: {int(self.opacity*100)}%",
            bg="#27272a",
            fg="#e4e4e7",
            font=self.font_controls,
            bd=0,
            padx=8,
            pady=4,
            command=self.cycle_transparency,
            cursor="hand2"
        )
        self.trans_btn.pack(side="left", padx=4, pady=7)

        # Edit Script Button
        self.edit_btn = tk.Button(
            self.control_bar,
            text="Edit Script",
            bg="#3b82f6",
            fg="#ffffff",
            activebackground="#2563eb",
            activeforeground="#ffffff",
            font=self.font_controls,
            bd=0,
            padx=10,
            pady=4,
            command=self.open_script_editor,
            cursor="hand2"
        )
        self.edit_btn.pack(side="left", padx=6, pady=7)

        # Word count & Estimated duration info
        self.stats_label = tk.Label(
            self.control_bar,
            text="",
            bg="#121318",
            fg="#a1a1aa",
            font=self.font_status
        )
        self.stats_label.pack(side="right", padx=12)
        self.update_stats()

        # Resize grip handle at bottom right
        self.resize_grip = tk.Label(
            self.outer_frame,
            text="//",
            bg="#121318",
            fg="#64748b",
            font=self.font_status,
            cursor="size_nw_se"
        )
        self.resize_grip.place(relx=1.0, rely=1.0, x=-16, y=-16, width=16, height=16)
        self.resize_grip.bind("<Button-1>", self.on_resize_start)
        self.resize_grip.bind("<B1-Motion>", self.on_resize_motion)

    def bind_shortcuts(self):
        self.root.bind("<space>", lambda e: self.toggle_play())
        self.root.bind("<Up>", lambda e: self.speed_up())
        self.root.bind("<Down>", lambda e: self.speed_down())
        self.root.bind("r", lambda e: self.reset_scroll())
        self.root.bind("R", lambda e: self.reset_scroll())
        self.root.bind("<Escape>", lambda e: self.toggle_toolbar())
        self.root.bind("<plus>", lambda e: self.font_up())
        self.root.bind("<minus>", lambda e: self.font_down())
        self.root.bind("<equal>", lambda e: self.font_up())

    def update_stats(self):
        words = len(self.script_text.split())
        # Average speaking pace: 130 words per minute
        mins = math.floor(words / 130)
        secs = math.floor(((words / 130) - mins) * 60)
        self.stats_label.config(text=f"{words} words • ~{mins}m {secs:02d}s")

    def toggle_toolbar(self):
        self.show_controls = not self.show_controls
        if self.show_controls:
            self.control_bar.pack(fill="x", side="bottom")
            self.toggle_ctrls_btn.config(text="Hide Toolbar")
        else:
            self.control_bar.pack_forget()
            self.toggle_ctrls_btn.config(text="Show Toolbar")

    def canvas_click(self, event):
        # Click on canvas toggles play / pause
        self.toggle_play()

    def on_mouse_wheel(self, event):
        # Mouse wheel manually adjusts text position
        delta = event.delta
        self.text_y += delta * 0.5
        self.render_script()

    def on_drag_start(self, event):
        self.drag_start_x = event.x
        self.drag_start_y = event.y

    def on_drag_motion(self, event):
        dx = event.x - self.drag_start_x
        dy = event.y - self.drag_start_y
        x = self.root.winfo_x() + dx
        y = self.root.winfo_y() + dy
        self.root.geometry(f"+{x}+{y}")

    def on_resize_start(self, event):
        self.resize_start_x = event.x_root
        self.resize_start_y = event.y_root
        self.resize_orig_w = self.root.winfo_width()
        self.resize_orig_h = self.root.winfo_height()

    def on_resize_motion(self, event):
        dw = event.x_root - self.resize_start_x
        dh = event.y_root - self.resize_start_y
        new_w = max(420, self.resize_orig_w + dw)
        new_h = max(260, self.resize_orig_h + dh)
        self.root.geometry(f"{new_w}x{new_h}")
        self.render_script()

    def toggle_play(self):
        if self.is_playing:
            self.is_playing = False
            self.play_btn.config(text="RESUME [Space]", bg="#2563eb")
        else:
            # Start countdown if at initial or top
            if self.countdown_val == 0:
                self.start_countdown(3)
            else:
                self.is_playing = True
                self.play_btn.config(text="PAUSE [Space]", bg="#d97706")

    def start_countdown(self, seconds: int):
        self.countdown_val = seconds
        self.play_btn.config(text=f"Starting in {seconds}...", bg="#d97706")
        self.render_script()
        if seconds > 0:
            self.root.after(1000, lambda: self.start_countdown(seconds - 1))
        else:
            self.countdown_val = 0
            self.is_playing = True
            self.play_btn.config(text="PAUSE [Space]", bg="#d97706")
            self.render_script()

    def reset_scroll(self):
        self.is_playing = False
        self.countdown_val = 0
        h = self.canvas.winfo_height() or 300
        self.text_y = int(h * 0.45)
        self.play_btn.config(text="START [Space]", bg="#2563eb")
        self.render_script()

    def speed_up(self):
        self.scroll_speed = min(4.0, round(self.scroll_speed + 0.1, 1))
        self.speed_label.config(text=f"{self.scroll_speed:.1f}x")

    def speed_down(self):
        self.scroll_speed = max(0.2, round(self.scroll_speed - 0.1, 1))
        self.speed_label.config(text=f"{self.scroll_speed:.1f}x")

    def font_up(self):
        self.font_size = min(48, self.font_size + 2)
        self.font_script.config(size=self.font_size)
        self.render_script()

    def font_down(self):
        self.font_size = max(14, self.font_size - 2)
        self.font_script.config(size=self.font_size)
        self.render_script()

    def cycle_transparency(self):
        levels = [0.50, 0.70, 0.88, 1.00]
        cur_idx = 0
        for i, val in enumerate(levels):
            if abs(self.opacity - val) < 0.05:
                cur_idx = (i + 1) % len(levels)
                break
        self.opacity = levels[cur_idx]
        self.root.attributes("-alpha", self.opacity)
        self.trans_btn.config(text=f"Glass: {int(self.opacity*100)}%")

    def scroll_tick(self):
        if self.is_playing and self.countdown_val == 0:
            step = self.base_pixels_per_tick * self.scroll_speed
            self.text_y -= step
            self.render_script()
        
        # Schedule next tick at 40 FPS (25ms)
        self.root.after(25, self.scroll_tick)

    def render_script(self):
        self.canvas.delete("all")
        w = self.canvas.winfo_width() or 600
        h = self.canvas.winfo_height() or 300

        # Draw reading horizontal focus marker (subtle blue transparent accent bar)
        focus_y = int(h * 0.40)
        self.canvas.create_rectangle(
            20, focus_y - 20, w - 20, focus_y + 24,
            fill="#1e293b",
            outline="#3b82f6",
            width=1
        )
        self.canvas.create_text(
            26, focus_y + 2,
            text=">",
            fill="#60a5fa",
            font=self.font_header,
            anchor="w"
        )

        # If in countdown mode, display prominent countdown banner
        if self.countdown_val > 0:
            self.canvas.create_text(
                w // 2, h // 2,
                text=str(self.countdown_val),
                fill="#f59e0b",
                font=("Segoe UI", 68, "bold")
            )
            self.canvas.create_text(
                w // 2, (h // 2) + 60,
                text="GET READY TO SPEAK",
                fill="#94a3b8",
                font=self.font_header
            )
            return

        # Render teleprompter script lines
        wrap_width = max(340, w - 80)
        self.canvas.create_text(
            w // 2,
            int(self.text_y),
            text=self.script_text,
            fill="#f8fafc",
            font=self.font_script,
            width=wrap_width,
            justify="center",
            anchor="n"
        )

    def open_script_editor(self):
        """Modal editor to paste custom voiceover scripts"""
        was_playing = self.is_playing
        self.is_playing = False

        editor = tk.Toplevel(self.root)
        editor.title("Script Editor — Paste or Modify Voiceover")
        editor.geometry("560x420")
        editor.configure(bg="#121318")
        editor.attributes("-topmost", True)

        lbl = tk.Label(
            editor,
            text="Paste your word-for-word voiceover script below:",
            bg="#121318",
            fg="#e2e8f0",
            font=self.font_header,
            padx=12,
            pady=8
        )
        lbl.pack(anchor="w")

        txt_frame = tk.Frame(editor, bg="#1a1c23")
        txt_frame.pack(fill="both", expand=True, padx=12, pady=4)

        scrollbar = tk.Scrollbar(txt_frame)
        scrollbar.pack(side="right", fill="y")

        txt_editor = tk.Text(
            txt_frame,
            bg="#090a0f",
            fg="#ffffff",
            insertbackground="#ffffff",
            font=("Segoe UI", 12),
            wrap="word",
            yscrollcommand=scrollbar.set,
            bd=0,
            padx=10,
            pady=10
        )
        txt_editor.pack(fill="both", expand=True)
        scrollbar.config(command=txt_editor.yview)

        txt_editor.insert("1.0", self.script_text)

        btn_row = tk.Frame(editor, bg="#121318", pady=10)
        btn_row.pack(fill="x", padx=12)

        def save_and_close():
            new_text = txt_editor.get("1.0", "end-1c").strip()
            if new_text:
                self.script_text = new_text
                self.update_stats()
                self.reset_scroll()
            editor.destroy()

        def load_demo():
            txt_editor.delete("1.0", "end")
            txt_editor.insert("1.0", DEFAULT_SCRIPT)

        save_btn = tk.Button(
            btn_row,
            text="Apply Script",
            bg="#2563eb",
            fg="#ffffff",
            font=self.font_header,
            bd=0,
            padx=14,
            pady=6,
            command=save_and_close,
            cursor="hand2"
        )
        save_btn.pack(side="left")

        demo_btn = tk.Button(
            btn_row,
            text="Load 2-Min Demo Script",
            bg="#27272a",
            fg="#e4e4e7",
            font=self.font_header,
            bd=0,
            padx=12,
            pady=6,
            command=load_demo,
            cursor="hand2"
        )
        demo_btn.pack(side="left", padx=8)

        cancel_btn = tk.Button(
            btn_row,
            text="Cancel",
            bg="#27272a",
            fg="#a1a1aa",
            font=self.font_header,
            bd=0,
            padx=12,
            pady=6,
            command=editor.destroy,
            cursor="hand2"
        )
        cancel_btn.pack(side="right")


def main():
    root = tk.Tk()
    app = StealthTeleprompter(root)
    root.mainloop()

if __name__ == "__main__":
    main()

