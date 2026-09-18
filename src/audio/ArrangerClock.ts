// Arranger Clock & Multi-Track Sequencer Engine with Web Audio Lookahead Scheduling

export interface ArrangerClip {
  id: string;
  name: string;
  startBar: number;
  durationBars: number;
  color: string;
  notes?: { midi: number; startStep: number; durationSteps: number }[];
}

export interface ArrangerTrack {
  id: number;
  name: string;
  category: string;
  color: string;
  volume: number; // 0 - 100
  pan: number; // -50 - 50
  muted: boolean;
  solo: boolean;
  clips: ArrangerClip[];
}

export class ArrangerClock {
  private ctx: AudioContext;
  public isPlaying: boolean = false;
  public bpm: number = 128;
  public metronomeEnabled: boolean = false;
  public loopEnabled: boolean = true;
  public loopStartBar: number = 1;
  public loopEndBar: number = 9; // 8 bars cycle

  // Current positions
  public currentBar: number = 1;
  public currentBeat: number = 1;
  public currentTick: number = 0;
  public currentStep16: number = 0;

  // Multi-track state
  public tracks: ArrangerTrack[] = [
    {
      id: 1,
      name: 'Kick / Sub Matrix',
      category: 'AUDIO',
      color: '#ef4444',
      volume: 85,
      pan: 0,
      muted: false,
      solo: false,
      clips: [
        { id: 'c1', name: 'Main Kick 808 - 8 Bar', startBar: 1, durationBars: 8, color: '#ef4444' },
        { id: 'c1b', name: 'Drop Kick Loop', startBar: 9, durationBars: 8, color: '#ef4444' },
      ],
    },
    {
      id: 2,
      name: 'Bassline Synth 303',
      category: 'SYNTH',
      color: '#ff9f1c',
      volume: 80,
      pan: 0,
      muted: false,
      solo: false,
      clips: [
        { id: 'c2', name: 'Acid Resonance Drive', startBar: 1, durationBars: 8, color: '#ff9f1c' },
        { id: 'c2b', name: 'Reese Bass Mod', startBar: 9, durationBars: 8, color: '#ff9f1c' },
      ],
    },
    {
      id: 3,
      name: 'Orbital Lead Hook',
      category: 'SYNTH',
      color: '#00f0ff',
      volume: 78,
      pan: -15,
      muted: false,
      solo: false,
      clips: [
        { id: 'c3', name: 'Solaris Arp Theme', startBar: 3, durationBars: 6, color: '#00f0ff' },
        { id: 'c3b', name: 'Solaris Chorus Lead', startBar: 9, durationBars: 8, color: '#00f0ff' },
      ],
    },
    {
      id: 4,
      name: 'Percussion & Hats',
      category: 'DRUM',
      color: '#ddb7ff',
      volume: 74,
      pan: 12,
      muted: false,
      solo: false,
      clips: [
        { id: 'c4', name: 'Hi-Hat 16th Rolls', startBar: 1, durationBars: 8, color: '#ddb7ff' },
        { id: 'c4b', name: 'Breakbeat Syncopation', startBar: 9, durationBars: 8, color: '#ddb7ff' },
      ],
    },
    {
      id: 5,
      name: 'Ambient Pad Glow',
      category: 'SYNTH',
      color: '#7df4ff',
      volume: 68,
      pan: 0,
      muted: false,
      solo: false,
      clips: [
        { id: 'c5', name: 'Ethereal Drone Bed', startBar: 1, durationBars: 8, color: '#7df4ff' },
        { id: 'c5b', name: 'Granular Shimmer', startBar: 9, durationBars: 8, color: '#7df4ff' },
      ],
    },
    {
      id: 6,
      name: 'FX Riser & Textures',
      category: 'FX',
      color: '#10b981',
      volume: 70,
      pan: 20,
      muted: false,
      solo: false,
      clips: [
        { id: 'c6', name: 'White Noise Riser 8B', startBar: 5, durationBars: 4, color: '#10b981' },
        { id: 'c6b', name: 'Downshifter Impact', startBar: 9, durationBars: 2, color: '#10b981' },
      ],
    },
  ];

  // Lookahead timing engine
  private lookaheadIntervalId: number | null = null;
  private nextStepTime: number = 0;
  private currentTotalStep: number = 0;
  private scheduleAheadTime: number = 0.1; // 100ms lookahead
  private tickResolution: number = 480; // PPQN (ticks per quarter note)

  // Callbacks
  public onStepScheduled?: (stepIndex16: number, time: number) => void;
  public onPlayheadUpdate?: (bar: number, beat: number, tick: number, step16: number) => void;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  public play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.nextStepTime = this.ctx.currentTime + 0.05;

    // Reset step based on currentBar
    const barOffset = this.currentBar - 1;
    this.currentTotalStep = barOffset * 16 + (this.currentBeat - 1) * 4;

    this.lookaheadIntervalId = window.setInterval(() => this.scheduler(), 25);
  }

  public pause() {
    this.isPlaying = false;
    if (this.lookaheadIntervalId !== null) {
      clearInterval(this.lookaheadIntervalId);
      this.lookaheadIntervalId = null;
    }
  }

  public stop() {
    this.pause();
    this.currentBar = this.loopEnabled ? this.loopStartBar : 1;
    this.currentBeat = 1;
    this.currentTick = 0;
    this.currentStep16 = 0;
    this.currentTotalStep = (this.currentBar - 1) * 16;
    if (this.onPlayheadUpdate) {
      this.onPlayheadUpdate(this.currentBar, this.currentBeat, this.currentTick, this.currentStep16);
    }
  }

  public setBPM(newBpm: number) {
    this.bpm = Math.max(40, Math.min(300, newBpm));
  }

  private scheduler() {
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPer16th = secondsPerBeat / 4;

    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentTotalStep, this.nextStepTime);

      // Advance by one 16th note with optional swing
      let stepDuration = secondsPer16th;
      const isOdd16th = this.currentTotalStep % 2 === 1;
      const swingOffset = isOdd16th ? 0.08 * secondsPer16th : 0;
      this.nextStepTime += stepDuration + (isOdd16th ? -swingOffset : swingOffset);

      this.currentTotalStep++;

      // Check loop boundary
      if (this.loopEnabled && this.currentTotalStep >= (this.loopEndBar - 1) * 16) {
        this.currentTotalStep = (this.loopStartBar - 1) * 16;
      }
    }
  }

  private scheduleStep(step: number, time: number) {
    const step16 = step % 16;
    const bar = Math.floor(step / 16) + 1;
    const beat = Math.floor((step % 16) / 4) + 1;
    const tick = Math.floor(((step % 4) / 4) * this.tickResolution);

    // Trigger step callback
    if (this.onStepScheduled) {
      this.onStepScheduled(step16, time);
    }

    // Metronome click on quarter note start
    if (this.metronomeEnabled && step % 4 === 0) {
      this.playMetronomeTick(time, beat === 1);
    }

    // Update UI playhead closely aligned to audio time
    const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000);
    setTimeout(() => {
      if (!this.isPlaying) return;
      this.currentBar = bar;
      this.currentBeat = beat;
      this.currentTick = tick;
      this.currentStep16 = step16;
      if (this.onPlayheadUpdate) {
        this.onPlayheadUpdate(bar, beat, tick, step16);
      }
    }, delayMs);
  }

  private playMetronomeTick(t: number, isDownbeat: boolean) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(isDownbeat ? 1400 : 880, t);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.035);
  }
}
