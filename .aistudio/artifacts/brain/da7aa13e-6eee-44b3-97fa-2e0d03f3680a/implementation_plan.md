# Implementation Plan: VocalStudio Digital Audio Workstation (DAW) UI Redesign

Transform the current centered-card layout into a high-precision, production-grade **Digital Audio Workstation (DAW)** tailored for AI voice production, time-calibrated audio generation, voice cloning, and microphone tracking.

---

## 1. Design System & Theme Foundations

- **Theme Palette**: Deep dark studio Obsidian & Carbon (`#090D14`, `#0F1420`, `#141A29`), borders in subtle dark alloy (`#1E2638`), electric indigo primary highlights (`#6366F1`, `#818CF8`), cyber-cyan waveform monitors (`#06B6D4`), and warm warning/amber indicators (`#F59E0B`).
- **Typography & Metrics**: Clean sans-serif headings with high-density monospace telemetry (`font-mono tabular-nums tracking-tight`) for timecodes (`00:00.00`), pacing meters (WPM, Syllables/sec), and audio buffer stats.
- **Zero-Pill Discipline**: Crisp rectangular and subtly chamfered hardware-inspired panels, LED-style status dots, and tactile transport controls instead of generic pill tags.

---

## 2. Structural DAW Layout Architecture

### A. Top Transport & Session Ribbon (`Header`)
- **Brand Identity**: `VocalStudio DAW` logo mark with active audio engine status indicator.
- **Master Timecode Counter**: High-contrast LED display showing `Current Playback Time / Target Time Goal` (e.g., `00:24.18 / 01:00.00`).
- **Master Output VU-Meter**: Stereo visualizer simulation giving real-time feedback during playback and generation.
- **Quick Session Actions**: Reset script, load demo Hinglish script, and direct WAV export.

### B. Left Navigation & Studio Mode Selector (`Sidebar Dock`)
- Studio mode switcher:
  1. **AI Voice Studio** (Primary speech synthesis & 1-minute time goal controller).
  2. **Voice Cloner Lab** (Upload/record voice profiles & clone synthesis).
  3. **Voice Tuner** (Pitch, rate, and browser voice calibration rack).
  4. **Mic Recording Booth** (Live speech monitor & waveform recording).
- Mini session stats (cloned voice count, total words generated, estimated output duration).

### C. Center Stage: Script & Time Goal Workstation
- **High-Density Script Console**:
  - Focus-optimized script editor with subtle line numbers and punctuation indicators.
  - Live script analysis: Word count, character count, estimated speaking duration.
- **Time Goal Precision Controller**:
  - Prominent **1-Minute Target (60s)** preset button with custom target seconds dial.
  - Live pacing telemetry: Target WPM calculation (e.g. `140 WPM`), speed status (Paced / Normal / Brisk), and pacing deviation warning.
  - One-click **"AI Script Auto-Fit"** button: Automatically rewrites or tightens the script using server-side Gemini 3.8 Flash to hit the exact target duration without losing meaning.
- **Audio Transport & Waveform Canvas**:
  - Custom canvas-rendered waveform visualizer with playback cursor.
  - Audio playback transport: Play/Pause, Stop, Seek scrubber, and audio duration readout.
  - Audio generation trigger button with live progress spinner and status updates.

### D. Right Inspector Panel: Voice Rack & Directives
- **Voice Selection Grid**:
  - Voice profiles (Jenny, Ishan, Puck, Charon, Kore, Fenrir, Zephyr, and User Cloned Voices).
  - Timbre badges (`Clear`, `Authoritative`, `Soothing`, `Cloned`).
- **Expression & Tone Directive Console**:
  - Quick tone preset chips (Hinglish Natural, Confident & Energetic, Calm & Soothing, Dramatic).
  - Custom tone instruction input for fine-grained Gemini 3.8 Flash TTS delivery.
- **Master Audio Export**:
  - One-click High-Definition WAV download.
  - Format info: 24kHz Mono 16-bit PCM.

---

## 3. Component Modernization

1. **`src/App.tsx`**:
   - Replaced with the complete DAW shell: Studio Top Transport Bar, Left Sidebar Dock, Center Track Area, and Right Inspector Drawer.
2. **`src/components/AIVoices.tsx`**:
   - Restructured into the modular DAW layout: Script Editor track, Time Goal Precision Rack, Waveform Transport deck, and Right-hand Voice Rack.
   - Retains 100% verbatim text delivery (no prompt injection into audio) while maintaining seamless time goal controls.
3. **`src/components/VoiceClone.tsx`**:
   - Upgraded to dark hardware rack aesthetic with wave drag-and-drop dropzone, live microphone recording meters, and cloned voice management cards.
4. **`src/components/SystemVoices.tsx` & `src/components/MyVoice.tsx`**:
   - Re-styled with matching DAW dark aesthetics, rotary-style slider dials, and sleek recording monitors.

---

## 4. Verification & Testing

- Run `lint_applet` (`tsc --noEmit`) to verify zero TypeScript errors.
- Run `compile_applet` (`vite build`) to confirm compilation passes cleanly.
- Verify that TTS synthesis and the 1-minute time goal auto-fit work seamlessly via server-side endpoints.
