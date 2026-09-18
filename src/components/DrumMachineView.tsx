import React, { useState, useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { DrumPad } from '../audio/DrumEngine';

interface DrumMachineViewProps {
  engine: AudioEngine;
}

export const DrumMachineView: React.FC<DrumMachineViewProps> = ({ engine }) => {
  const drums = engine.drumEngine;

  const [activeKit, setActiveKit] = useState<'cyberpunk' | 'detroit' | 'lofi' | 'ukg'>('cyberpunk');
  const [selectedPadId, setSelectedPadId] = useState<number>(0);
  const [activePadTriggers, setActivePadTriggers] = useState<Set<number>>(new Set());
  const [, setRerenderToggle] = useState(0);

  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedPad: DrumPad = drums.pads[selectedPadId] || drums.pads[0];

  const handlePadClick = async (padId: number) => {
    await engine.resumeContext();
    setSelectedPadId(padId);
    drums.triggerPad(padId, 1.0);

    // Visual trigger pulse
    setActivePadTriggers((prev) => new Set(prev).add(padId));
    setTimeout(() => {
      setActivePadTriggers((prev) => {
        const next = new Set(prev);
        next.delete(padId);
        return next;
      });
    }, 150);
  };

  const handleStepToggle = (trackIndex: number, stepIndex: number) => {
    const track = drums.tracks[trackIndex];
    if (track && track.steps[stepIndex]) {
      track.steps[stepIndex].active = !track.steps[stepIndex].active;
      setRerenderToggle((t) => t + 1);
    }
  };

  const handleKitChange = (kit: 'cyberpunk' | 'detroit' | 'lofi' | 'ukg') => {
    setActiveKit(kit);
    drums.loadPattern(kit);
    setRerenderToggle((t) => t + 1);
  };

  const handleDiceGroove = () => {
    drums.randomizePattern();
    setRerenderToggle((t) => t + 1);
  };

  const handleClearMutes = () => {
    drums.tracks.forEach((t) => {
      t.muted = false;
      t.solo = false;
    });
    setRerenderToggle((t) => t + 1);
  };

  // Draw simulated audio waveform on the sample inspector canvas
  useEffect(() => {
    const canvas = sampleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0c0e14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Waveform envelope
    ctx.strokeStyle = selectedPad.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const cy = canvas.height / 2;

    for (let x = 0; x < canvas.width; x++) {
      const progress = x / canvas.width;
      const decay = Math.exp(-progress * (1000 / selectedPad.decay));
      const amp = Math.sin(progress * 40 + selectedPad.id) * (canvas.height * 0.4) * decay;
      const y = cy + amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Loop & slice boundary markers
    ctx.strokeStyle = '#00f0ff';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.15, 0);
    ctx.lineTo(canvas.width * 0.15, canvas.height);
    ctx.moveTo(canvas.width * 0.85, 0);
    ctx.lineTo(canvas.width * 0.85, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [selectedPadId, selectedPad]);

  const runningStep16 = engine.clock.currentStep16;

  return (
    <div className="flex flex-col w-full text-on-surface select-none space-y-space-md">
      {/* Top Engine Bar */}
      <div className="flex flex-wrap items-center justify-between gap-space-md bg-surface-container-low px-space-md py-space-sm rounded-lg shadow-sm border border-surface-container-high">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs">
            <div className="w-3 h-3 rounded-full bg-primary-container shadow-cyan animate-pulse" />
            <span className="font-label-lg text-label-lg tracking-wider text-primary uppercase font-bold">
              BeatForge 16
            </span>
            <span className="font-label-sm text-label-sm px-space-xs py-0.5 bg-surface-container-high text-on-surface-variant rounded">
              v3.4 DSP Engine
            </span>
          </div>

          <div className="h-4 w-px bg-surface-variant" />

          {/* Kit Preset Selector */}
          <div className="flex items-center gap-space-xs bg-surface-container-lowest px-space-sm py-1 rounded border border-surface-container-high">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Kit:
            </span>
            <select
              value={activeKit}
              onChange={(e) => handleKitChange(e.target.value as (typeof activeKit))}
              className="bg-transparent font-label-md text-label-md text-primary-container font-bold outline-none cursor-pointer"
            >
              <option className="bg-surface-container-lowest text-on-surface" value="cyberpunk">
                Cyberpunk Trap 808
              </option>
              <option className="bg-surface-container-lowest text-on-surface" value="detroit">
                Vintage Detroit 909
              </option>
              <option className="bg-surface-container-lowest text-on-surface" value="lofi">
                Organic Lo-Fi Chill
              </option>
              <option className="bg-surface-container-lowest text-on-surface" value="ukg">
                UK Garage Breaks
              </option>
            </select>
          </div>
        </div>

        {/* Quick Transports & Status */}
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs bg-surface-container-lowest px-space-sm py-1 rounded font-meter-data text-meter-data border border-surface-container-high">
            <span className="text-on-surface-variant">BAR 02.3</span>
            <span className="text-primary-container">POLY: 11/16</span>
            <span className="text-secondary">SWING: 58%</span>
          </div>

          <div className="flex items-center gap-space-xs">
            <button
              onClick={handleClearMutes}
              className="px-space-sm py-1 bg-surface-container-high hover:bg-surface-container text-on-surface font-label-sm text-label-sm rounded transition-all"
            >
              Clear Mutes
            </button>
            <button
              onClick={handleDiceGroove}
              className="px-space-sm py-1 bg-secondary-container hover:bg-secondary text-on-secondary font-label-sm text-label-sm rounded font-bold transition-all flex items-center gap-space-xs shadow-amber"
            >
              <span className="material-symbols-outlined text-xs">shuffle</span>
              Dice Groove
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Left Column: 4x4 Pads + 8-Track Sequencer (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-space-md">
          {/* 4x4 RGB Velocity Trigger Deck */}
          <div className="bg-surface-container-low p-space-md rounded-lg shadow-md border border-surface-container-high">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-sm text-primary-container">grid_view</span>
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface font-bold">
                  16 RGB Velocity Trigger Deck
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  MPE Pressure Sensitive
                </span>
              </div>
              <div className="flex items-center gap-space-md font-label-sm text-label-sm">
                <span className="flex items-center gap-1 text-on-surface-variant">
                  <span className="w-1.5 h-1.5 rounded-full bg-error" /> Choke 1 (Hi-Hats)
                </span>
                <span className="flex items-center gap-1 text-on-surface-variant">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container" /> Choke 2 (808s)
                </span>
              </div>
            </div>

            {/* 4x4 Grid Container */}
            <div className="grid grid-cols-4 gap-space-sm">
              {drums.pads.map((pad) => {
                const isTriggered = activePadTriggers.has(pad.id);
                const isSelected = selectedPadId === pad.id;

                return (
                  <div
                    key={pad.id}
                    onClick={() => handlePadClick(pad.id)}
                    className={`group relative flex flex-col justify-between h-20 p-space-sm rounded cursor-pointer transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] border ${
                      isSelected
                        ? 'border-primary shadow-cyan bg-surface-container-highest'
                        : 'border-surface-container-high bg-surface-container-high hover:bg-surface-container-highest'
                    } ${isTriggered ? 'scale-95 brightness-125' : 'hover:scale-[1.01]'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span
                        className="font-meter-data text-meter-data font-bold"
                        style={{ color: pad.color }}
                      >
                        {String(pad.id + 1).padStart(2, '0')}
                      </span>
                      <span className="font-label-sm text-[9px] px-1 rounded bg-surface-container text-on-surface-variant font-mono">
                        {pad.category}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md font-bold text-on-surface group-hover:text-primary truncate">
                        {pad.name}
                      </span>
                      <span className="font-label-sm text-[10px] text-on-surface-variant truncate">
                        {pad.subtitle}
                      </span>
                    </div>

                    {/* Velocity bar */}
                    <div className="w-full bg-surface-container-lowest h-1 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pad.gain * 100}%`,
                          backgroundColor: pad.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8-Track 16-Step Sequencer Matrix */}
          <div className="bg-surface-container-low p-space-md rounded-lg shadow-md border border-surface-container-high flex flex-col space-y-space-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
              <span className="font-label-md text-label-md uppercase tracking-wider text-primary font-bold">
                16-Step Matrix Arranger
              </span>
              <span className="font-meter-data text-meter-data text-on-surface-variant">
                1/16 TIMEBASE • SWING SYNC
              </span>
            </div>

            {/* Step numbers header */}
            <div className="flex items-center pl-40 gap-1 font-meter-data text-[9px] text-on-surface-variant">
              {Array.from({ length: 16 }).map((_, stepIdx) => (
                <div
                  key={stepIdx}
                  className={`flex-1 text-center py-0.5 rounded ${
                    stepIdx % 4 === 0 ? 'text-primary font-bold bg-surface-container' : ''
                  } ${engine.clock.isPlaying && runningStep16 === stepIdx ? 'text-primary-container font-extrabold underline' : ''}`}
                >
                  {stepIdx + 1}
                </div>
              ))}
            </div>

            {/* 8 Track Rows */}
            <div className="flex flex-col space-y-1">
              {drums.tracks.map((track, trackIdx) => {
                const pad = drums.pads[track.padId];

                return (
                  <div key={track.id} className="flex items-center gap-2">
                    {/* Track Header (w-38) */}
                    <div className="w-38 flex items-center justify-between bg-surface-container px-2 py-1 rounded border border-surface-container-high">
                      <div className="flex items-center gap-1 truncate">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: pad?.color || '#00f0ff' }}
                        />
                        <span className="font-label-sm text-xs font-bold truncate text-on-surface">
                          {track.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-[9px]">
                        <button
                          onClick={() => {
                            track.muted = !track.muted;
                            setRerenderToggle((t) => t + 1);
                          }}
                          className={`px-1 rounded ${
                            track.muted ? 'bg-signal-red text-surface font-bold' : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          M
                        </button>
                        <button
                          onClick={() => {
                            track.solo = !track.solo;
                            setRerenderToggle((t) => t + 1);
                          }}
                          className={`px-1 rounded ${
                            track.solo ? 'bg-secondary text-surface font-bold' : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          S
                        </button>
                      </div>
                    </div>

                    {/* 16 Step Buttons */}
                    <div className="flex-1 grid grid-cols-16 gap-1">
                      {track.steps.map((step, stepIdx) => {
                        const isPlayheadHere = engine.clock.isPlaying && runningStep16 === stepIdx;
                        const isQuarterStart = stepIdx % 4 === 0;

                        return (
                          <button
                            key={stepIdx}
                            onClick={() => handleStepToggle(trackIdx, stepIdx)}
                            className={`h-7 rounded border transition-all flex items-center justify-center ${
                              step.active
                                ? 'bg-primary-container border-primary shadow-cyan text-surface font-bold'
                                : isQuarterStart
                                ? 'bg-surface-container border-surface-container-highest'
                                : 'bg-surface-container-lowest border-surface-container-high hover:border-outline'
                            } ${isPlayheadHere ? 'ring-2 ring-primary brightness-150' : ''}`}
                          >
                            {step.active && (
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: pad?.color || '#0c0e14' }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Sample Inspector & Transient Shaper (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-space-md">
          <div className="bg-surface-container-low p-space-md rounded-lg shadow-md border border-surface-container-high flex flex-col space-y-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
              <span className="font-label-md text-label-md uppercase tracking-wider text-primary font-bold">
                Sample Waveform Editor
              </span>
              <span
                className="font-meter-data text-meter-data font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${selectedPad.color}20`, color: selectedPad.color }}
              >
                {selectedPad.name}
              </span>
            </div>

            {/* Waveform Canvas */}
            <div className="w-full h-36 rounded-lg overflow-hidden border border-surface-container-high bg-surface-container-lowest">
              <canvas ref={sampleCanvasRef} width={340} height={144} className="w-full h-full" />
            </div>

            {/* Transient & Tuning Knobs */}
            <div className="grid grid-cols-2 gap-space-sm font-meter-data text-meter-data">
              <div className="bg-surface-container p-2 rounded border border-surface-container-high">
                <span className="text-on-surface-variant">ATTACK TIME</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-primary font-bold">{selectedPad.attack} ms</span>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={selectedPad.attack}
                    onChange={(e) => {
                      selectedPad.attack = Number(e.target.value);
                      setRerenderToggle((t) => t + 1);
                    }}
                    className="w-20"
                  />
                </div>
              </div>

              <div className="bg-surface-container p-2 rounded border border-surface-container-high">
                <span className="text-on-surface-variant">DECAY SUSTAIN</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-secondary font-bold">{selectedPad.decay} ms</span>
                  <input
                    type="range"
                    min="20"
                    max="1500"
                    value={selectedPad.decay}
                    onChange={(e) => {
                      selectedPad.decay = Number(e.target.value);
                      setRerenderToggle((t) => t + 1);
                    }}
                    className="w-20"
                  />
                </div>
              </div>

              <div className="bg-surface-container p-2 rounded border border-surface-container-high">
                <span className="text-on-surface-variant">SEMITONE TUNE</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-primary font-bold">
                    {selectedPad.pitch > 0 ? `+${selectedPad.pitch}` : selectedPad.pitch} st
                  </span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={selectedPad.pitch}
                    onChange={(e) => {
                      selectedPad.pitch = Number(e.target.value);
                      setRerenderToggle((t) => t + 1);
                    }}
                    className="w-20"
                  />
                </div>
              </div>

              <div className="bg-surface-container p-2 rounded border border-surface-container-high">
                <span className="text-on-surface-variant">FILTER CUTOFF</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-tertiary-fixed-dim font-bold">{selectedPad.cutoff} Hz</span>
                  <input
                    type="range"
                    min="200"
                    max="16000"
                    value={selectedPad.cutoff}
                    onChange={(e) => {
                      selectedPad.cutoff = Number(e.target.value);
                      setRerenderToggle((t) => t + 1);
                    }}
                    className="w-20"
                  />
                </div>
              </div>
            </div>

            {/* Pad Audition Button */}
            <button
              onClick={() => handlePadClick(selectedPad.id)}
              className="w-full py-2 rounded bg-surface-container-high hover:bg-surface-container text-primary font-label-md text-label-md font-bold transition-all border border-surface-container-highest shadow-sm"
            >
              Audition Pad (Space / Click)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
