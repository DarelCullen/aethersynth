// Orbital Granular Synthesizer: Polyphonic Multi-Voice DSP with Gravitation Attractor Timbre Engine

export interface SatelliteNode {
  id: 'alpha' | 'beta' | 'gamma' | 'delta';
  name: string;
  label: string;
  x: number; // 0 to 300
  y: number; // 0 to 300
  color: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number; // rad/sec
  angle: number;
}

export interface SynthPreset {
  name: string;
  category: string;
  author: string;
  waveform: OscillatorType;
  unisonCount: number;
  unisonDetune: number;
  portamento: number; // ms
  filterType: BiquadFilterType;
  cutoff: number;
  resonance: number;
  filterDrive: number;
  filterEnvDepth: number;
  ampEnv: { attack: number; decay: number; sustain: number; release: number };
  filterEnv: { attack: number; decay: number; sustain: number; release: number };
  lfo1: { shape: OscillatorType; rate: number; depth: number; dest: 'cutoff' | 'pitch' | 'pan' };
  lfo2: { shape: OscillatorType; rate: number; depth: number; dest: 'cutoff' | 'pitch' | 'pan' };
  granular: { position: number; density: number; spray: number; grainSize: number; jitter: number };
  reverbSend: number;
  delaySend: number;
}

export class SynthEngine {
  private ctx: AudioContext;
  public outputNode: GainNode;

  // Active voices map (note -> voice nodes)
  private activeVoices: Map<
    number,
    {
      oscillators: OscillatorNode[];
      subOsc: OscillatorNode;
      filter: BiquadFilterNode;
      ampGain: GainNode;
      filterGain: GainNode;
      panner: StereoPannerNode;
      stopVoice: () => void;
    }
  > = new Map();

  // Active parameter state
  public state = {
    polyphony: 16,
    masterLevel: -2.4, // dB
    portamento: 45, // ms
    waveform: 'sawtooth' as OscillatorType,
    unisonCount: 3,
    unisonDetune: 25, // cents
    filterType: 'lowpass' as BiquadFilterType,
    cutoff: 1850, // Hz
    resonance: 3.5,
    filterDrive: 15,
    filterEnvDepth: 2400,
    ampEnv: { attack: 0.02, decay: 0.25, sustain: 0.65, release: 0.4 },
    filterEnv: { attack: 0.04, decay: 0.35, sustain: 0.3, release: 0.5 },
    lfo1: { shape: 'sine' as OscillatorType, rate: 2.2, depth: 0.2, dest: 'cutoff' as 'cutoff' | 'pitch' | 'pan' },
    lfo2: { shape: 'triangle' as OscillatorType, rate: 0.5, depth: 0.15, dest: 'pan' as 'cutoff' | 'pitch' | 'pan' },
    granular: { position: 45, density: 60, spray: 30, grainSize: 80, jitter: 15 },
    reverbSend: 0.3,
    delaySend: 0.25,
  };

  // Gravitation Orbital Attractor Satellites
  public satellites: SatelliteNode[] = [
    {
      id: 'alpha',
      name: 'Alpha Node',
      label: 'α [320Hz]',
      x: 105,
      y: 78,
      color: '#00f0ff',
      radius: 9,
      orbitRadius: 85,
      orbitSpeed: 0.3,
      angle: (45 * Math.PI) / 180,
    },
    {
      id: 'beta',
      name: 'Beta Node',
      label: 'β [780Hz]',
      x: 225,
      y: 110,
      color: '#ffb86b',
      radius: 8,
      orbitRadius: 110,
      orbitSpeed: -0.22,
      angle: (140 * Math.PI) / 180,
    },
    {
      id: 'gamma',
      name: 'Gamma Node',
      label: 'γ [Sub Mod]',
      x: 200,
      y: 230,
      color: '#ddb7ff',
      radius: 7,
      orbitRadius: 95,
      orbitSpeed: 0.18,
      angle: (220 * Math.PI) / 180,
    },
    {
      id: 'delta',
      name: 'Delta Node',
      label: 'δ [Res Peak]',
      x: 70,
      y: 190,
      color: '#7df4ff',
      radius: 7,
      orbitRadius: 100,
      orbitSpeed: -0.26,
      angle: (310 * Math.PI) / 180,
    },
  ];

  public presets: Record<string, SynthPreset> = {
    solaris: {
      name: 'Solaris Shimmer Lead',
      category: 'Ambient Poly',
      author: 'Resonance Lab',
      waveform: 'sawtooth',
      unisonCount: 3,
      unisonDetune: 22,
      portamento: 45,
      filterType: 'lowpass',
      cutoff: 2200,
      resonance: 4.2,
      filterDrive: 12,
      filterEnvDepth: 2800,
      ampEnv: { attack: 0.04, decay: 0.3, sustain: 0.7, release: 0.5 },
      filterEnv: { attack: 0.08, decay: 0.4, sustain: 0.4, release: 0.6 },
      lfo1: { shape: 'sine', rate: 3.5, depth: 0.15, dest: 'cutoff' },
      lfo2: { shape: 'triangle', rate: 0.4, depth: 0.25, dest: 'pan' },
      granular: { position: 40, density: 75, spray: 25, grainSize: 90, jitter: 12 },
      reverbSend: 0.35,
      delaySend: 0.3,
    },
    cyber_bass: {
      name: 'Cyber Sub Singularity',
      category: 'Bass / Reese',
      author: 'Aethersynth Core',
      waveform: 'sawtooth',
      unisonCount: 5,
      unisonDetune: 35,
      portamento: 60,
      filterType: 'lowpass',
      cutoff: 650,
      resonance: 6.5,
      filterDrive: 45,
      filterEnvDepth: 1200,
      ampEnv: { attack: 0.01, decay: 0.4, sustain: 0.85, release: 0.2 },
      filterEnv: { attack: 0.02, decay: 0.35, sustain: 0.2, release: 0.2 },
      lfo1: { shape: 'triangle', rate: 1.8, depth: 0.3, dest: 'cutoff' },
      lfo2: { shape: 'sine', rate: 0.2, depth: 0.1, dest: 'pitch' },
      granular: { position: 10, density: 30, spray: 10, grainSize: 40, jitter: 5 },
      reverbSend: 0.1,
      delaySend: 0.05,
    },
    orbital_pad: {
      name: 'Orbital Horizon Pad',
      category: 'Atmosphere',
      author: 'Resonance Lab',
      waveform: 'triangle',
      unisonCount: 4,
      unisonDetune: 18,
      portamento: 80,
      filterType: 'bandpass',
      cutoff: 1400,
      resonance: 2.8,
      filterDrive: 8,
      filterEnvDepth: 1800,
      ampEnv: { attack: 0.35, decay: 0.8, sustain: 0.8, release: 1.2 },
      filterEnv: { attack: 0.4, decay: 0.9, sustain: 0.5, release: 1.0 },
      lfo1: { shape: 'sine', rate: 0.8, depth: 0.3, dest: 'pan' },
      lfo2: { shape: 'sine', rate: 0.3, depth: 0.2, dest: 'cutoff' },
      granular: { position: 70, density: 85, spray: 45, grainSize: 120, jitter: 20 },
      reverbSend: 0.5,
      delaySend: 0.4,
    },
  };

  private masterGain: GainNode;
  private lastPlayedFreq: number = 261.63; // C4

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.masterGain = ctx.createGain();
    this.masterGain.connect(this.outputNode);
    this.setMasterLevel(this.state.masterLevel);
    this.loadPreset('solaris');
  }

  public setMasterLevel(dB: number) {
    this.state.masterLevel = dB;
    const gainVal = Math.pow(10, dB / 20);
    this.masterGain.gain.setTargetAtTime(gainVal, this.ctx.currentTime, 0.03);
  }

  public noteOn(midiNote: number, velocity: number = 0.8) {
    if (this.activeVoices.has(midiNote)) {
      this.noteOff(midiNote);
    }

    // Polyphony voice-stealing check
    if (this.activeVoices.size >= this.state.polyphony) {
      const oldestKey = this.activeVoices.keys().next().value;
      if (oldestKey !== undefined) {
        this.noteOff(oldestKey);
      }
    }

    const t = this.ctx.currentTime;
    const targetFreq = 440 * Math.pow(2, (midiNote - 69) / 12);

    // Portamento glide
    const startFreq = this.state.portamento > 0 && this.activeVoices.size === 0 ? this.lastPlayedFreq : targetFreq;
    this.lastPlayedFreq = targetFreq;

    // Calculate Gravitational timbre influence
    const gravMod = this.calculateGravitationalMod();

    // Voice components
    const ampGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = this.state.filterType;

    // Filter modulation
    const baseCutoff = Math.max(20, Math.min(20000, this.state.cutoff * gravMod.cutoffRatio));
    const peakCutoff = Math.max(20, Math.min(20000, baseCutoff + this.state.filterEnvDepth));
    const sustainCutoff = baseCutoff + this.state.filterEnvDepth * this.state.filterEnv.sustain;

    filter.frequency.setValueAtTime(baseCutoff, t);
    filter.frequency.linearRampToValueAtTime(peakCutoff, t + this.state.filterEnv.attack);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, sustainCutoff), t + this.state.filterEnv.attack + this.state.filterEnv.decay);
    filter.Q.setValueAtTime(this.state.resonance * gravMod.resRatio, t);

    // Amplitude envelope
    const peakAmp = velocity * 0.4;
    ampGain.gain.setValueAtTime(0.0001, t);
    ampGain.gain.linearRampToValueAtTime(peakAmp, t + this.state.ampEnv.attack);
    ampGain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peakAmp * this.state.ampEnv.sustain),
      t + this.state.ampEnv.attack + this.state.ampEnv.decay
    );

    // Stereo panner
    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(gravMod.panOffset, t);

    // Unison Oscillators
    const oscillators: OscillatorNode[] = [];
    const unisonCount = this.state.unisonCount;
    const detuneSpread = this.state.unisonDetune;

    for (let i = 0; i < unisonCount; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = this.state.waveform;

      let detune = 0;
      if (unisonCount > 1) {
        detune = (i / (unisonCount - 1) - 0.5) * 2 * detuneSpread;
      }
      osc.detune.setValueAtTime(detune, t);

      osc.frequency.setValueAtTime(startFreq, t);
      if (this.state.portamento > 0 && startFreq !== targetFreq) {
        osc.frequency.exponentialRampToValueAtTime(targetFreq, t + this.state.portamento / 1000);
      }

      osc.connect(filter);
      osc.start(t);
      oscillators.push(osc);
    }

    // Sub-harmonic oscillator (modulated by Gamma satellite)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(targetFreq / 2, t);
    const subGain = this.ctx.createGain();
    subGain.gain.value = gravMod.subLevel * 0.5;
    subOsc.connect(subGain);
    subGain.connect(filter);
    subOsc.start(t);

    filter.connect(ampGain);
    ampGain.connect(panner);
    panner.connect(this.masterGain);

    const stopVoice = () => {
      const offTime = this.ctx.currentTime;
      const releaseTime = this.state.ampEnv.release;
      ampGain.gain.cancelScheduledValues(offTime);
      ampGain.gain.setValueAtTime(ampGain.gain.value, offTime);
      ampGain.gain.exponentialRampToValueAtTime(0.0001, offTime + releaseTime);

      filter.frequency.cancelScheduledValues(offTime);
      filter.frequency.setValueAtTime(filter.frequency.value, offTime);
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, baseCutoff * 0.5), offTime + releaseTime);

      setTimeout(() => {
        oscillators.forEach((o) => {
          try {
            o.stop();
            o.disconnect();
          } catch {
            // Already stopped
          }
        });
        try {
          subOsc.stop();
          subOsc.disconnect();
          filter.disconnect();
          ampGain.disconnect();
          panner.disconnect();
        } catch {
          // Cleaned up
        }
      }, releaseTime * 1000 + 100);
    };

    this.activeVoices.set(midiNote, {
      oscillators,
      subOsc,
      filter,
      ampGain,
      filterGain: subGain,
      panner,
      stopVoice,
    });
  }

  public noteOff(midiNote: number) {
    const voice = this.activeVoices.get(midiNote);
    if (voice) {
      voice.stopVoice();
      this.activeVoices.delete(midiNote);
    }
  }

  public releaseAll() {
    this.activeVoices.forEach((voice) => voice.stopVoice());
    this.activeVoices.clear();
  }

  // --- Gravitation Timbre Physics ---

  public updateSatellites(deltaSec: number, animate: boolean = true) {
    if (!animate) return;
    const centerX = 150;
    const centerY = 150;

    this.satellites.forEach((sat) => {
      sat.angle += sat.orbitSpeed * deltaSec;
      sat.x = centerX + Math.cos(sat.angle) * sat.orbitRadius;
      sat.y = centerY + Math.sin(sat.angle) * sat.orbitRadius * 0.8; // slightly elliptical
    });
  }

  public calculateGravitationalMod() {
    const centerX = 150;
    const centerY = 150;

    // Distances from central black hole
    const distAlpha = Math.hypot(this.satellites[0].x - centerX, this.satellites[0].y - centerY);
    const distBeta = Math.hypot(this.satellites[1].x - centerX, this.satellites[1].y - centerY);
    const distGamma = Math.hypot(this.satellites[2].x - centerX, this.satellites[2].y - centerY);
    const distDelta = Math.hypot(this.satellites[3].x - centerX, this.satellites[3].y - centerY);

    // Alpha modulates cutoff brightness (closer = brighter)
    const cutoffRatio = Math.max(0.4, Math.min(2.5, 1.8 - distAlpha / 120));
    // Beta modulates overtone warmth
    const overtoneMod = Math.max(0.1, Math.min(2.0, 1.5 - distBeta / 130));
    // Gamma modulates sub-harmonic depth
    const subLevel = Math.max(0.1, Math.min(1.0, 1.3 - distGamma / 110));
    // Delta modulates resonance peak
    const resRatio = Math.max(0.5, Math.min(2.2, 1.7 - distDelta / 120));
    // Overall stereo pan from alpha vs beta horizontal displacement
    const panOffset = Math.max(-0.6, Math.min(0.6, (this.satellites[0].x - 150) / 250));

    return { cutoffRatio, overtoneMod, subLevel, resRatio, panOffset };
  }

  public loadPreset(key: string) {
    const preset = this.presets[key];
    if (!preset) return;

    this.state.waveform = preset.waveform;
    this.state.unisonCount = preset.unisonCount;
    this.state.unisonDetune = preset.unisonDetune;
    this.state.portamento = preset.portamento;
    this.state.filterType = preset.filterType;
    this.state.cutoff = preset.cutoff;
    this.state.resonance = preset.resonance;
    this.state.filterDrive = preset.filterDrive;
    this.state.filterEnvDepth = preset.filterEnvDepth;
    this.state.ampEnv = { ...preset.ampEnv };
    this.state.filterEnv = { ...preset.filterEnv };
    this.state.lfo1 = { ...preset.lfo1 };
    this.state.lfo2 = { ...preset.lfo2 };
    this.state.granular = { ...preset.granular };
    this.state.reverbSend = preset.reverbSend;
    this.state.delaySend = preset.delaySend;
  }
}
