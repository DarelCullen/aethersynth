import React, { useState, useEffect, useMemo } from 'react';
import { AudioEngine, AudioTelemetry } from './audio/AudioEngine';
import { Header } from './components/Header';
import { SidebarBrowser } from './components/SidebarBrowser';
import { ArrangerView } from './components/ArrangerView';
import { SynthLabView } from './components/SynthLabView';
import { DrumMachineView } from './components/DrumMachineView';
import { PluginRackView } from './components/PluginRackView';

export const App: React.FC = () => {
  const engine = useMemo(() => AudioEngine.getInstance(), []);

  const [activeTab, setActiveTab] = useState<'arranger' | 'synth-lab' | 'drum-machine' | 'plugin-rack'>('arranger');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);

  const [telemetry, setTelemetry] = useState<AudioTelemetry>({
    leftDbfs: -70,
    rightDbfs: -70,
    leftPeakDbfs: -70,
    rightPeakDbfs: -70,
    isClipping: false,
    cpuLoad: 18,
    dspLoad: 24,
  });

  useEffect(() => {
    engine.onTelemetry = (data) => {
      setTelemetry(data);
    };

    engine.clock.onPlayheadUpdate = () => {
      // Re-trigger playhead updates across views
      setIsPlaying(engine.clock.isPlaying);
    };

    const handleFirstGesture = async () => {
      await engine.resumeContext();
      setIsAudioReady(true);
    };

    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [engine]);

  const handlePlayToggle = async () => {
    await engine.resumeContext();
    setIsAudioReady(true);
    if (isPlaying) {
      engine.clock.pause();
      setIsPlaying(false);
    } else {
      engine.clock.play();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    engine.clock.stop();
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col antialiased select-none">
      {/* Top Header Deck */}
      <Header
        engine={engine}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        telemetry={telemetry}
        isPlaying={isPlaying}
        onPlayToggle={handlePlayToggle}
        onStop={handleStop}
      />

      {/* Main Studio Body */}
      <div className="flex w-full">
        {/* Left Library Browser Sidebar */}
        <SidebarBrowser engine={engine} />

        {/* Studio Workspace Content Area */}
        <main className="pl-64 pt-20 pb-12 px-space-md w-full min-h-screen bg-surface overflow-x-hidden">
          {/* Subtle audio activation banner if context still needs initial user gesture */}
          {!isAudioReady && (
            <div
              onClick={async () => {
                await engine.resumeContext();
                setIsAudioReady(true);
              }}
              className="mb-space-md py-2 px-space-md rounded bg-primary-container/10 border border-primary/30 flex items-center justify-between cursor-pointer hover:bg-primary-container/20 transition-all shadow-cyan"
            >
              <div className="flex items-center gap-space-sm font-label-md text-label-md text-primary font-bold">
                <span className="material-symbols-outlined text-sm animate-pulse">volume_up</span>
                <span>Click anywhere to activate the Web Audio DSP Engine</span>
              </div>
              <span className="font-meter-data text-meter-data text-primary-container bg-surface-container-lowest px-2 py-0.5 rounded">
                AUDIO ENGINE READY
              </span>
            </div>
          )}

          {/* Active Workspace View */}
          {activeTab === 'arranger' && <ArrangerView engine={engine} />}
          {activeTab === 'synth-lab' && <SynthLabView engine={engine} />}
          {activeTab === 'drum-machine' && <DrumMachineView engine={engine} />}
          {activeTab === 'plugin-rack' && <PluginRackView engine={engine} />}
        </main>
      </div>
    </div>
  );
};

export default App;
