import React, { useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { ArrangerTrack } from '../audio/ArrangerClock';

interface ArrangerViewProps {
  engine: AudioEngine;
}

export const ArrangerView: React.FC<ArrangerViewProps> = ({ engine }) => {
  const [tracks, setTracks] = useState<ArrangerTrack[]>(engine.clock.tracks);
  const [activeTool, setActiveTool] = useState<'draw' | 'slice' | 'quantize'>('draw');
  const [zoomLevel, setZoomLevel] = useState<number>(140);
  const [selectedTrackId, setSelectedTrackId] = useState<number>(1);

  // Re-render when tracks are modified
  const toggleMute = (trackId: number) => {
    const updated = tracks.map((t) => {
      if (t.id === trackId) {
        return { ...t, muted: !t.muted };
      }
      return t;
    });
    setTracks(updated);
    engine.clock.tracks = updated;
  };

  const toggleSolo = (trackId: number) => {
    const isCurrentlySolo = tracks.find((t) => t.id === trackId)?.solo;
    const updated = tracks.map((t) => {
      if (t.id === trackId) {
        return { ...t, solo: !isCurrentlySolo };
      }
      return { ...t, solo: false };
    });
    setTracks(updated);
    engine.clock.tracks = updated;
  };

  const setVolume = (trackId: number, val: number) => {
    const updated = tracks.map((t) => (t.id === trackId ? { ...t, volume: val } : t));
    setTracks(updated);
    engine.clock.tracks = updated;
  };

  // Playhead position percentage across 32 bars
  const totalBars = 32;
  const currentStep = (engine.clock.currentBar - 1) * 16 + (engine.clock.currentBeat - 1) * 4;
  const playheadPct = Math.max(0, Math.min(100, (currentStep / (totalBars * 16)) * 100));

  // Scrub playhead on ruler click
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetBar = Math.floor(pct * totalBars) + 1;
    engine.clock.currentBar = targetBar;
    engine.clock.currentBeat = 1;
    engine.clock.currentTick = 0;
  };

  return (
    <div className="flex flex-col w-full text-on-surface select-none space-y-space-md">
      {/* Top Arranger Bar */}
      <div className="flex items-center justify-between bg-surface-container-lowest px-space-md py-space-xs rounded shadow-sm border border-surface-container-high">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs bg-surface-container-high px-space-sm py-0.5 rounded">
            <span className="material-symbols-outlined text-xs text-primary-container">tune</span>
            <span className="font-label-md text-label-md text-primary font-bold">ARRANGER MATRIX</span>
          </div>

          <span className="font-meter-data text-meter-data text-on-surface-variant tracking-wider">
            PROJECT: SOLARIS_DRIFT_v2.4.flac
          </span>

          <div className="h-3 w-px bg-surface-variant" />

          <div className="flex items-center gap-space-xs font-meter-data text-meter-data">
            <span className="text-on-surface-variant">LOOP:</span>
            <span className="text-primary-container font-bold bg-surface-container-high px-1 rounded">
              BAR 01 - 09
            </span>
            <span className="text-secondary font-bold ml-space-xs">SNAP 1/16</span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          {/* Tool selectors */}
          <div className="flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded font-label-sm text-label-sm">
            <button
              onClick={() => setActiveTool('draw')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 font-bold transition-colors ${
                activeTool === 'draw'
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xs">edit</span>Draw
            </button>
            <button
              onClick={() => setActiveTool('slice')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                activeTool === 'slice'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xs">content_cut</span>Slice
            </button>
            <button
              onClick={() => setActiveTool('quantize')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                activeTool === 'quantize'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xs">straighten</span>Quantize
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-space-xs bg-surface-container-high px-2 py-0.5 rounded font-meter-data text-meter-data">
            <span className="text-on-surface-variant">ZOOM:</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
              className="text-primary font-bold hover:underline"
            >
              {zoomLevel}%
            </button>
          </div>
        </div>
      </div>

      {/* Main Timeline Workspace */}
      <div className="flex flex-col bg-surface-container-lowest rounded-lg shadow-xl border border-surface-container-high overflow-hidden">
        {/* Timeline Header Ruler */}
        <div className="flex bg-surface-container-low border-b border-surface-container-high">
          {/* Left Corner: Track count & quick tools */}
          <div className="w-64 flex-shrink-0 px-space-md py-space-xs flex items-center justify-between bg-surface-container-lowest border-r border-surface-container-high">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-xs text-primary">view_timeline</span>
              <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider font-bold">
                Track List ({tracks.length})
              </span>
            </div>
            <div className="flex items-center gap-space-xs">
              <button
                className="material-symbols-outlined text-xs text-on-surface-variant hover:text-primary transition-colors"
                title="Add Track"
              >
                add_box
              </button>
              <button
                className="material-symbols-outlined text-xs text-on-surface-variant hover:text-primary transition-colors"
                title="Solo Clear"
              >
                volume_off
              </button>
            </div>
          </div>

          {/* 32 Bar Measure Ruler */}
          <div
            onClick={handleRulerClick}
            className="flex-1 relative overflow-hidden flex items-center bg-surface-container-lowest cursor-pointer h-10 select-none"
          >
            {/* Active Cycle Loop (Bars 1 to 9 = 25%) */}
            <div className="absolute left-0 top-0 bottom-0 w-[25%] bg-primary-container/10 border-r border-primary-container/40 flex items-center">
              <div className="w-full h-1 bg-primary-container/40 absolute top-0" />
              <span className="absolute left-2 top-0.5 font-meter-data text-[9px] text-primary-container font-bold tracking-widest uppercase">
                Cycle Active (8 Bars)
              </span>
            </div>

            {/* Measure Labels */}
            <div className="w-full flex items-center font-meter-data text-meter-data text-on-surface-variant">
              {Array.from({ length: totalBars }).map((_, barIdx) => {
                const barNum = barIdx + 1;
                const isPlayheadBar = engine.clock.currentBar === barNum;
                let markerLabel = '';
                if (barNum === 1) markerLabel = 'Intro';
                if (barNum === 5) markerLabel = 'Drop';
                if (barNum === 9) markerLabel = 'Verse';
                if (barNum === 17) markerLabel = 'Chorus';
                if (barNum === 25) markerLabel = 'Outro';

                return (
                  <div
                    key={barIdx}
                    className={`w-[3.125%] py-1 pl-1 flex flex-col items-start border-r border-surface-container-high/40 ${
                      isPlayheadBar ? 'text-primary font-bold bg-primary-container/10' : ''
                    }`}
                  >
                    <span>{String(barNum).padStart(2, '0')}</span>
                    {markerLabel && (
                      <span className="text-[8px] text-secondary font-semibold uppercase">
                        {markerLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Playhead Vertical Needle in Ruler */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary-container z-30 shadow-[0_0_8px_rgba(0,240,255,0.9)] transition-all duration-75 pointer-events-none"
              style={{ left: `${playheadPct}%` }}
            >
              <div className="w-3 h-3 bg-primary-container rotate-45 -ml-[5px] -mt-1 shadow-sm" />
            </div>
          </div>
        </div>

        {/* Tracks List & Matrix Grid */}
        <div className="relative flex flex-col divide-y divide-surface-container-high">
          {/* Running Playhead Line spanning all tracks */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary-container z-20 shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all duration-75 pointer-events-none"
            style={{ left: `calc(16rem + (100% - 16rem) * ${playheadPct / 100})` }}
          />

          {tracks.map((track) => {
            const isSelected = selectedTrackId === track.id;

            return (
              <div
                key={track.id}
                onClick={() => setSelectedTrackId(track.id)}
                className={`flex h-20 transition-colors ${
                  isSelected ? 'bg-surface-container-low/80' : 'bg-surface-container-lowest hover:bg-surface-container-low/40'
                }`}
              >
                {/* Track Header Channel Strip (w-64) */}
                <div className="w-64 flex-shrink-0 p-space-sm flex flex-col justify-between border-r border-surface-container-high bg-surface-container-low/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: track.color }}
                      />
                      <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                        {track.name}
                      </span>
                    </div>

                    <span className="font-meter-data text-[9px] px-1 rounded bg-surface-container text-on-surface-variant font-mono">
                      {track.category}
                    </span>
                  </div>

                  {/* Volume Slider & Pan */}
                  <div className="flex items-center gap-space-xs">
                    <span className="font-meter-data text-[9px] text-on-surface-variant">VOL</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={track.volume}
                      onChange={(e) => setVolume(track.id, Number(e.target.value))}
                      className="w-full h-1 bg-surface-container-high rounded cursor-pointer"
                    />
                    <span className="font-meter-data text-[9px] text-primary w-6 text-right">
                      {track.volume}%
                    </span>
                  </div>

                  {/* Solo & Mute Buttons */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1 font-label-sm text-label-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute(track.id);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                          track.muted
                            ? 'bg-signal-red text-surface shadow-red'
                            : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        M
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSolo(track.id);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                          track.solo
                            ? 'bg-secondary text-surface shadow-amber'
                            : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        S
                      </button>
                    </div>

                    <span className="font-meter-data text-[9px] text-on-surface-variant">
                      PAN: {track.pan > 0 ? `R${track.pan}` : track.pan < 0 ? `L${Math.abs(track.pan)}` : 'C'}
                    </span>
                  </div>
                </div>

                {/* Track Timeline Lane */}
                <div className="flex-1 relative flex items-center px-1 overflow-hidden">
                  {/* Grid measure tick lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: totalBars }).map((_, i) => (
                      <div
                        key={i}
                        className="w-[3.125%] h-full border-r border-surface-container-high/20"
                      />
                    ))}
                  </div>

                  {/* Audio / MIDI Region Clips */}
                  {track.clips.map((clip) => {
                    const leftPct = ((clip.startBar - 1) / totalBars) * 100;
                    const widthPct = (clip.durationBars / totalBars) * 100;

                    return (
                      <div
                        key={clip.id}
                        className="absolute h-14 rounded border shadow-sm flex flex-col justify-between p-1 cursor-pointer transition-all hover:brightness-110"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: `${clip.color}18`,
                          borderColor: `${clip.color}80`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="font-label-sm text-[10px] font-bold truncate"
                            style={{ color: clip.color }}
                          >
                            {clip.name}
                          </span>
                          <span className="font-meter-data text-[8px] text-on-surface-variant">
                            {clip.durationBars}B
                          </span>
                        </div>

                        {/* Simulated audio waveform visual in clip */}
                        <div className="w-full h-5 flex items-center justify-around opacity-60">
                          {Array.from({ length: 24 }).map((_, wIdx) => {
                            const h = 20 + Math.sin(wIdx * 0.8 + track.id) * 60;
                            return (
                              <div
                                key={wIdx}
                                className="w-0.5 rounded-full"
                                style={{
                                  height: `${h}%`,
                                  backgroundColor: clip.color,
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
