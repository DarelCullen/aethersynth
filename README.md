# Resonance Studio // Aethersynth Web DAW

A real-time, modular digital audio workstation, multi-track sequencer, and synthesizer built with **React**, **TypeScript**, **Tailwind CSS**, and the **Web Audio API**.

Connected from the **Stitch** project (*Modular Synth DAW App - Resonance Studio*), Aethersynth brings together physical studio hardware ergonomics, procedural DSP synthesis, and visual audio telemetry.

![Resonance Studio Logo](https://lh3.googleusercontent.com/aida/AEtjO1XNiHx7-4OwonzgN3kSyvZJNSojEV7VHtJUwH2kbwqYzUUDCLHiARlWPk7iecal-P9A-E88dCzBQB5BlKbtySqGJKc1pjaDyolHaOAtUdW6SJHp3wMWVsKJZ82lKv8myvmpFsGFEesFmI1eO_1AZp7bdDhWXI3jHT8kHwy429pfCLUqTYqYORsn6H8CsSDfwRA0Pypff36zZlfPigAvY7i8Nmu8K6TqC1cMyJuWnEkHSN0A1mr0hdHgy6I)

---

## Workspace Modules

### 1. Arranger Matrix (`Arranger`)
- **Multi-Track Timeline**: 6 dedicated arrangement tracks (Kick/Sub Matrix, Bassline 303, Orbital Lead, Percussion & Hats, Ambient Pad, FX Risers).
- **Measure Ruler**: 32-bar horizontal grid with section markers (`Intro`, `Drop`, `Verse`, `Chorus`, `Outro`).
- **Active Cycle Loop**: Real-time 8-bar loop playback with scrubbable playhead needle.
- **Track Controls**: Individual Track Solo (S), Mute (M), Volume sliders (0-100%), and stereo Pan.
- **Editing Tools**: Draw, Slice, Quantize, and Timeline Zoom (140%).

### 2. Synth Lab (`Orbital-X Engine`)
- **Harmonic Orbital Gravitation Engine**: Interactive physics canvas featuring 4 celestial satellites ($\alpha, \beta, \gamma, \delta$) orbiting a central frequency attractor singularity. Satellites can auto-orbit or be manually dragged in real time to modulate cutoff brightness, overtone phase, sub-harmonic level, and resonance peak.
- **Granular Cloud Resynthesizer**: Real-time grain spray particle visualizer with controls for Grain Position, Density, Spray, Grain Size, and Pitch Jitter.
- **Dual State-Variable Filter (SVF)**: Switchable Lowpass (LP), Bandpass (BP), and Highpass (HP) modes with cutoff, resonance (Q), and filter drive.
- **ADSR Envelopes**: Filter and Amplitude envelope shaping with millisecond accuracy.
- **Modulation Matrix**: Dual assignable LFOs (Sine, Triangle, Saw, Square) routing to Filter Cutoff, Pitch, or Pan.
- **Polyphonic MPE Keybed**: 3-octave playable virtual keyboard with mouse/touch support, octave shifting (-2 to +2), and computer keyboard bindings (`A` through `K` map to notes `C3` through `C4`).

### 3. Drum Machine (`BeatForge 16`)
- **16 RGB Velocity Trigger Deck**: 4x4 tactile performance pads featuring 16 procedural DSP drum models:
  1. *Kick 808* (Analog Punch with sub sweep)
  2. *Snare Tight* (Layered crisp tone + noise snap)
  3. *Clap Neo* (Multi-trigger stereo spread)
  4. *Hi-Hat Closed* (Titanium metallic cluster)
  5. *Hi-Hat Open* (Airy decay)
  6. *Perc Shaker* (Velvet noise envelope)
  7. *Tom Hi* (Acoustic pitch-drop)
  8. *Tom Low* (Deep floor resonant drop)
  9. *Rimshot* (Studio woodblock click)
  10. *Laser Zap* (Modular FM sweep)
  11. *Crash 18"* (Analog wash)
  12. *Ride Bell* (Dual ping bell partials)
  13. *Sub Drop* (32Hz Earthshaker)
  14. *FX Glitch* (Sample & Hold sweep)
  15. *Synth Stab* (Neo Detroit Min7 chord)
  16. *Vox Chant* (Formant vowel "Hey")
- **8-Track 16-Step Sequencer Matrix**: Real-time step sequence grid with running playhead sweep highlights, per-step velocity/accents, and individual track solo/mute.
- **Groove Kits & Dice Generator**: Instant switching between *Cyberpunk Trap 808*, *Vintage Detroit 909*, *Organic Lo-Fi Chill*, and *UK Garage Breaks*, or click **Dice Groove** for intelligent algorithmic rhythm generation.
- **Sample Waveform Editor**: Visual waveform display with transient attack, sustain, semitone tuning (-12 to +12 st), and filter cutoff shaping.

### 4. Plugin Rack (`500-Series Modular FX & DSP Chain`)
- **Master Routing Chain**: Pre-Amp Input $\to$ Dynamic EQ $\to$ Tape Saturation $\to$ Space Reverb/Delay $\to$ Brickwall Limiter $\to$ Master Destination.
- **Prism Dynamic EQ v2.1**: Interactive frequency response canvas (20 Hz - 20 kHz) with 4 parametric bands (Low Shelf, Mid Peaking 1, Mid Peaking 2, High Shelf) and draggable frequency nodes.
- **Analog Tape Saturation**: Polynomial sigmoid soft-clipping waveshaper with Tape Drive, Warmth filter rolloff, and Head Bias.
- **Space Reverb & Stereo Delay**: Algorithmic synthetic reverb impulse response with cross-stereo synced delay feedback.
- **Brickwall Peak Limiter**: Fast 1ms attack dynamics limiter with Ceiling (-0.1 dBTP), Threshold, Release, and live Gain Reduction metering.
- **Master Oscilloscope & FFT Spectrum Analyzer**: 2048-point live frequency spectrum bars and real-time audio time-domain waveform display.

### 5. High-Fidelity WAV Export
- Click **Export** in the top header to render the entire 8-bar loop through the full DSP effects rack using `OfflineAudioContext` directly into a downloadable 16-bit 44.1kHz stereo `.wav` file with zero latency or external server dependencies.

---

## Getting Started

### Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser. Click anywhere on the screen to initialize the Web Audio API context.

### Production Build
```bash
npm run build
```
Creates an optimized production bundle in the `dist/` directory.

### Preview Production Build
```bash
npm run preview
```
