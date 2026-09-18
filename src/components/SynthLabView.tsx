import React, { useState, useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface SynthLabViewProps {
  engine: AudioEngine;
}

export const SynthLabView: React.FC<SynthLabViewProps> = ({ engine }) => {
  const synth = engine.synthEngine;

  const [activePresetKey, setActivePresetKey] = useState<string>('solaris');
  const [waveform, setWaveform] = useState<OscillatorType>(synth.state.waveform);
  const [cutoff, setCutoff] = useState(synth.state.cutoff);
  const [resonance, setResonance] = useState(synth.state.resonance);
  const [filterDrive, setFilterDrive] = useState(synth.state.filterDrive);
  const [filterType, setFilterType] = useState<BiquadFilterType>(synth.state.filterType);
  const [octaveOffset, setOctaveOffset] = useState<number>(0);
  const [isAutoOrbit, setIsAutoOrbit] = useState(true);
  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<number>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const grainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggedSatelliteRef = useRef<number | null>(null);

  // Load preset handler
  const handlePresetSelect = (key: string) => {
    setActivePresetKey(key);
    synth.loadPreset(key);
    setWaveform(synth.state.waveform);
    setCutoff(synth.state.cutoff);
    setResonance(synth.state.resonance);
    setFilterDrive(synth.state.filterDrive);
    setFilterType(synth.state.filterType);
  };

  // Randomize parameters
  const handleRandomize = () => {
    const waves: OscillatorType[] = ['sawtooth', 'square', 'triangle', 'sine'];
    const newWave = waves[Math.floor(Math.random() * waves.length)];
    const newCut = Math.round(300 + Math.random() * 5000);
    const newRes = Number((1 + Math.random() * 12).toFixed(1));

    synth.state.waveform = newWave;
    synth.state.cutoff = newCut;
    synth.state.resonance = newRes;

    setWaveform(newWave);
    setCutoff(newCut);
    setResonance(newRes);
  };

  // Key Trigger Handlers
  const handleNoteStart = async (midiNote: number) => {
    await engine.resumeContext();
    synth.noteOn(midiNote);
    setActiveMidiNotes((prev) => new Set(prev).add(midiNote));
  };

  const handleNoteEnd = (midiNote: number) => {
    synth.noteOff(midiNote);
    setActiveMidiNotes((prev) => {
      const next = new Set(prev);
      next.delete(midiNote);
      return next;
    });
  };

  // Computer keyboard bindings (A - K for C3 to C4)
  useEffect(() => {
    const keyToNoteMap: Record<string, number> = {
      KeyA: 48, // C3
      KeyW: 49, // C#3
      KeyS: 50, // D3
      KeyE: 51, // D#3
      KeyD: 52, // E3
      KeyF: 53, // F3
      KeyT: 54, // F#3
      KeyG: 55, // G3
      KeyY: 56, // G#3
      KeyH: 57, // A3
      KeyU: 58, // A#3
      KeyJ: 59, // B3
      KeyK: 60, // C4
      KeyO: 61, // C#4
      KeyL: 62, // D4
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const baseNote = keyToNoteMap[e.code];
      if (baseNote !== undefined) {
        const note = baseNote + octaveOffset * 12;
        handleNoteStart(note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const baseNote = keyToNoteMap[e.code];
      if (baseNote !== undefined) {
        const note = baseNote + octaveOffset * 12;
        handleNoteEnd(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      synth.releaseAll();
    };
  }, [octaveOffset]);

  // Gravitation Canvas Loop & Dragging
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const deltaSec = (time - lastTime) / 1000;
      lastTime = time;

      if (isAutoOrbit && draggedSatelliteRef.current === null) {
        synth.updateSatellites(deltaSec, true);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;

          // Polar grid circles
          ctx.strokeStyle = '#282a30';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);

          ctx.beginPath();
          ctx.arc(cx, cy, 110, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, 75, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.stroke();

          // Coordinate crosshair
          ctx.beginPath();
          ctx.moveTo(cx, 10);
          ctx.lineTo(cx, canvas.height - 10);
          ctx.moveTo(10, cy);
          ctx.lineTo(canvas.width - 10, cy);
          ctx.stroke();
          ctx.setLineDash([]);

          // Central Attractor Singularity
          ctx.fillStyle = '#0c0e14';
          ctx.beginPath();
          ctx.arc(cx, cy, 18, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#00f0ff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Satellites & Vector Attraction lines
          synth.satellites.forEach((sat) => {
            // Attraction ray to center
            ctx.strokeStyle = sat.color;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(sat.x, sat.y);
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Satellite node body
            ctx.fillStyle = sat.color;
            ctx.shadowColor = sat.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(sat.x, sat.y, sat.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Satellite telemetry label
            ctx.fillStyle = sat.color;
            ctx.font = '9px "JetBrains Mono"';
            ctx.textAlign = 'center';
            ctx.fillText(sat.label, sat.x, sat.y - 12);
          });
        }
      }

      // Grain visualizer canvas animation
      const gCanvas = grainCanvasRef.current;
      if (gCanvas) {
        const gCtx = gCanvas.getContext('2d');
        if (gCtx) {
          gCtx.fillStyle = '#0c0e14';
          gCtx.fillRect(0, 0, gCanvas.width, gCanvas.height);

          const grainCount = Math.round((synth.state.granular.density / 100) * 40);
          const sprayRange = (synth.state.granular.spray / 100) * (gCanvas.height / 2);

          for (let i = 0; i < grainCount; i++) {
            const gx = Math.random() * gCanvas.width;
            const gy = gCanvas.height / 2 + (Math.random() * 2 - 1) * sprayRange;
            const gSize = 1 + (synth.state.granular.grainSize / 100) * 4;

            gCtx.fillStyle = i % 2 === 0 ? '#00f0ff' : '#ffb86b';
            gCtx.globalAlpha = 0.4 + Math.random() * 0.5;
            gCtx.beginPath();
            gCtx.arc(gx, gy, gSize, 0, Math.PI * 2);
            gCtx.fill();
          }
          gCtx.globalAlpha = 1.0;
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isAutoOrbit]);

  // Mouse drag handlers on Gravitation Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    synth.satellites.forEach((sat, idx) => {
      if (Math.hypot(sat.x - x, sat.y - y) <= sat.radius + 8) {
        draggedSatelliteRef.current = idx;
      }
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedSatelliteRef.current === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(15, Math.min(canvas.width - 15, e.clientX - rect.left));
    const y = Math.max(15, Math.min(canvas.height - 15, e.clientY - rect.top));

    const sat = synth.satellites[draggedSatelliteRef.current];
    if (sat) {
      sat.x = x;
      sat.y = y;
      sat.orbitRadius = Math.hypot(x - 150, y - 150);
      sat.angle = Math.atan2(y - 150, x - 150);
    }
  };

  const handleCanvasMouseUp = () => {
    draggedSatelliteRef.current = null;
  };

  // 3-Octave Virtual Piano Keys (C3 = 48 to B5 = 83)
  const pianoKeys = [
    { midi: 48, note: 'C3', isBlack: false },
    { midi: 49, note: 'C#3', isBlack: true },
    { midi: 50, note: 'D3', isBlack: false },
    { midi: 51, note: 'D#3', isBlack: true },
    { midi: 52, note: 'E3', isBlack: false },
    { midi: 53, note: 'F3', isBlack: false },
    { midi: 54, note: 'F#3', isBlack: true },
    { midi: 55, note: 'G3', isBlack: false },
    { midi: 56, note: 'G#3', isBlack: true },
    { midi: 57, note: 'A3', isBlack: false },
    { midi: 58, note: 'A#3', isBlack: true },
    { midi: 59, note: 'B3', isBlack: false },

    { midi: 60, note: 'C4', isBlack: false },
    { midi: 61, note: 'C#4', isBlack: true },
    { midi: 62, note: 'D4', isBlack: false },
    { midi: 63, note: 'D#4', isBlack: true },
    { midi: 64, note: 'E4', isBlack: false },
    { midi: 65, note: 'F4', isBlack: false },
    { midi: 66, note: 'F#4', isBlack: true },
    { midi: 67, note: 'G4', isBlack: false },
    { midi: 68, note: 'G#4', isBlack: true },
    { midi: 69, note: 'A4', isBlack: false },
    { midi: 70, note: 'A#4', isBlack: true },
    { midi: 71, note: 'B4', isBlack: false },

    { midi: 72, note: 'C5', isBlack: false },
    { midi: 73, note: 'C#5', isBlack: true },
    { midi: 74, note: 'D5', isBlack: false },
    { midi: 75, note: 'D#5', isBlack: true },
    { midi: 76, note: 'E5', isBlack: false },
    { midi: 77, note: 'F5', isBlack: false },
    { midi: 78, note: 'F#5', isBlack: true },
    { midi: 79, note: 'G5', isBlack: false },
    { midi: 80, note: 'G#5', isBlack: true },
    { midi: 81, note: 'A5', isBlack: false },
    { midi: 82, note: 'A#5', isBlack: true },
    { midi: 83, note: 'B5', isBlack: false },
  ];

  return (
    <div className="flex flex-col w-full text-on-surface select-none space-y-space-md">
      {/* Top Synth Ribbon: Preset & Global Polyphony */}
      <header className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-2xl border border-surface-container-high flex flex-wrap items-center justify-between gap-space-md">
        {/* Preset Navigator */}
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center text-primary-container shadow-inner border border-surface-container-high">
            <span className="material-symbols-outlined text-2xl animate-spin-slow">cyclone</span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                Synth Unit //
              </span>
              <span className="font-headline-sm text-headline-sm text-primary tracking-wide font-bold">
                Orbital-X Engine
              </span>
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary-fixed-dim font-meter-data text-meter-data">
                REV 3.2
              </span>
            </div>

            <div className="flex items-center gap-space-sm mt-0.5">
              <select
                value={activePresetKey}
                onChange={(e) => handlePresetSelect(e.target.value)}
                className="bg-surface-container-low border border-surface-container-high px-space-sm py-1 rounded font-label-md text-label-md text-on-surface font-semibold outline-none cursor-pointer"
              >
                {Object.entries(synth.presets).map(([k, p]) => (
                  <option key={k} value={k} className="bg-surface-container-lowest text-on-surface">
                    {p.name} • {p.category}
                  </option>
                ))}
              </select>
              <span className="font-meter-data text-meter-data text-on-surface-variant">
                by {synth.presets[activePresetKey]?.author}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-space-xs ml-space-xs">
            <button
              onClick={() => synth.loadPreset(activePresetKey)}
              className="px-space-sm py-1 rounded bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm flex items-center gap-space-xs transition-colors"
              title="Initialize State"
            >
              <span className="material-symbols-outlined text-xs">restart_alt</span>Init
            </button>
            <button
              onClick={handleRandomize}
              className="px-space-sm py-1 rounded bg-secondary-container hover:bg-secondary text-on-secondary font-label-sm text-label-sm flex items-center gap-space-xs transition-colors font-bold shadow-amber"
              title="Randomize Parameters"
            >
              <span className="material-symbols-outlined text-xs">casino</span>Random
            </button>
          </div>
        </div>

        {/* Voice Architecture Strip */}
        <div className="flex items-center gap-space-md">
          {/* Waveform Selector */}
          <div className="flex flex-col bg-surface-container-low px-space-sm py-1 rounded shadow-inner border border-surface-container-high">
            <span className="font-meter-data text-meter-data text-on-surface-variant uppercase">
              Waveform
            </span>
            <select
              value={waveform}
              onChange={(e) => {
                const w = e.target.value as OscillatorType;
                setWaveform(w);
                synth.state.waveform = w;
              }}
              className="bg-transparent font-label-md text-label-md text-primary font-bold outline-none cursor-pointer uppercase"
            >
              <option value="sawtooth" className="bg-surface-container-lowest">SAW</option>
              <option value="square" className="bg-surface-container-lowest">SQUARE</option>
              <option value="triangle" className="bg-surface-container-lowest">TRIANGLE</option>
              <option value="sine" className="bg-surface-container-lowest">SINE</option>
            </select>
          </div>

          {/* Polyphony */}
          <div className="flex flex-col bg-surface-container-low px-space-sm py-1 rounded shadow-inner border border-surface-container-high">
            <span className="font-meter-data text-meter-data text-on-surface-variant uppercase">
              Polyphony
            </span>
            <div className="flex items-center gap-space-xs">
              <span className="font-label-md text-label-md text-primary font-bold">
                {synth.state.polyphony}
              </span>
              <span className="text-[9px] font-meter-data text-on-surface-variant">VOICES</span>
            </div>
          </div>

          {/* Unison */}
          <div className="flex flex-col bg-surface-container-low px-space-sm py-1 rounded shadow-inner border border-surface-container-high">
            <div className="flex justify-between items-center gap-space-xs">
              <span className="font-meter-data text-meter-data text-on-surface-variant uppercase">
                Unison Stack
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            </div>
            <div className="flex items-center gap-space-sm">
              <span className="font-label-md text-label-md text-on-surface font-bold">
                {synth.state.unisonCount}x
              </span>
              <span className="font-meter-data text-meter-data text-primary-fixed-dim">
                {synth.state.unisonDetune}% DET
              </span>
            </div>
          </div>

          {/* Master Synth Level */}
          <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-1 rounded shadow-inner border border-surface-container-high">
            <div className="flex flex-col">
              <span className="font-meter-data text-meter-data text-on-surface-variant uppercase">
                Level
              </span>
              <span className="font-meter-data text-meter-data text-primary font-bold">
                {synth.state.masterLevel.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min="-24"
              max="6"
              value={synth.state.masterLevel}
              onChange={(e) => synth.setMasterLevel(Number(e.target.value))}
              className="w-20 h-1.5 bg-surface-container-highest rounded cursor-pointer"
            />
          </div>
        </div>
      </header>

      {/* 3-Pane Rack Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md w-full">
        {/* Pane 1: Harmonic Orbital Gravitation Attractor (4 cols) */}
        <section className="xl:col-span-4 bg-surface-container-lowest rounded-xl p-space-md shadow-2xl border border-surface-container-high flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-surface-container-high">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-base">blur_on</span>
                <h2 className="font-label-lg text-label-lg text-primary tracking-wider uppercase font-bold">
                  Gravitation Engine
                </h2>
              </div>
              <button
                onClick={() => setIsAutoOrbit(!isAutoOrbit)}
                className={`px-space-xs py-0.5 rounded font-meter-data text-meter-data uppercase transition-colors ${
                  isAutoOrbit
                    ? 'bg-primary-container/20 text-primary border border-primary/40'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {isAutoOrbit ? 'Orbiting [Active]' : 'Manual Drag'}
              </button>
            </div>

            <p className="font-body-md text-body-md text-on-surface-variant mb-space-sm text-xs">
              4 celestial satellites orbit the central singularity, dynamically modulating overtone convergence, sub harmonics, and resonant filters.
            </p>

            {/* Interactive Canvas */}
            <div className="relative w-full aspect-square bg-surface-container-low rounded-lg overflow-hidden border border-surface-container-high shadow-inner flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className="w-full h-full cursor-grab active:cursor-grabbing"
              />
            </div>
          </div>

          {/* Telemetry Footer */}
          <div className="grid grid-cols-2 gap-space-xs pt-space-sm font-meter-data text-meter-data text-on-surface-variant">
            <div className="flex justify-between bg-surface-container-low px-2 py-1 rounded">
              <span>α CUTOFF:</span>
              <span className="text-primary font-bold">320 Hz</span>
            </div>
            <div className="flex justify-between bg-surface-container-low px-2 py-1 rounded">
              <span>β OVERTONE:</span>
              <span className="text-secondary font-bold">780 Hz</span>
            </div>
            <div className="flex justify-between bg-surface-container-low px-2 py-1 rounded">
              <span>γ SUB HARM:</span>
              <span className="text-tertiary-fixed-dim font-bold">80 Hz</span>
            </div>
            <div className="flex justify-between bg-surface-container-low px-2 py-1 rounded">
              <span>δ RES PEAK:</span>
              <span className="text-primary-fixed font-bold">2.4 Q</span>
            </div>
          </div>
        </section>

        {/* Pane 2: Granular Cloud Resynthesizer (4 cols) */}
        <section className="xl:col-span-4 bg-surface-container-lowest rounded-xl p-space-md shadow-2xl border border-surface-container-high flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-surface-container-high">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-base">grain</span>
                <h2 className="font-label-lg text-label-lg text-secondary tracking-wider uppercase font-bold">
                  Granular Cloud Resynth
                </h2>
              </div>
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-meter-data text-meter-data uppercase">
                Window: Gauss
              </span>
            </div>

            {/* Particle Grain Canvas */}
            <div className="w-full h-40 rounded-lg overflow-hidden border border-surface-container-high mb-space-md">
              <canvas ref={grainCanvasRef} width={320} height={160} className="w-full h-full" />
            </div>

            {/* Granular Parameter Controls */}
            <div className="space-y-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-meter-data text-meter-data text-on-surface-variant">POSITION</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={synth.state.granular.position}
                  onChange={(e) => (synth.state.granular.position = Number(e.target.value))}
                  className="w-44 h-1.5 bg-surface-container-high rounded cursor-pointer"
                />
                <span className="font-meter-data text-meter-data text-primary w-10 text-right">
                  {synth.state.granular.position}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-meter-data text-meter-data text-on-surface-variant">DENSITY</span>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={synth.state.granular.density}
                  onChange={(e) => (synth.state.granular.density = Number(e.target.value))}
                  className="w-44 h-1.5 bg-surface-container-high rounded cursor-pointer"
                />
                <span className="font-meter-data text-meter-data text-secondary w-10 text-right">
                  {synth.state.granular.density}/s
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-meter-data text-meter-data text-on-surface-variant">GRAIN SIZE</span>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={synth.state.granular.grainSize}
                  onChange={(e) => (synth.state.granular.grainSize = Number(e.target.value))}
                  className="w-44 h-1.5 bg-surface-container-high rounded cursor-pointer"
                />
                <span className="font-meter-data text-meter-data text-primary w-10 text-right">
                  {synth.state.granular.grainSize}ms
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-meter-data text-meter-data text-on-surface-variant">PITCH JITTER</span>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={synth.state.granular.jitter}
                  onChange={(e) => (synth.state.granular.jitter = Number(e.target.value))}
                  className="w-44 h-1.5 bg-surface-container-high rounded cursor-pointer"
                />
                <span className="font-meter-data text-meter-data text-tertiary-fixed-dim w-10 text-right">
                  ±{synth.state.granular.jitter}c
                </span>
              </div>
            </div>
          </div>

          <div className="p-space-sm bg-surface-container-low rounded border border-surface-container-high mt-space-md">
            <span className="font-meter-data text-meter-data text-primary-container">
              GRAIN SYNC: 1/16 TRIPLETS • TIME STRETCH x1.24
            </span>
          </div>
        </section>

        {/* Pane 3: Dual Filter & Modulation Envelopes (4 cols) */}
        <section className="xl:col-span-4 bg-surface-container-lowest rounded-xl p-space-md shadow-2xl border border-surface-container-high flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-surface-container-high">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-base">filter_alt</span>
                <h2 className="font-label-lg text-label-lg text-primary tracking-wider uppercase font-bold">
                  Filter & Modulation
                </h2>
              </div>
              <div className="flex items-center gap-1 font-meter-data text-meter-data">
                {(['lowpass', 'bandpass', 'highpass'] as BiquadFilterType[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setFilterType(mode);
                      synth.state.filterType = mode;
                    }}
                    className={`px-1.5 py-0.5 rounded uppercase font-bold transition-colors ${
                      filterType === mode
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {mode === 'lowpass' ? 'LP' : mode === 'bandpass' ? 'BP' : 'HP'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Knobs / Sliders */}
            <div className="grid grid-cols-3 gap-space-sm mb-space-md">
              <div className="flex flex-col bg-surface-container-low p-2 rounded border border-surface-container-high">
                <span className="font-meter-data text-meter-data text-on-surface-variant">CUTOFF</span>
                <span className="font-label-md text-label-md text-primary font-bold">{cutoff} Hz</span>
                <input
                  type="range"
                  min="60"
                  max="12000"
                  value={cutoff}
                  onChange={(e) => {
                    const c = Number(e.target.value);
                    setCutoff(c);
                    synth.state.cutoff = c;
                  }}
                  className="w-full h-1 bg-surface-container-high rounded mt-1"
                />
              </div>

              <div className="flex flex-col bg-surface-container-low p-2 rounded border border-surface-container-high">
                <span className="font-meter-data text-meter-data text-on-surface-variant">RESONANCE</span>
                <span className="font-label-md text-label-md text-secondary font-bold">{resonance} Q</span>
                <input
                  type="range"
                  min="0.5"
                  max="18"
                  step="0.1"
                  value={resonance}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setResonance(r);
                    synth.state.resonance = r;
                  }}
                  className="w-full h-1 bg-surface-container-high rounded mt-1"
                />
              </div>

              <div className="flex flex-col bg-surface-container-low p-2 rounded border border-surface-container-high">
                <span className="font-meter-data text-meter-data text-on-surface-variant">DRIVE</span>
                <span className="font-label-md text-label-md text-tertiary-fixed-dim font-bold">{filterDrive}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filterDrive}
                  onChange={(e) => {
                    const d = Number(e.target.value);
                    setFilterDrive(d);
                    synth.state.filterDrive = d;
                  }}
                  className="w-full h-1 bg-surface-container-high rounded mt-1"
                />
              </div>
            </div>

            {/* ADSR Envelope Sliders */}
            <div className="flex flex-col bg-surface-container-low p-2 rounded border border-surface-container-high space-y-1 mb-space-sm">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase">
                Amp Envelope (ADSR)
              </span>
              <div className="grid grid-cols-4 gap-2 font-meter-data text-meter-data">
                <div>
                  <span>A: {(synth.state.ampEnv.attack * 1000).toFixed(0)}ms</span>
                  <input
                    type="range"
                    min="0.005"
                    max="0.5"
                    step="0.005"
                    value={synth.state.ampEnv.attack}
                    onChange={(e) => (synth.state.ampEnv.attack = Number(e.target.value))}
                    className="w-full h-1"
                  />
                </div>
                <div>
                  <span>D: {(synth.state.ampEnv.decay * 1000).toFixed(0)}ms</span>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.01"
                    value={synth.state.ampEnv.decay}
                    onChange={(e) => (synth.state.ampEnv.decay = Number(e.target.value))}
                    className="w-full h-1"
                  />
                </div>
                <div>
                  <span>S: {(synth.state.ampEnv.sustain * 100).toFixed(0)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={synth.state.ampEnv.sustain}
                    onChange={(e) => (synth.state.ampEnv.sustain = Number(e.target.value))}
                    className="w-full h-1"
                  />
                </div>
                <div>
                  <span>R: {(synth.state.ampEnv.release * 1000).toFixed(0)}ms</span>
                  <input
                    type="range"
                    min="0.05"
                    max="2.0"
                    step="0.05"
                    value={synth.state.ampEnv.release}
                    onChange={(e) => (synth.state.ampEnv.release = Number(e.target.value))}
                    className="w-full h-1"
                  />
                </div>
              </div>
            </div>

            {/* LFO Modulation Matrix */}
            <div className="flex items-center justify-between bg-surface-container-low px-space-sm py-1.5 rounded border border-surface-container-high font-meter-data text-meter-data">
              <span className="text-secondary font-bold">LFO 1: {synth.state.lfo1.rate} Hz [SINE]</span>
              <span className="text-on-surface-variant">DEST: CUTOFF (20%)</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-space-xs font-meter-data text-meter-data text-on-surface-variant">
            <span>REVERB SEND: 35%</span>
            <span>STEREO DELAY: 25%</span>
          </div>
        </section>
      </div>

      {/* Playable Interactive Piano Keyboard Deck */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-2xl border border-surface-container-high flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-md">
            <span className="font-label-md text-label-md text-primary font-bold uppercase flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">piano</span>
              Polyphonic MPE Keybed
            </span>
            <span className="font-meter-data text-meter-data text-on-surface-variant">
              Play using Keys (A, W, S, E, D, F, T, G, Y, H, U, J, K) or Click/Touch
            </span>
          </div>

          {/* Octave Shifter */}
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm">
            <span className="text-on-surface-variant font-mono">OCTAVE:</span>
            <button
              onClick={() => setOctaveOffset((o) => Math.max(-2, o - 1))}
              className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-container text-on-surface font-bold"
            >
              -
            </button>
            <span className="text-primary font-bold w-4 text-center">
              {octaveOffset > 0 ? `+${octaveOffset}` : octaveOffset}
            </span>
            <button
              onClick={() => setOctaveOffset((o) => Math.min(2, o + 1))}
              className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-container text-on-surface font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Keys container */}
        <div className="relative w-full h-36 bg-surface-container-lowest rounded-lg border border-surface-container-high flex overflow-hidden shadow-inner select-none">
          {/* White keys */}
          <div className="flex w-full h-full">
            {pianoKeys
              .filter((k) => !k.isBlack)
              .map((key) => {
                const isPressed = activeMidiNotes.has(key.midi + octaveOffset * 12);
                return (
                  <button
                    key={key.midi}
                    onMouseDown={() => handleNoteStart(key.midi + octaveOffset * 12)}
                    onMouseUp={() => handleNoteEnd(key.midi + octaveOffset * 12)}
                    onMouseLeave={() => handleNoteEnd(key.midi + octaveOffset * 12)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleNoteStart(key.midi + octaveOffset * 12);
                    }}
                    onTouchEnd={() => handleNoteEnd(key.midi + octaveOffset * 12)}
                    className={`flex-1 h-full border-r border-surface-container-high flex flex-col justify-end items-center pb-2 transition-all ${
                      isPressed
                        ? 'bg-primary-container text-surface font-bold shadow-cyan'
                        : 'bg-surface-container-high hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="font-meter-data text-[10px] uppercase font-mono">
                      {key.note}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* Black keys overlay */}
          <div className="absolute top-0 left-0 right-0 h-[62%] flex pointer-events-none px-4">
            {pianoKeys.map((key, idx) => {
              if (!key.isBlack) return null;
              // Calculate approximate offset percent for standard 12-key piano spacing
              const whiteKeyIdx = pianoKeys.slice(0, idx).filter((k) => !k.isBlack).length;
              const leftPct = (whiteKeyIdx / 21) * 100 - 1.2;
              const isPressed = activeMidiNotes.has(key.midi + octaveOffset * 12);

              return (
                <button
                  key={key.midi}
                  style={{ left: `${leftPct}%` }}
                  onMouseDown={() => handleNoteStart(key.midi + octaveOffset * 12)}
                  onMouseUp={() => handleNoteEnd(key.midi + octaveOffset * 12)}
                  onMouseLeave={() => handleNoteEnd(key.midi + octaveOffset * 12)}
                  className={`absolute w-[2.2%] h-full rounded-b border border-surface-container-highest z-20 pointer-events-auto flex flex-col justify-end items-center pb-1 transition-all ${
                    isPressed
                      ? 'bg-secondary text-surface font-bold shadow-amber'
                      : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="font-meter-data text-[8px]">{key.note.replace('#', '♯')}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
