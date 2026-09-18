// Drum Machine Engine: 16 Procedural DSP Drum Voices, 8-Track 16-Step Sequencer

export interface DrumPad {
  id: number;
  name: string;
  subtitle: string;
  category: string;
  color: string;
  gain: number;
  pitch: number; // semitones (-12 to +12)
  attack: number; // ms
  decay: number; // ms
  cutoff: number; // Hz
}

export interface DrumStep {
  active: boolean;
  velocity: number; // 0 - 1
  accent: boolean;
}

export interface DrumTrack {
  id: number;
  padId: number;
  name: string;
  muted: boolean;
  solo: boolean;
  steps: DrumStep[];
}

export class DrumEngine {
  private ctx: AudioContext;
  public outputNode: GainNode;

  public pads: DrumPad[] = [
    { id: 0, name: 'Kick 808', subtitle: 'Analog Punch', category: 'BASS', color: '#ef4444', gain: 0.95, pitch: 0, attack: 2, decay: 350, cutoff: 8000 },
    { id: 1, name: 'Snare Tight', subtitle: 'Layered Crisp', category: 'MID', color: '#00f0ff', gain: 0.88, pitch: 0, attack: 1, decay: 180, cutoff: 12000 },
    { id: 2, name: 'Clap Neo', subtitle: 'Stereo Spread', category: 'CRACK', color: '#ffb86b', gain: 0.85, pitch: 0, attack: 2, decay: 220, cutoff: 10000 },
    { id: 3, name: 'Hi-Hat Closed', subtitle: 'Titanium Sizzle', category: 'CHK 1', color: '#ffdcbc', gain: 0.8, pitch: 0, attack: 1, decay: 50, cutoff: 14000 },
    { id: 4, name: 'Hi-Hat Open', subtitle: 'Airy Decay', category: 'CHK 1', color: '#7df4ff', gain: 0.75, pitch: 0, attack: 1, decay: 280, cutoff: 13000 },
    { id: 5, name: 'Perc Shaker', subtitle: 'Organic Velvet', category: 'PERC', color: '#ddb7ff', gain: 0.7, pitch: 0, attack: 8, decay: 90, cutoff: 9000 },
    { id: 6, name: 'Tom Hi', subtitle: 'Resonant Acoustic', category: 'PERC', color: '#10b981', gain: 0.82, pitch: 2, attack: 3, decay: 200, cutoff: 7000 },
    { id: 7, name: 'Tom Low', subtitle: 'Deep Floor', category: 'BASS', color: '#ef4444', gain: 0.88, pitch: -3, attack: 4, decay: 280, cutoff: 5000 },
    { id: 8, name: 'Rimshot', subtitle: 'Studio Woodblock', category: 'PERC', color: '#b9cacb', gain: 0.75, pitch: 0, attack: 1, decay: 60, cutoff: 6000 },
    { id: 9, name: 'Laser Zap', subtitle: 'Modular FM Sweep', category: 'FX', color: '#00f0ff', gain: 0.72, pitch: 0, attack: 1, decay: 120, cutoff: 11000 },
    { id: 10, name: 'Crash 18"', subtitle: 'Analog Wash', category: 'METL', color: '#ffb86b', gain: 0.65, pitch: 0, attack: 5, decay: 1200, cutoff: 15000 },
    { id: 11, name: 'Ride Bell', subtitle: 'Dual Ping', category: 'METL', color: '#ffdcbc', gain: 0.7, pitch: 0, attack: 2, decay: 800, cutoff: 12000 },
    { id: 12, name: 'Sub Drop', subtitle: '32Hz Earthshaker', category: 'BASS', color: '#ef4444', gain: 0.9, pitch: -5, attack: 10, decay: 900, cutoff: 350 },
    { id: 13, name: 'FX Glitch', subtitle: 'Sample & Hold', category: 'FX', color: '#a855f7', gain: 0.78, pitch: 0, attack: 1, decay: 140, cutoff: 8000 },
    { id: 14, name: 'Synth Stab', subtitle: 'Neo Detroit Min7', category: 'SYNTH', color: '#00f0ff', gain: 0.75, pitch: 0, attack: 5, decay: 240, cutoff: 6500 },
    { id: 15, name: 'Vox Chant', subtitle: 'Formant Filter "Hey"', category: 'VOX', color: '#ff9f1c', gain: 0.8, pitch: 0, attack: 8, decay: 200, cutoff: 4500 },
  ];

  public tracks: DrumTrack[] = [];
  public swing: number = 0.58; // 50% = straight, 58% = standard groove

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.initTracks();
    this.loadPattern('cyberpunk');
  }

  private initTracks() {
    const trackPadAssignments = [0, 1, 2, 3, 4, 5, 7, 14]; // 8 primary tracks
    this.tracks = trackPadAssignments.map((padId, index) => ({
      id: index,
      padId,
      name: this.pads[padId].name,
      muted: false,
      solo: false,
      steps: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8, accent: false })),
    }));
  }

  public triggerPad(padId: number, velocity: number = 1.0, time?: number) {
    const pad = this.pads[padId];
    if (!pad) return;

    const t = time ?? this.ctx.currentTime;
    const gainFactor = pad.gain * velocity;

    switch (padId) {
      case 0: // Kick 808
        this.playKick(t, gainFactor, pad);
        break;
      case 1: // Snare Tight
        this.playSnare(t, gainFactor, pad);
        break;
      case 2: // Clap Neo
        this.playClap(t, gainFactor, pad);
        break;
      case 3: // Hi-Hat Closed
        this.playHiHat(t, gainFactor, false, pad);
        break;
      case 4: // Hi-Hat Open
        this.playHiHat(t, gainFactor, true, pad);
        break;
      case 5: // Shaker
        this.playShaker(t, gainFactor, pad);
        break;
      case 6: // Tom Hi
        this.playTom(t, 220, gainFactor, pad);
        break;
      case 7: // Tom Low
        this.playTom(t, 110, gainFactor, pad);
        break;
      case 8: // Rimshot
        this.playRimshot(t, gainFactor, pad);
        break;
      case 9: // Laser Zap
        this.playZap(t, gainFactor, pad);
        break;
      case 10: // Crash
        this.playCrash(t, gainFactor, pad);
        break;
      case 11: // Ride
        this.playRide(t, gainFactor, pad);
        break;
      case 12: // Sub Drop
        this.playSubDrop(t, gainFactor, pad);
        break;
      case 13: // Glitch
        this.playGlitch(t, gainFactor, pad);
        break;
      case 14: // Synth Stab
        this.playSynthStab(t, gainFactor, pad);
        break;
      case 15: // Vox Chant
        this.playVoxChant(t, gainFactor, pad);
        break;
      default:
        this.playKick(t, gainFactor, pad);
    }
  }

  // --- Voice Synthesis Models ---

  private playKick(t: number, vel: number, pad: DrumPad) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const pitchRatio = Math.pow(2, pad.pitch / 12);
    const startFreq = 160 * pitchRatio;
    const endFreq = 42 * pitchRatio;
    const decaySec = pad.decay / 1000;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.04);
    osc.frequency.exponentialRampToValueAtTime(30 * pitchRatio, t + decaySec);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vel, t + pad.attack / 1000);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decaySec);

    // Click transient
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(380, t);
    click.frequency.exponentialRampToValueAtTime(50, t + 0.015);
    clickGain.gain.setValueAtTime(vel * 0.4, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    click.connect(clickGain);
    clickGain.connect(this.outputNode);
    click.start(t);
    click.stop(t + 0.02);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(t);
    osc.stop(t + decaySec);
  }

  private playSnare(t: number, vel: number, pad: DrumPad) {
    const decaySec = pad.decay / 1000;

    // Body tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.05);

    oscGain.gain.setValueAtTime(vel * 0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + decaySec * 0.7);

    osc.connect(oscGain);
    oscGain.connect(this.outputNode);
    osc.start(t);
    osc.stop(t + decaySec);

    // Noise snap
    const noiseBuffer = this.createNoiseBuffer(decaySec);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1200;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(vel * 0.9, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + decaySec);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.outputNode);
    noise.start(t);
    noise.stop(t + decaySec);
  }

  private playClap(t: number, vel: number, pad: DrumPad) {
    const decaySec = pad.decay / 1000;
    const bursts = [0, 0.011, 0.024];

    bursts.forEach((offset) => {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.03);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 2.5;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vel * 0.7, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.025);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.outputNode);

      noise.start(t + offset);
      noise.stop(t + offset + 0.03);
    });

    // Main tail
    const tail = this.ctx.createBufferSource();
    tail.buffer = this.createNoiseBuffer(decaySec);
    const tailFilter = this.ctx.createBiquadFilter();
    tailFilter.type = 'bandpass';
    tailFilter.frequency.value = 1200;
    tailFilter.Q.value = 2.0;

    const tailGain = this.ctx.createGain();
    tailGain.gain.setValueAtTime(vel * 0.8, t + 0.03);
    tailGain.gain.exponentialRampToValueAtTime(0.001, t + decaySec);

    tail.connect(tailFilter);
    tailFilter.connect(tailGain);
    tailGain.connect(this.outputNode);

    tail.start(t + 0.03);
    tail.stop(t + decaySec);
  }

  private playHiHat(t: number, vel: number, isOpen: boolean, pad: DrumPad) {
    const decaySec = (isOpen ? pad.decay : 45) / 1000;

    // Metallic square wave cluster
    const freqs = [385, 520, 715, 840, 1100, 1450];
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decaySec);

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = pad.cutoff * 0.7;
    bandpass.Q.value = 1.2;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = Math.max(1000, pad.cutoff * 0.55);

    freqs.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.connect(bandpass);
      osc.start(t);
      osc.stop(t + decaySec);
    });

    bandpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(this.outputNode);
  }

  private playShaker(t: number, vel: number, pad: DrumPad) {
    const decaySec = pad.decay / 1000;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(decaySec);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = pad.cutoff * 0.7;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(vel * 0.6, t + pad.attack / 1000);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decaySec);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    noise.start(t);
    noise.stop(t + decaySec);
  }

  private playTom(t: number, baseFreq: number, vel: number, pad: DrumPad) {
    const decaySec = pad.decay / 1000;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const pitchRatio = Math.pow(2, pad.pitch / 12);
    const startFreq = baseFreq * 1.8 * pitchRatio;
    const endFreq = baseFreq * pitchRatio;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + decaySec);

    gain.gain.setValueAtTime(vel * 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decaySec);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(t);
    osc.stop(t + decaySec);
  }

  private playRimshot(t: number, vel: number, pad: DrumPad) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pitchRatio = Math.pow(2, pad.pitch / 12);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 * pitchRatio, t);
    osc.frequency.exponentialRampToValueAtTime(250 * pitchRatio, t + 0.02);

    gain.gain.setValueAtTime(vel * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.outputNode);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  private playZap(t: number, vel: number, pad: DrumPad) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pitchRatio = Math.pow(2, pad.pitch / 12);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400 * pitchRatio, t);
    osc.frequency.exponentialRampToValueAtTime(60 * pitchRatio, t + 0.1);

    gain.gain.setValueAtTime(vel * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.outputNode);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  private playCrash(t: number, vel: number, pad: DrumPad) {
    const decaySec = pad.decay / 1000;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(decaySec);

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = pad.cutoff * 0.4;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decaySec);

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(this.outputNode);

    noise.start(t);
    noise.stop(t + decaySec);
  }

  private playRide(t: number, vel: number, pad: DrumPad) {
    const decaySec = pad.decay / 1000;
    const pitchRatio = Math.pow(2, pad.pitch / 12);
    const partials = [590 * pitchRatio, 830 * pitchRatio, 1140 * pitchRatio];
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decaySec);

    partials.forEach((f) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + decaySec);
    });

    gain.connect(this.outputNode);
  }

  private playSubDrop(t: number, vel: number, pad: DrumPad) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pitchRatio = Math.pow(2, pad.pitch / 12);
    osc.frequency.setValueAtTime(110 * pitchRatio, t);
    osc.frequency.exponentialRampToValueAtTime(32 * pitchRatio, t + 0.9);

    gain.gain.setValueAtTime(vel * 0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

    osc.connect(gain);
    gain.connect(this.outputNode);
    osc.start(t);
    osc.stop(t + 0.95);
  }

  private playGlitch(t: number, vel: number, pad: DrumPad) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.12);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pad.cutoff, t);
    filter.frequency.linearRampToValueAtTime(300, t + 0.1);
    filter.Q.value = 8.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    noise.start(t);
    noise.stop(t + 0.12);
  }

  private playSynthStab(t: number, vel: number, pad: DrumPad) {
    const pitchRatio = Math.pow(2, pad.pitch / 12);
    const chord = [220 * pitchRatio, 261.63 * pitchRatio, 329.63 * pitchRatio, 392.0 * pitchRatio]; // Am7
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(pad.cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.22);

    chord.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + 0.25);
    });

    filter.connect(gain);
    gain.connect(this.outputNode);
  }

  private playVoxChant(t: number, vel: number, pad: DrumPad) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.2);

    const pitchRatio = Math.pow(2, pad.pitch / 12);
    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.value = 750 * pitchRatio; // Vowel formant
    filter1.Q.value = 4.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    noise.connect(filter1);
    filter1.connect(gain);
    gain.connect(this.outputNode);

    noise.start(t);
    noise.stop(t + 0.2);
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // --- Step Sequencer Patterns ---

  public loadPattern(kit: 'cyberpunk' | 'detroit' | 'lofi' | 'ukg') {
    this.clearPattern();

    if (kit === 'cyberpunk') {
      // Kick: 1, 7, 11
      [0, 6, 10].forEach((s) => (this.tracks[0].steps[s] = { active: true, velocity: 1.0, accent: s === 0 }));
      // Snare: 4, 12
      [4, 12].forEach((s) => (this.tracks[1].steps[s] = { active: true, velocity: 0.9, accent: true }));
      // Clap: 12
      [12].forEach((s) => (this.tracks[2].steps[s] = { active: true, velocity: 0.85, accent: false }));
      // Hi-Hat Closed: 16th notes with velocity roll
      for (let s = 0; s < 16; s++) {
        const vel = s % 2 === 0 ? 0.85 : 0.6;
        this.tracks[3].steps[s] = { active: true, velocity: vel, accent: s % 4 === 2 };
      }
      // Hi-Hat Open: 2, 10
      [2, 10].forEach((s) => (this.tracks[4].steps[s] = { active: true, velocity: 0.75, accent: false }));
      // Synth Stab: 6, 14
      [6, 14].forEach((s) => (this.tracks[7].steps[s] = { active: true, velocity: 0.7, accent: true }));
    } else if (kit === 'detroit') {
      // Four on the floor kick
      [0, 4, 8, 12].forEach((s) => (this.tracks[0].steps[s] = { active: true, velocity: 1.0, accent: true }));
      // Snare: 4, 12
      [4, 12].forEach((s) => (this.tracks[1].steps[s] = { active: true, velocity: 0.9, accent: false }));
      // Clap on 4, 12
      [4, 12].forEach((s) => (this.tracks[2].steps[s] = { active: true, velocity: 0.95, accent: true }));
      // Off-beat Open Hat: 2, 6, 10, 14
      [2, 6, 10, 14].forEach((s) => (this.tracks[4].steps[s] = { active: true, velocity: 0.9, accent: true }));
      // Closed Hat straight 16ths
      [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15].forEach(
        (s) => (this.tracks[3].steps[s] = { active: true, velocity: 0.65, accent: false })
      );
    } else if (kit === 'lofi') {
      // Boom-bap kick: 0, 3, 10
      [0, 3, 10].forEach((s) => (this.tracks[0].steps[s] = { active: true, velocity: 0.88, accent: s === 0 }));
      // Snare: 4, 12
      [4, 12].forEach((s) => (this.tracks[1].steps[s] = { active: true, velocity: 0.85, accent: true }));
      // Closed Hat swung 8ths
      [0, 2, 4, 6, 8, 10, 12, 14].forEach((s) => (this.tracks[3].steps[s] = { active: true, velocity: 0.7, accent: false }));
      // Shaker on all 16ths
      for (let s = 0; s < 16; s++) {
        this.tracks[5].steps[s] = { active: true, velocity: s % 2 === 0 ? 0.6 : 0.45, accent: false };
      }
    } else if (kit === 'ukg') {
      // 2-Step UKG: Kick 0, 7; Snare 4, 12; Ghost Kick 10
      [0, 7, 10].forEach((s) => (this.tracks[0].steps[s] = { active: true, velocity: s === 10 ? 0.65 : 0.95, accent: s === 0 }));
      [4, 12].forEach((s) => (this.tracks[1].steps[s] = { active: true, velocity: 0.9, accent: true }));
      // Shuffle hats
      [0, 2, 3, 5, 6, 8, 9, 11, 13, 14, 15].forEach(
        (s) => (this.tracks[3].steps[s] = { active: true, velocity: s % 3 === 0 ? 0.85 : 0.55, accent: false })
      );
      [2, 14].forEach((s) => (this.tracks[4].steps[s] = { active: true, velocity: 0.75, accent: false }));
    }
  }

  public clearPattern() {
    this.tracks.forEach((track) => {
      track.steps.forEach((step) => {
        step.active = false;
      });
    });
  }

  public randomizePattern() {
    this.clearPattern();
    // Kick: high probability on 0, 8; medium on 6, 10, 14
    [0, 8].forEach((s) => (this.tracks[0].steps[s] = { active: true, velocity: 1.0, accent: true }));
    if (Math.random() > 0.4) this.tracks[0].steps[6] = { active: true, velocity: 0.85, accent: false };
    if (Math.random() > 0.3) this.tracks[0].steps[10] = { active: true, velocity: 0.9, accent: false };
    if (Math.random() > 0.5) this.tracks[0].steps[14] = { active: true, velocity: 0.75, accent: false };

    // Snare / Clap: on 4, 12 always
    this.tracks[1].steps[4] = { active: true, velocity: 0.95, accent: true };
    this.tracks[1].steps[12] = { active: true, velocity: 0.95, accent: true };
    if (Math.random() > 0.5) this.tracks[2].steps[12] = { active: true, velocity: 0.8, accent: false };

    // Hats: dense 16ths with random accents
    for (let s = 0; s < 16; s++) {
      if (Math.random() > 0.25) {
        this.tracks[3].steps[s] = {
          active: true,
          velocity: 0.4 + Math.random() * 0.5,
          accent: Math.random() > 0.7,
        };
      }
    }

    // Open Hat on off-beats
    [2, 6, 10, 14].forEach((s) => {
      if (Math.random() > 0.4) {
        this.tracks[4].steps[s] = { active: true, velocity: 0.75, accent: false };
      }
    });

    // Perc / FX fills
    [7, 11, 15].forEach((s) => {
      if (Math.random() > 0.6) {
        this.tracks[5].steps[s] = { active: true, velocity: 0.7, accent: false };
      }
      if (Math.random() > 0.7) {
        this.tracks[7].steps[s] = { active: true, velocity: 0.65, accent: true };
      }
    });
  }
}
