import React, { useState, useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface PluginRackViewProps {
  engine: AudioEngine;
}

export const PluginRackView: React.FC<PluginRackViewProps> = ({ engine }) => {
  const rack = engine.pluginChain;

  const [globalBypass, setGlobalBypass] = useState(rack.state.bypassed);
  const [eqBypass, setEqBypass] = useState(rack.state.eq.bypassed);
  const [tapeBypass, setTapeBypass] = useState(rack.state.tape.bypassed);
  const [spaceBypass, setSpaceBypass] = useState(rack.state.space.bypassed);
  const [limiterBypass, setLimiterBypass] = useState(rack.state.limiter.bypassed);

  const [tapeDrive, setTapeDrive] = useState(rack.state.tape.drive);
  const [tapeWarmth, setTapeWarmth] = useState(rack.state.tape.warmth);

  const [reverbMix, setReverbMix] = useState(rack.state.space.reverbMix);
  const [delayTime, setDelayTime] = useState(rack.state.space.delayTime);
  const [delayFeedback, setDelayFeedback] = useState(rack.state.space.delayFeedback);

  const [limiterThreshold, setLimiterThreshold] = useState(rack.state.limiter.threshold);
  const [limiterCeiling, setLimiterCeiling] = useState(rack.state.limiter.ceiling);

  const eqCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleGlobalBypass = () => {
    const next = !globalBypass;
    setGlobalBypass(next);
    rack.setBypassModule('all', next);
    setEqBypass(next);
    setTapeBypass(next);
    setSpaceBypass(next);
    setLimiterBypass(next);
  };

  const handleModuleBypass = (module: 'eq' | 'tape' | 'space' | 'limiter') => {
    if (module === 'eq') {
      const next = !eqBypass;
      setEqBypass(next);
      rack.setBypassModule('eq', next);
    } else if (module === 'tape') {
      const next = !tapeBypass;
      setTapeBypass(next);
      rack.setBypassModule('tape', next);
    } else if (module === 'space') {
      const next = !spaceBypass;
      setSpaceBypass(next);
      rack.setBypassModule('space', next);
    } else if (module === 'limiter') {
      const next = !limiterBypass;
      setLimiterBypass(next);
      rack.setBypassModule('limiter', next);
    }
  };

  // Live Oscilloscope & FFT Spectrum Visualizer Canvas
  useEffect(() => {
    let animId: number;
    const analyser = engine.masterAnalyser;
    const fftData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);

    const render = () => {
      // 1. Draw Master Oscilloscope / FFT Canvas
      const scopeCanvas = scopeCanvasRef.current;
      if (scopeCanvas) {
        const ctx = scopeCanvas.getContext('2d');
        if (ctx) {
          analyser.getByteFrequencyData(fftData);
          analyser.getByteTimeDomainData(timeData);

          ctx.fillStyle = '#0c0e14';
          ctx.fillRect(0, 0, scopeCanvas.width, scopeCanvas.height);

          // Draw FFT Spectrum bars
          const barWidth = scopeCanvas.width / 64;
          for (let i = 0; i < 64; i++) {
            const val = fftData[i * 4];
            const barHeight = (val / 255) * (scopeCanvas.height * 0.75);
            ctx.fillStyle = i > 48 ? '#ffb86b' : '#00f0ff';
            ctx.globalAlpha = 0.45;
            ctx.fillRect(
              i * barWidth,
              scopeCanvas.height - barHeight,
              barWidth - 1,
              barHeight
            );
          }
          ctx.globalAlpha = 1.0;

          // Draw Time-Domain Waveform Oscilloscope line
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          const sliceWidth = scopeCanvas.width / timeData.length;
          let x = 0;
          for (let i = 0; i < timeData.length; i++) {
            const v = timeData[i] / 128.0;
            const y = (v * scopeCanvas.height) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // 2. Draw Prism Dynamic EQ Curve Canvas
      const eqCanvas = eqCanvasRef.current;
      if (eqCanvas) {
        const ctx = eqCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#1e1f26';
          ctx.fillRect(0, 0, eqCanvas.width, eqCanvas.height);

          // Grid lines: 20Hz, 100Hz, 1kHz, 10kHz, 20kHz
          ctx.strokeStyle = '#282a30';
          ctx.lineWidth = 1;
          const freqs = [100, 1000, 10000];
          freqs.forEach((f) => {
            const fx = (Math.log10(f / 20) / Math.log10(20000 / 20)) * eqCanvas.width;
            ctx.beginPath();
            ctx.moveTo(fx, 0);
            ctx.lineTo(fx, eqCanvas.height);
            ctx.stroke();
          });

          // Center 0 dB line
          ctx.strokeStyle = '#3b494b';
          ctx.beginPath();
          ctx.moveTo(0, eqCanvas.height / 2);
          ctx.lineTo(eqCanvas.width, eqCanvas.height / 2);
          ctx.stroke();

          // Plot EQ Curve across 200 points
          ctx.strokeStyle = eqBypass ? '#849495' : '#00f0ff';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = eqBypass ? 'transparent' : '#00f0ff';
          ctx.shadowBlur = 8;
          ctx.beginPath();

          const bands = rack.state.eq.bands;
          const cy = eqCanvas.height / 2;
          for (let px = 0; px < eqCanvas.width; px++) {
            const normX = px / eqCanvas.width;
            const freq = 20 * Math.pow(20000 / 20, normX);

            let totalGainDb = 0;
            if (!eqBypass) {
              bands.forEach((b) => {
                const octDist = Math.abs(Math.log2(freq / b.frequency));
                const influence = Math.exp(-Math.pow(octDist * b.q, 2));
                totalGainDb += b.gain * influence;
              });
            }

            // Map dB (-12 to +12) to canvas Y
            const y = cy - (totalGainDb / 12) * (cy * 0.85);
            if (px === 0) ctx.moveTo(px, y);
            else ctx.lineTo(px, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Band Node circles
          if (!eqBypass) {
            bands.forEach((b) => {
              const bx = (Math.log10(b.frequency / 20) / Math.log10(20000 / 20)) * eqCanvas.width;
              const by = cy - (b.gain / 12) * (cy * 0.85);

              ctx.fillStyle = '#0c0e14';
              ctx.beginPath();
              ctx.arc(bx, by, 7, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = '#00f0ff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(bx, by, 5, 0, Math.PI * 2);
              ctx.stroke();
            });
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [eqBypass]);

  const updateEQ = (bandIdx: number, gainDelta: number) => {
    const band = rack.state.eq.bands[bandIdx];
    if (band) {
      const newGain = Math.max(-12, Math.min(12, band.gain + gainDelta));
      rack.setEQBand(bandIdx, band.frequency, newGain, band.q);
    }
  };

  return (
    <div className="flex flex-col w-full text-on-surface select-none space-y-space-md">
      {/* Top Routing Matrix Strip */}
      <div className="w-full bg-surface-container-lowest rounded-lg p-space-md shadow-md border border-surface-container-high flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-md">
            <span className="font-label-md text-label-md uppercase tracking-wider text-primary font-bold flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-sm text-primary">route</span>
              Master Processing Insert Chain // Chain 01 [Stereo]
            </span>
            <span className="bg-surface-container px-2 py-0.5 rounded font-meter-data text-meter-data text-primary-container flex items-center gap-space-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping" />
              ACTIVE BUS • 96kHz / 32-bit Float
            </span>
          </div>

          <div className="flex items-center gap-space-lg font-meter-data text-meter-data text-on-surface-variant">
            <div className="flex items-center gap-space-xs">
              <span>LATENCY:</span>
              <span className="text-primary font-bold">0.0 ms (0 smp)</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span>OVERSAMPLE:</span>
              <span className="text-secondary font-bold">4X LINEAR</span>
            </div>
            <button
              onClick={handleGlobalBypass}
              className={`px-space-sm py-0.5 rounded transition-all flex items-center gap-1 font-bold ${
                globalBypass
                  ? 'bg-signal-red text-surface shadow-red'
                  : 'bg-surface-container text-on-surface hover:text-error'
              }`}
            >
              <span className="material-symbols-outlined text-xs">power_settings_new</span>
              {globalBypass ? 'BYPASSED' : 'BYPASS ALL'}
            </button>
          </div>
        </div>

        {/* Signal Flow Diagram Nodes */}
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-space-xs items-center bg-surface-container-low p-space-sm rounded border border-surface-container-high">
          {/* Input Node */}
          <div className="flex items-center justify-between bg-surface-container px-space-md py-space-xs rounded">
            <div className="flex flex-col">
              <span className="font-label-sm text-[9px] text-on-surface-variant">INPUT</span>
              <span className="font-label-md text-label-md text-primary font-bold">PRE-AMP L/R</span>
            </div>
            <div className="flex flex-col items-end font-meter-data text-meter-data">
              <span className="text-primary-container">-3.2 dB</span>
              <span className="text-[9px] text-on-surface-variant">UNITY</span>
            </div>
          </div>

          <div className="hidden xl:flex justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-xs text-primary-container">arrow_forward</span>
          </div>

          {/* Slot 1: Prism EQ */}
          <div
            onClick={() => handleModuleBypass('eq')}
            className={`flex items-center justify-between px-space-md py-space-xs rounded shadow-sm cursor-pointer transition-all ${
              eqBypass ? 'bg-surface-container-lowest opacity-50' : 'bg-surface-container-high border border-primary/30'
            }`}
          >
            <div className="flex items-center gap-space-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${eqBypass ? 'bg-outline' : 'bg-primary-container'}`} />
              <div className="flex flex-col">
                <span className="font-label-sm text-[9px] text-on-surface-variant">SLOT 01 • DYN-EQ</span>
                <span className="font-label-md text-label-md text-on-surface font-medium">Prism EQ</span>
              </div>
            </div>
            <span className="font-meter-data text-meter-data text-primary">100% WET</span>
          </div>

          <div className="hidden xl:flex justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-xs text-primary-container">arrow_forward</span>
          </div>

          {/* Slot 2: Tape Saturation */}
          <div
            onClick={() => handleModuleBypass('tape')}
            className={`flex items-center justify-between px-space-md py-space-xs rounded shadow-sm cursor-pointer transition-all ${
              tapeBypass ? 'bg-surface-container-lowest opacity-50' : 'bg-surface-container-high border border-secondary/30'
            }`}
          >
            <div className="flex items-center gap-space-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${tapeBypass ? 'bg-outline' : 'bg-secondary'}`} />
              <div className="flex flex-col">
                <span className="font-label-sm text-[9px] text-on-surface-variant">SLOT 02 • SAT</span>
                <span className="font-label-md text-label-md text-on-surface font-medium">Analog Tape</span>
              </div>
            </div>
            <span className="font-meter-data text-meter-data text-secondary">+{tapeDrive}%</span>
          </div>

          <div className="hidden xl:flex justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-xs text-primary-container">arrow_forward</span>
          </div>

          {/* Slot 3: Space Reverb & Limiter */}
          <div
            onClick={() => handleModuleBypass('limiter')}
            className={`flex items-center justify-between px-space-md py-space-xs rounded shadow-sm cursor-pointer transition-all ${
              limiterBypass ? 'bg-surface-container-lowest opacity-50' : 'bg-surface-container-high border border-primary/30'
            }`}
          >
            <div className="flex items-center gap-space-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${limiterBypass ? 'bg-outline' : 'bg-primary'}`} />
              <div className="flex flex-col">
                <span className="font-label-sm text-[9px] text-on-surface-variant">SLOT 03 • LIMIT</span>
                <span className="font-label-md text-label-md text-on-surface font-medium">Brickwall Limit</span>
              </div>
            </div>
            <span className="font-meter-data text-meter-data text-primary-fixed-dim">-0.1 dBTP</span>
          </div>
        </div>
      </div>

      {/* Main 500-Series Modular Units & Spectrum Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Left Side: Modular Racks (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-space-md">
          {/* UNIT 1: PRISM DYNAMIC EQ */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-lg border border-surface-container-high flex flex-col gap-space-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-container via-secondary to-primary-container" />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-space-md">
                <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-meter-data text-meter-data font-bold">
                  500-EQ // 01
                </span>
                <span className="font-headline-sm text-headline-sm text-primary font-bold">
                  PRISM DYNAMIC EQ
                </span>
                <span className="text-on-surface-variant text-label-sm font-label-sm uppercase">
                  v2.1 Precision DSP
                </span>
              </div>

              <div className="flex items-center gap-space-sm">
                <button
                  onClick={() => handleModuleBypass('eq')}
                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                    eqBypass ? 'bg-surface-container text-outline' : 'bg-primary-container text-on-primary-container shadow-cyan'
                  }`}
                  title="Bypass Unit"
                >
                  <span className="material-symbols-outlined text-xs font-bold">power_settings_new</span>
                </button>
              </div>
            </div>

            {/* EQ Frequency Response Curve Canvas */}
            <div className="w-full h-36 rounded-lg overflow-hidden border border-surface-container-high bg-surface-container-high">
              <canvas ref={eqCanvasRef} width={640} height={144} className="w-full h-full" />
            </div>

            {/* 4 EQ Bands Parametric Controls */}
            <div className="grid grid-cols-4 gap-space-sm font-meter-data text-meter-data">
              {rack.state.eq.bands.map((band, idx) => (
                <div key={idx} className="bg-surface-container-low p-2 rounded border border-surface-container-high flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-on-surface">BAND 0{idx + 1}</span>
                    <span className="text-primary font-bold">{band.gain > 0 ? `+${band.gain.toFixed(1)}` : band.gain.toFixed(1)} dB</span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant font-mono">{band.frequency} Hz</span>
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => updateEQ(idx, 0.5)}
                      className="flex-1 py-0.5 rounded bg-surface-container-high hover:bg-surface-container text-primary font-bold"
                    >
                      +
                    </button>
                    <button
                      onClick={() => updateEQ(idx, -0.5)}
                      className="flex-1 py-0.5 rounded bg-surface-container-high hover:bg-surface-container text-primary font-bold"
                    >
                      -
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* UNIT 2: TAPE SATURATION & SPACE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* Analog Tape Saturation */}
            <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-lg border border-surface-container-high flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-surface-container text-secondary font-meter-data text-meter-data font-bold">
                    SAT // 02
                  </span>
                  <span className="font-label-md text-label-md text-secondary font-bold">Analog Tape</span>
                </div>
                <button
                  onClick={() => handleModuleBypass('tape')}
                  className={`w-6 h-6 flex items-center justify-center rounded ${
                    tapeBypass ? 'bg-surface-container text-outline' : 'bg-secondary text-surface shadow-amber'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">power_settings_new</span>
                </button>
              </div>

              <div className="space-y-space-sm my-space-sm font-meter-data text-meter-data">
                <div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">TAPE DRIVE</span>
                    <span className="text-secondary font-bold">{tapeDrive}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tapeDrive}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      setTapeDrive(d);
                      rack.setTape(d, tapeWarmth, rack.state.tape.bias);
                    }}
                    className="w-full mt-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">WARMTH FILTER</span>
                    <span className="text-primary font-bold">{tapeWarmth}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tapeWarmth}
                    onChange={(e) => {
                      const w = Number(e.target.value);
                      setTapeWarmth(w);
                      rack.setTape(tapeDrive, w, rack.state.tape.bias);
                    }}
                    className="w-full mt-1"
                  />
                </div>
              </div>

              <div className="p-1.5 bg-surface-container-low rounded border border-surface-container-high font-meter-data text-meter-data text-on-surface-variant flex justify-between">
                <span>HEAD BIAS: +5 mV</span>
                <span className="text-secondary">CLASS-A TUBE WARMTH</span>
              </div>
            </div>

            {/* Stereo Space Reverb & Delay */}
            <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-lg border border-surface-container-high flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-surface-container text-tertiary-fixed-dim font-meter-data text-meter-data font-bold">
                    SPACE // 03
                  </span>
                  <span className="font-label-md text-label-md text-tertiary-fixed-dim font-bold">Space Reverb & Delay</span>
                </div>
                <button
                  onClick={() => handleModuleBypass('space')}
                  className={`w-6 h-6 flex items-center justify-center rounded ${
                    spaceBypass ? 'bg-surface-container text-outline' : 'bg-tertiary-fixed-dim text-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">power_settings_new</span>
                </button>
              </div>

              <div className="space-y-space-sm my-space-sm font-meter-data text-meter-data">
                <div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">REVERB WET</span>
                    <span className="text-tertiary-fixed-dim font-bold">{(reverbMix * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={reverbMix}
                    onChange={(e) => {
                      const rm = Number(e.target.value);
                      setReverbMix(rm);
                      rack.setSpace(rm, delayTime, delayFeedback, rack.state.space.delayMix);
                    }}
                    className="w-full mt-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">DELAY TIME</span>
                    <span className="text-primary font-bold">{(delayTime * 1000).toFixed(0)} ms</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.025"
                    value={delayTime}
                    onChange={(e) => {
                      const dt = Number(e.target.value);
                      setDelayTime(dt);
                      rack.setSpace(reverbMix, dt, delayFeedback, rack.state.space.delayMix);
                    }}
                    className="w-full mt-1"
                  />
                </div>
                <div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">DELAY FEEDBACK</span>
                    <span className="text-secondary font-bold">{(delayFeedback * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.85"
                    step="0.05"
                    value={delayFeedback}
                    onChange={(e) => {
                      const df = Number(e.target.value);
                      setDelayFeedback(df);
                      rack.setSpace(reverbMix, delayTime, df, rack.state.space.delayMix);
                    }}
                    className="w-full mt-1"
                  />
                </div>
              </div>

              <div className="p-1.5 bg-surface-container-low rounded border border-surface-container-high font-meter-data text-meter-data text-on-surface-variant flex justify-between">
                <span>FEEDBACK: {(delayFeedback * 100).toFixed(0)}%</span>
                <span className="text-primary-container">CROSS-STEREO SYNC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Master Peak Limiter & Oscilloscope Scope (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-space-md">
          {/* Real-time Oscilloscope & FFT Spectrum */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-lg border border-surface-container-high flex flex-col space-y-space-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
              <span className="font-label-md text-label-md text-primary font-bold uppercase">
                Master Spectrum & Scope
              </span>
              <span className="font-meter-data text-meter-data text-primary-container">
                LIVE FFT 2048
              </span>
            </div>

            <div className="w-full h-44 rounded-lg overflow-hidden border border-surface-container-high bg-surface-container-lowest">
              <canvas ref={scopeCanvasRef} width={340} height={176} className="w-full h-full" />
            </div>

            <div className="flex justify-between font-meter-data text-[9px] text-on-surface-variant">
              <span>20 Hz</span>
              <span>100 Hz</span>
              <span>1 kHz</span>
              <span>10 kHz</span>
              <span>20 kHz</span>
            </div>
          </div>

          {/* Brickwall Peak Limiter */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-lg border border-surface-container-high flex flex-col space-y-space-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-meter-data text-meter-data font-bold">
                  LIMIT // 04
                </span>
                <span className="font-label-md text-label-md text-primary font-bold">
                  Brickwall Peak Limiter
                </span>
              </div>
              <button
                onClick={() => handleModuleBypass('limiter')}
                className={`w-6 h-6 flex items-center justify-center rounded ${
                  limiterBypass ? 'bg-surface-container text-outline' : 'bg-primary-container text-on-primary-container shadow-cyan'
                }`}
              >
                <span className="material-symbols-outlined text-xs">power_settings_new</span>
              </button>
            </div>

            <div className="space-y-space-sm font-meter-data text-meter-data">
              <div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">THRESHOLD</span>
                  <span className="text-primary font-bold">{limiterThreshold.toFixed(1)} dB</span>
                </div>
                <input
                  type="range"
                  min="-18"
                  max="0"
                  step="0.5"
                  value={limiterThreshold}
                  onChange={(e) => {
                    const th = Number(e.target.value);
                    setLimiterThreshold(th);
                    rack.setLimiter(th, limiterCeiling, rack.state.limiter.release);
                  }}
                  className="w-full mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">CEILING</span>
                  <span className="text-secondary font-bold">{limiterCeiling.toFixed(1)} dBTP</span>
                </div>
                <input
                  type="range"
                  min="-3"
                  max="0"
                  step="0.1"
                  value={limiterCeiling}
                  onChange={(e) => {
                    const cl = Number(e.target.value);
                    setLimiterCeiling(cl);
                    rack.setLimiter(limiterThreshold, cl, rack.state.limiter.release);
                  }}
                  className="w-full mt-1"
                />
              </div>
            </div>

            <div className="p-2 bg-surface-container-low rounded border border-surface-container-high flex justify-between items-center font-meter-data text-meter-data">
              <span className="text-on-surface-variant">GAIN REDUCTION:</span>
              <span className="text-signal-red font-bold font-mono">
                {rack.getGainReduction().toFixed(1)} dB
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
