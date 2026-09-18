// Plugin Insert Chain: Dynamic EQ, Tape Saturation, Space Reverb & Delay, Brickwall Limiter

export interface EQBandParams {
  frequency: number;
  gain: number;
  q: number;
  type: BiquadFilterType;
}

export interface PluginChainState {
  bypassed: boolean;
  eq: {
    bypassed: boolean;
    bands: EQBandParams[];
  };
  tape: {
    bypassed: boolean;
    drive: number; // 0 - 100
    warmth: number; // 0 - 100
    bias: number; // -50 - 50
  };
  space: {
    bypassed: boolean;
    reverbMix: number; // 0 - 1
    decay: number; // 0.1 - 5.0s
    delayTime: number; // 0.05 - 1.0s
    delayFeedback: number; // 0 - 0.85
    delayMix: number; // 0 - 1
  };
  limiter: {
    bypassed: boolean;
    threshold: number; // -24 to 0 dB
    ceiling: number; // -6 to 0 dB
    release: number; // 0.01 to 0.5s
  };
}

export class PluginChain {
  private ctx: AudioContext;
  public inputNode: GainNode;
  public outputNode: GainNode;

  // EQ filters
  private eqFilters: BiquadFilterNode[] = [];
  private eqBypassGain: GainNode;
  private eqWetGain: GainNode;

  // Tape Saturation
  private tapePreGain: GainNode;
  private tapeWaveShaper: WaveShaperNode;
  private tapeToneFilter: BiquadFilterNode;
  private tapePostGain: GainNode;
  private tapeBypassGain: GainNode;
  private tapeWetGain: GainNode;

  // Space Reverb & Delay
  private delayNode: DelayNode;
  private delayFeedbackGain: GainNode;
  private delayWetGain: GainNode;
  private convolverNode: ConvolverNode;
  private reverbWetGain: GainNode;
  private spaceDryGain: GainNode;

  // Brickwall Limiter
  private limiterNode: DynamicsCompressorNode;
  private limiterCeilingGain: GainNode;

  public state: PluginChainState = {
    bypassed: false,
    eq: {
      bypassed: false,
      bands: [
        { frequency: 80, gain: 2.0, q: 0.7, type: 'lowshelf' },
        { frequency: 450, gain: -1.5, q: 1.2, type: 'peaking' },
        { frequency: 2800, gain: 3.0, q: 1.4, type: 'peaking' },
        { frequency: 10000, gain: 4.5, q: 0.7, type: 'highshelf' },
      ],
    },
    tape: {
      bypassed: false,
      drive: 35,
      warmth: 65,
      bias: 5,
    },
    space: {
      bypassed: false,
      reverbMix: 0.25,
      decay: 2.4,
      delayTime: 0.375, // dotted 8th around 128 bpm
      delayFeedback: 0.35,
      delayMix: 0.2,
    },
    limiter: {
      bypassed: false,
      threshold: -2.5,
      ceiling: -0.1,
      release: 0.05,
    },
  };

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Build EQ
    this.eqBypassGain = ctx.createGain();
    this.eqWetGain = ctx.createGain();
    this.setupEQ();

    // 2. Build Tape Saturation
    this.tapePreGain = ctx.createGain();
    this.tapeWaveShaper = ctx.createWaveShaper();
    this.tapeWaveShaper.oversample = '4x';
    this.tapeToneFilter = ctx.createBiquadFilter();
    this.tapeToneFilter.type = 'lowpass';
    this.tapePostGain = ctx.createGain();
    this.tapeBypassGain = ctx.createGain();
    this.tapeWetGain = ctx.createGain();
    this.setupTape();

    // 3. Build Space (Delay + Algorithmic Reverb)
    this.delayNode = ctx.createDelay(2.0);
    this.delayFeedbackGain = ctx.createGain();
    this.delayWetGain = ctx.createGain();
    this.convolverNode = ctx.createConvolver();
    this.reverbWetGain = ctx.createGain();
    this.spaceDryGain = ctx.createGain();
    this.setupSpace();

    // 4. Build Limiter
    this.limiterNode = ctx.createDynamicsCompressor();
    this.limiterCeilingGain = ctx.createGain();
    this.setupLimiter();

    // Connect entire chain
    this.connectChain();
    this.applyAllParams();
  }

  private setupEQ() {
    this.eqFilters = this.state.eq.bands.map((band) => {
      const filter = this.ctx.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.q;
      return filter;
    });

    // Chain the 4 filters in series
    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }
  }

  private setupTape() {
    this.updateTapeCurve(this.state.tape.drive);
    this.tapeToneFilter.frequency.value = 14000;

    this.tapePreGain.connect(this.tapeWaveShaper);
    this.tapeWaveShaper.connect(this.tapeToneFilter);
    this.tapeToneFilter.connect(this.tapePostGain);
    this.tapePostGain.connect(this.tapeWetGain);
  }

  private updateTapeCurve(drive: number) {
    const k = (drive / 100) * 8 + 1; // 1 to 9 drive curve
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // Soft saturation polynomial sigmoid
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    this.tapeWaveShaper.curve = curve;
  }

  private setupSpace() {
    // Delay loop
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);

    // Synthetic Reverb Impulse Response
    this.generateReverbImpulse(this.state.space.decay);
    this.convolverNode.connect(this.reverbWetGain);
  }

  private generateReverbImpulse(duration: number) {
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (rate * (duration / 4)));
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    this.convolverNode.buffer = impulse;
  }

  private setupLimiter() {
    this.limiterNode.threshold.value = this.state.limiter.threshold;
    this.limiterNode.knee.value = 0.5;
    this.limiterNode.ratio.value = 20; // Hard limiting ratio
    this.limiterNode.attack.value = 0.001; // Ultra fast 1ms attack
    this.limiterNode.release.value = this.state.limiter.release;
    this.limiterCeilingGain.gain.value = Math.pow(10, this.state.limiter.ceiling / 20);
  }

  private connectChain() {
    // Input -> EQ (Wet / Dry)
    this.inputNode.connect(this.eqFilters[0]);
    this.inputNode.connect(this.eqBypassGain);

    const eqOut = this.ctx.createGain();
    this.eqFilters[this.eqFilters.length - 1].connect(this.eqWetGain);
    this.eqWetGain.connect(eqOut);
    this.eqBypassGain.connect(eqOut);

    // EQ -> Tape (Wet / Dry)
    eqOut.connect(this.tapePreGain);
    eqOut.connect(this.tapeBypassGain);

    const tapeOut = this.ctx.createGain();
    this.tapeWetGain.connect(tapeOut);
    this.tapeBypassGain.connect(tapeOut);

    // Tape -> Space (Delay & Reverb sends + Dry)
    tapeOut.connect(this.spaceDryGain);
    tapeOut.connect(this.delayNode);
    tapeOut.connect(this.convolverNode);

    const spaceOut = this.ctx.createGain();
    this.spaceDryGain.connect(spaceOut);
    this.delayWetGain.connect(spaceOut);
    this.reverbWetGain.connect(spaceOut);

    // Space -> Limiter
    spaceOut.connect(this.limiterNode);
    this.limiterNode.connect(this.limiterCeilingGain);
    this.limiterCeilingGain.connect(this.outputNode);
  }

  public setEQBand(index: number, frequency: number, gain: number, q: number) {
    if (this.eqFilters[index]) {
      this.eqFilters[index].frequency.setTargetAtTime(frequency, this.ctx.currentTime, 0.05);
      this.eqFilters[index].gain.setTargetAtTime(gain, this.ctx.currentTime, 0.05);
      this.eqFilters[index].Q.setTargetAtTime(q, this.ctx.currentTime, 0.05);
      this.state.eq.bands[index] = {
        ...this.state.eq.bands[index],
        frequency,
        gain,
        q,
      };
    }
  }

  public setTape(drive: number, warmth: number, bias: number) {
    this.state.tape.drive = drive;
    this.state.tape.warmth = warmth;
    this.state.tape.bias = bias;

    this.updateTapeCurve(drive);
    // Warmth rolls off high end
    const cutoff = 20000 - (warmth / 100) * 12000;
    this.tapeToneFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.05);
    // Pre/post compensation
    const preLevel = 1 + (drive / 100) * 2;
    this.tapePreGain.gain.setTargetAtTime(preLevel, this.ctx.currentTime, 0.05);
    this.tapePostGain.gain.setTargetAtTime(1 / Math.sqrt(preLevel), this.ctx.currentTime, 0.05);
  }

  public setSpace(reverbMix: number, delayTime: number, delayFeedback: number, delayMix: number) {
    this.state.space.reverbMix = reverbMix;
    this.state.space.delayTime = delayTime;
    this.state.space.delayFeedback = delayFeedback;
    this.state.space.delayMix = delayMix;

    this.reverbWetGain.gain.setTargetAtTime(reverbMix, this.ctx.currentTime, 0.05);
    this.delayNode.delayTime.setTargetAtTime(delayTime, this.ctx.currentTime, 0.05);
    this.delayFeedbackGain.gain.setTargetAtTime(delayFeedback, this.ctx.currentTime, 0.05);
    this.delayWetGain.gain.setTargetAtTime(delayMix, this.ctx.currentTime, 0.05);
    this.spaceDryGain.gain.setTargetAtTime(1 - Math.max(reverbMix, delayMix) * 0.5, this.ctx.currentTime, 0.05);
  }

  public setLimiter(threshold: number, ceiling: number, release: number) {
    this.state.limiter.threshold = threshold;
    this.state.limiter.ceiling = ceiling;
    this.state.limiter.release = release;

    this.limiterNode.threshold.setTargetAtTime(threshold, this.ctx.currentTime, 0.05);
    this.limiterNode.release.setTargetAtTime(release, this.ctx.currentTime, 0.05);
    this.limiterCeilingGain.gain.setTargetAtTime(Math.pow(10, ceiling / 20), this.ctx.currentTime, 0.05);
  }

  public getGainReduction(): number {
    return this.limiterNode.reduction;
  }

  public setBypassModule(module: 'all' | 'eq' | 'tape' | 'space' | 'limiter', bypass: boolean) {
    if (module === 'all') {
      this.state.bypassed = bypass;
      this.setBypassModule('eq', bypass);
      this.setBypassModule('tape', bypass);
      this.setBypassModule('space', bypass);
      this.setBypassModule('limiter', bypass);
      return;
    }

    if (module === 'eq') {
      this.state.eq.bypassed = bypass;
      this.eqWetGain.gain.setTargetAtTime(bypass ? 0 : 1, this.ctx.currentTime, 0.02);
      this.eqBypassGain.gain.setTargetAtTime(bypass ? 1 : 0, this.ctx.currentTime, 0.02);
    } else if (module === 'tape') {
      this.state.tape.bypassed = bypass;
      this.tapeWetGain.gain.setTargetAtTime(bypass ? 0 : 1, this.ctx.currentTime, 0.02);
      this.tapeBypassGain.gain.setTargetAtTime(bypass ? 1 : 0, this.ctx.currentTime, 0.02);
    } else if (module === 'space') {
      this.state.space.bypassed = bypass;
      this.reverbWetGain.gain.setTargetAtTime(bypass ? 0 : this.state.space.reverbMix, this.ctx.currentTime, 0.02);
      this.delayWetGain.gain.setTargetAtTime(bypass ? 0 : this.state.space.delayMix, this.ctx.currentTime, 0.02);
      this.spaceDryGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.02);
    } else if (module === 'limiter') {
      this.state.limiter.bypassed = bypass;
      this.limiterCeilingGain.gain.setTargetAtTime(bypass ? 1 : Math.pow(10, this.state.limiter.ceiling / 20), this.ctx.currentTime, 0.02);
    }
  }

  public applyAllParams() {
    this.setBypassModule('eq', this.state.eq.bypassed);
    this.setBypassModule('tape', this.state.tape.bypassed);
    this.setBypassModule('space', this.state.space.bypassed);
    this.setBypassModule('limiter', this.state.limiter.bypassed);
    this.setTape(this.state.tape.drive, this.state.tape.warmth, this.state.tape.bias);
    this.setSpace(
      this.state.space.reverbMix,
      this.state.space.delayTime,
      this.state.space.delayFeedback,
      this.state.space.delayMix
    );
    this.setLimiter(this.state.limiter.threshold, this.state.limiter.ceiling, this.state.limiter.release);
  }
}
