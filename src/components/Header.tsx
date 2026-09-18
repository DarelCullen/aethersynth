import React, { useState } from 'react';
import { AudioEngine, AudioTelemetry } from '../audio/AudioEngine';
import { WavExporter } from '../audio/WavExporter';

interface HeaderProps {
  engine: AudioEngine;
  activeTab: 'arranger' | 'synth-lab' | 'drum-machine' | 'plugin-rack';
  setActiveTab: (tab: 'arranger' | 'synth-lab' | 'drum-machine' | 'plugin-rack') => void;
  telemetry: AudioTelemetry;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onStop: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  engine,
  activeTab,
  setActiveTab,
  telemetry,
  isPlaying,
  onPlayToggle,
  onStop,
}) => {
  const [bpm, setBpm] = useState(engine.clock.bpm);
  const [loopActive, setLoopActive] = useState(engine.clock.loopEnabled);
  const [metronomeActive, setMetronomeActive] = useState(engine.clock.metronomeEnabled);
  const [isExporting, setIsExporting] = useState(false);
  const [recordActive, setRecordActive] = useState(false);

  const handleBpmChange = (delta: number) => {
    const newBpm = Math.max(60, Math.min(220, bpm + delta));
    setBpm(newBpm);
    engine.clock.setBPM(newBpm);
  };

  const handleLoopToggle = () => {
    const next = !loopActive;
    setLoopActive(next);
    engine.clock.loopEnabled = next;
  };

  const handleMetronomeToggle = () => {
    const next = !metronomeActive;
    setMetronomeActive(next);
    engine.clock.metronomeEnabled = next;
  };

  const handleExportWav = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await engine.resumeContext();
      const blob = await WavExporter.exportLoopToWav(bpm, 8, engine.drumEngine, engine.pluginChain);
      WavExporter.triggerDownload(blob, `Resonance_Studio_${bpm}BPM.wav`);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Format dBFS to meter percentage: -60dB -> 0%, 0dB -> 100%
  const calcMeterPct = (dbfs: number) => {
    return Math.max(0, Math.min(100, ((dbfs + 60) / 60) * 100));
  };

  const leftMeterPct = calcMeterPct(telemetry.leftPeakDbfs);
  const rightMeterPct = calcMeterPct(telemetry.rightPeakDbfs);

  // Timecode formatting
  const barStr = String(engine.clock.currentBar).padStart(3, '0');
  const beatStr = String(engine.clock.currentBeat).padStart(2, '0');
  const tickStr = String(engine.clock.currentTick).padStart(3, '0');

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.6)] px-space-md flex items-center justify-between border-b border-surface-container-high">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-space-md min-w-max">
        {/* Resonance Studio SVG Logo */}
        <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center border border-surface-container-high shadow-cyan">
          <svg className="w-6 h-6" viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="22" fill="#0C0E14" />
            <circle cx="50" cy="50" r="38" stroke="#1F2430" strokeWidth="2" />
            <path
              d="M22 50 C28 50, 32 24, 38 24 C44 24, 46 76, 52 76 C58 76, 62 36, 68 36 C74 36, 76 50, 80 50"
              stroke="#00F0FF"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="38" cy="24" r="4" fill="#00F0FF" />
            <circle cx="52" cy="76" r="4" fill="#A855F7" />
            <circle cx="68" cy="36" r="4" fill="#FF9F1C" />
          </svg>
        </div>

        <div className="flex flex-col">
          <span className="font-label-md text-label-md text-primary tracking-wider uppercase font-bold">
            Resonance Studio
          </span>
          <div className="flex items-center gap-space-xs">
            <span className="font-body-md text-body-md text-on-surface truncate max-w-[150px]">
              Solaris Drift - v2.4
            </span>
            <span className="font-label-sm text-label-sm text-primary-container flex items-center gap-space-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
              Live Engine
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-surface-variant mx-space-xs" />

        {/* View Navigation Tabs */}
        <nav className="flex items-center bg-surface-container-low rounded p-space-xs gap-1">
          <button
            onClick={() => setActiveTab('arranger')}
            className={`px-space-md py-space-xs rounded transition-all font-label-md text-label-md ${
              activeTab === 'arranger'
                ? 'bg-surface-container-high text-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Arranger
          </button>
          <button
            onClick={() => setActiveTab('synth-lab')}
            className={`px-space-md py-space-xs rounded transition-all font-label-md text-label-md ${
              activeTab === 'synth-lab'
                ? 'bg-surface-container-high text-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Synth Lab
          </button>
          <button
            onClick={() => setActiveTab('drum-machine')}
            className={`px-space-md py-space-xs rounded transition-all font-label-md text-label-md ${
              activeTab === 'drum-machine'
                ? 'bg-surface-container-high text-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Drum Machine
          </button>
          <button
            onClick={() => setActiveTab('plugin-rack')}
            className={`px-space-md py-space-xs rounded transition-all font-label-md text-label-md ${
              activeTab === 'plugin-rack'
                ? 'bg-surface-container-high text-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Plugin Rack
          </button>
        </nav>
      </div>

      {/* Central Transport & Clock Deck */}
      <div className="flex items-center gap-space-md bg-surface-container-low px-space-md py-space-xs rounded shadow-inner">
        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-space-xs">
          <button
            onClick={onPlayToggle}
            className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
              isPlaying
                ? 'bg-primary-container text-surface font-bold shadow-cyan'
                : 'bg-surface-container-high text-on-surface hover:text-primary'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <span className="material-symbols-outlined text-sm">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>

          <button
            onClick={() => setRecordActive(!recordActive)}
            className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
              recordActive
                ? 'bg-error-container text-on-error-container shadow-red animate-pulse'
                : 'bg-surface-container-high text-error hover:bg-error-container'
            }`}
            title="Record"
          >
            <span className="material-symbols-outlined text-sm">fiber_manual_record</span>
          </button>

          <button
            onClick={onStop}
            className="w-7 h-7 flex items-center justify-center rounded bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
            title="Stop & Rewind"
          >
            <span className="material-symbols-outlined text-sm">stop</span>
          </button>

          <button
            onClick={handleLoopToggle}
            className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
              loopActive
                ? 'bg-surface-container-high text-primary-container font-bold'
                : 'bg-surface-container-high text-on-surface-variant hover:text-primary'
            }`}
            title="Cycle Loop"
          >
            <span className="material-symbols-outlined text-sm">repeat</span>
          </button>
        </div>

        <div className="h-6 w-px bg-surface-variant" />

        {/* Telemetry Display Boxes */}
        <div className="flex items-center gap-space-md font-meter-data text-meter-data">
          {/* BPM Stepper */}
          <div className="flex flex-col bg-surface-container-lowest px-space-sm py-space-xs rounded">
            <div className="flex items-center gap-1">
              <span className="text-primary text-xs font-bold">{bpm.toFixed(2)}</span>
              <div className="flex flex-col ml-1">
                <button
                  onClick={() => handleBpmChange(1)}
                  className="text-[9px] text-on-surface-variant hover:text-primary"
                >
                  ▲
                </button>
                <button
                  onClick={() => handleBpmChange(-1)}
                  className="text-[9px] text-on-surface-variant hover:text-primary"
                >
                  ▼
                </button>
              </div>
            </div>
            <span className="text-on-surface-variant text-[9px] uppercase tracking-wider">
              BPM / Tap
            </span>
          </div>

          {/* Time Signature */}
          <div className="flex flex-col bg-surface-container-lowest px-space-sm py-space-xs rounded">
            <span className="text-on-surface text-xs font-bold">4/4</span>
            <span className="text-on-surface-variant text-[9px] uppercase tracking-wider">
              Signature
            </span>
          </div>

          {/* Bar : Beat : Tick */}
          <div className="flex flex-col bg-surface-container-lowest px-space-sm py-space-xs rounded min-w-[76px]">
            <span className="text-primary text-xs font-bold font-mono">
              {barStr}:{beatStr}:{tickStr}
            </span>
            <span className="text-on-surface-variant text-[9px] uppercase tracking-wider">
              Bar.Beat.Tick
            </span>
          </div>

          {/* Key Scale */}
          <div className="flex flex-col bg-surface-container-lowest px-space-sm py-space-xs rounded">
            <span className="text-secondary text-xs font-bold">D min</span>
            <span className="text-on-surface-variant text-[9px] uppercase tracking-wider">Key</span>
          </div>

          {/* Metronome Toggle */}
          <button
            onClick={handleMetronomeToggle}
            className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
              metronomeActive
                ? 'bg-primary-container text-surface font-bold shadow-cyan'
                : 'bg-surface-container-high text-on-surface-variant hover:text-primary'
            }`}
            title="Metronome"
          >
            <span className="material-symbols-outlined text-sm">timer</span>
          </button>
        </div>
      </div>

      {/* Right Deck: Master Meter, CPU/DSP, and Actions */}
      <div className="flex items-center gap-space-md min-w-max">
        {/* Stereo LED Meter */}
        <div className="flex items-center gap-space-xs bg-surface-container-lowest px-space-sm py-space-xs rounded">
          <div className="flex flex-col gap-0.5 w-16">
            <div className="flex justify-between font-meter-data text-meter-data text-on-surface-variant">
              <span>L</span>
              <span className={telemetry.leftPeakDbfs > -3 ? 'text-secondary' : 'text-primary'}>
                {telemetry.leftPeakDbfs > -60 ? `${telemetry.leftPeakDbfs.toFixed(1)} dB` : '-∞'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden flex gap-0.5">
              <div
                className="h-full bg-primary-container transition-all duration-75"
                style={{ width: `${Math.min(80, leftMeterPct)}%` }}
              />
              <div
                className="h-full bg-secondary-container transition-all duration-75"
                style={{ width: `${Math.max(0, Math.min(20, leftMeterPct - 80)) * 5}%` }}
              />
            </div>

            <div className="flex justify-between font-meter-data text-meter-data text-on-surface-variant">
              <span>R</span>
              <span className={telemetry.isClipping ? 'text-signal-red font-bold' : ''}>
                {telemetry.isClipping ? 'CLIP' : (telemetry.rightPeakDbfs > -60 ? `${telemetry.rightPeakDbfs.toFixed(1)} dB` : '-∞')}
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden flex gap-0.5">
              <div
                className="h-full bg-primary-container transition-all duration-75"
                style={{ width: `${Math.min(80, rightMeterPct)}%` }}
              />
              <div
                className="h-full bg-secondary-container transition-all duration-75"
                style={{ width: `${Math.max(0, Math.min(20, rightMeterPct - 80)) * 5}%` }}
              />
            </div>
          </div>
        </div>

        {/* CPU & DSP load */}
        <div className="flex flex-col font-meter-data text-meter-data text-on-surface-variant bg-surface-container-low px-space-sm py-space-xs rounded min-w-[65px]">
          <div className="flex justify-between gap-space-xs">
            <span>CPU</span>
            <span className="text-primary font-mono">{telemetry.cpuLoad}%</span>
          </div>
          <div className="flex justify-between gap-space-xs">
            <span>DSP</span>
            <span className="text-primary font-mono">{telemetry.dspLoad}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-space-xs">
          <button
            onClick={handleExportWav}
            disabled={isExporting}
            className="px-space-md py-space-xs rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-bold hover:bg-primary transition-all flex items-center gap-space-xs shadow-cyan disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">file_download</span>
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>

        {/* User Profile Avatar */}
        <div className="w-8 h-8 rounded-full bg-surface-container-high border border-primary/40 flex items-center justify-center overflow-hidden shadow-cyan">
          <span className="material-symbols-outlined text-primary text-sm">person</span>
        </div>
      </div>
    </header>
  );
};
