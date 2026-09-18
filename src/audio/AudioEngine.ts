// Master Audio Engine Singleton: AudioContext lifecycle, telemetry, and master bus routing

import { PluginChain } from './PluginChain';
import { SynthEngine } from './SynthEngine';
import { DrumEngine } from './DrumEngine';
import { ArrangerClock } from './ArrangerClock';

export interface AudioTelemetry {
  leftDbfs: number;
  rightDbfs: number;
  leftPeakDbfs: number;
  rightPeakDbfs: number;
  isClipping: boolean;
  cpuLoad: number; // %
  dspLoad: number; // %
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  public ctx: AudioContext;
  public masterGain: GainNode;
  public masterLimiter: DynamicsCompressorNode;
  public masterAnalyser: AnalyserNode;
  public splitter: ChannelSplitterNode;
  public leftAnalyser: AnalyserNode;
  public rightAnalyser: AnalyserNode;

  public pluginChain: PluginChain;
  public synthEngine: SynthEngine;
  public drumEngine: DrumEngine;
  public clock: ArrangerClock;

  public isInitialized: boolean = false;
  private telemetryIntervalId: number | null = null;
  public onTelemetry?: (data: AudioTelemetry) => void;

  private leftTimeDomainData: Float32Array<ArrayBuffer>;
  private rightTimeDomainData: Float32Array<ArrayBuffer>;
  private lastClipTime: number = 0;

  private constructor() {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // 1. Create Master Nodes
    this.masterGain = this.ctx.createGain();
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.value = -0.5;
    this.masterLimiter.knee.value = 0;
    this.masterLimiter.ratio.value = 20;
    this.masterLimiter.attack.value = 0.001;
    this.masterLimiter.release.value = 0.05;

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 2048;
    this.masterAnalyser.smoothingTimeConstant = 0.85;

    // Stereo Splitter for independent L/R channel metering
    this.splitter = this.ctx.createChannelSplitter(2);
    this.leftAnalyser = this.ctx.createAnalyser();
    this.leftAnalyser.fftSize = 512;
    this.rightAnalyser = this.ctx.createAnalyser();
    this.rightAnalyser.fftSize = 512;

    this.leftTimeDomainData = new Float32Array(new ArrayBuffer(512 * 4));
    this.rightTimeDomainData = new Float32Array(new ArrayBuffer(512 * 4));

    // 2. Initialize Sub-Engines
    this.pluginChain = new PluginChain(this.ctx);
    this.synthEngine = new SynthEngine(this.ctx);
    this.drumEngine = new DrumEngine(this.ctx);
    this.clock = new ArrangerClock(this.ctx);

    // 3. Audio Graph Wiring:
    // [SynthEngine] & [DrumEngine] -> [PluginChain.inputNode]
    // [PluginChain.outputNode] -> [MasterGain] -> [MasterLimiter] -> [MasterAnalyser] -> [Splitter] & [ctx.destination]

    this.synthEngine.outputNode.connect(this.pluginChain.inputNode);
    this.drumEngine.outputNode.connect(this.pluginChain.inputNode);

    this.pluginChain.outputNode.connect(this.masterGain);
    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.splitter);
    this.splitter.connect(this.leftAnalyser, 0);
    this.splitter.connect(this.rightAnalyser, 1);
    this.masterAnalyser.connect(this.ctx.destination);

    // 4. Connect Clock Step Scheduler to Drum Engine playback
    this.clock.onStepScheduled = (step16, time) => {
      this.drumEngine.tracks.forEach((track) => {
        if (!track.muted && track.steps[step16]?.active) {
          const vel = track.steps[step16].velocity;
          this.drumEngine.triggerPad(track.padId, vel, time);
        }
      });
    };

    this.startTelemetryLoop();
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async resumeContext(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.isInitialized = true;
  }

  private startTelemetryLoop() {
    this.telemetryIntervalId = window.setInterval(() => {
      if (!this.onTelemetry) return;

      this.leftAnalyser.getFloatTimeDomainData(this.leftTimeDomainData);
      this.rightAnalyser.getFloatTimeDomainData(this.rightTimeDomainData);

      let sumL = 0;
      let peakL = 0;
      for (let i = 0; i < this.leftTimeDomainData.length; i++) {
        const val = Math.abs(this.leftTimeDomainData[i]);
        sumL += val * val;
        if (val > peakL) peakL = val;
      }
      const rmsL = Math.sqrt(sumL / this.leftTimeDomainData.length);

      let sumR = 0;
      let peakR = 0;
      for (let i = 0; i < this.rightTimeDomainData.length; i++) {
        const val = Math.abs(this.rightTimeDomainData[i]);
        sumR += val * val;
        if (val > peakR) peakR = val;
      }
      const rmsR = Math.sqrt(sumR / this.rightTimeDomainData.length);

      // Convert to dBFS
      const leftDbfs = rmsL > 0.0001 ? 20 * Math.log10(rmsL) : -70;
      const rightDbfs = rmsR > 0.0001 ? 20 * Math.log10(rmsR) : -70;
      const leftPeakDbfs = peakL > 0.0001 ? 20 * Math.log10(peakL) : -70;
      const rightPeakDbfs = peakR > 0.0001 ? 20 * Math.log10(peakR) : -70;

      const isClippingNow = peakL >= 0.999 || peakR >= 0.999;
      if (isClippingNow) {
        this.lastClipTime = Date.now();
      }
      const isClipping = Date.now() - this.lastClipTime < 800; // Hold clip LED for 800ms

      // Simulated telemetry based on activity
      const activeVoiceCount = this.synthEngine ? 1 : 0;
      const playingFactor = this.clock.isPlaying ? 1.5 : 0.8;
      const cpuLoad = Math.round(14 + (playingFactor * 4) + activeVoiceCount * 2 + (Math.sin(Date.now() / 1500) * 2));
      const dspLoad = Math.round(18 + (playingFactor * 6) + activeVoiceCount * 3 + (Math.cos(Date.now() / 1200) * 3));

      this.onTelemetry({
        leftDbfs,
        rightDbfs,
        leftPeakDbfs,
        rightPeakDbfs,
        isClipping,
        cpuLoad,
        dspLoad,
      });
    }, 50);
  }

  public cleanup() {
    if (this.telemetryIntervalId !== null) {
      clearInterval(this.telemetryIntervalId);
    }
    this.clock.stop();
  }
}
