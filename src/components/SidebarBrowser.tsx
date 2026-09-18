import React, { useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface SidebarBrowserProps {
  engine: AudioEngine;
}

export const SidebarBrowser: React.FC<SidebarBrowserProps> = ({ engine }) => {
  const [activeCategory, setActiveCategory] = useState<string>('preset-instruments');
  const [searchQuery, setSearchQuery] = useState('');

  const sampleCategories = [
    { id: 'sound-packs', label: 'Sound Packs', icon: 'album', color: 'text-secondary' },
    { id: 'preset-instruments', label: 'Preset Instruments', icon: 'piano', color: 'text-primary-container' },
    { id: 'vst-plugins', label: 'VST Plugins', icon: 'extension', color: 'text-tertiary-fixed-dim' },
    { id: 'drum-kits', label: 'Drum Kits', icon: 'grid_view', color: 'text-secondary' },
    { id: 'audio-samples', label: 'Audio Samples', icon: 'graphic_eq', color: 'text-primary' },
    { id: 'project-files', label: 'Project Files', icon: 'description', color: 'text-outline' },
  ];

  const presetsList = [
    { name: 'Solaris Shimmer Lead', cat: 'preset-instruments', action: () => engine.synthEngine.loadPreset('solaris') },
    { name: 'Cyber Sub Singularity', cat: 'preset-instruments', action: () => engine.synthEngine.loadPreset('cyber_bass') },
    { name: 'Orbital Horizon Pad', cat: 'preset-instruments', action: () => engine.synthEngine.loadPreset('orbital_pad') },
    { name: 'Cyberpunk Trap 808', cat: 'drum-kits', action: () => engine.drumEngine.loadPattern('cyberpunk') },
    { name: 'Vintage Detroit 909', cat: 'drum-kits', action: () => engine.drumEngine.loadPattern('detroit') },
    { name: 'Organic Lo-Fi Chill', cat: 'drum-kits', action: () => engine.drumEngine.loadPattern('lofi') },
    { name: 'UK Garage Breaks', cat: 'drum-kits', action: () => engine.drumEngine.loadPattern('ukg') },
    { name: 'Kick 808 Analog', cat: 'audio-samples', action: () => engine.drumEngine.triggerPad(0) },
    { name: 'Snare Tight Layer', cat: 'audio-samples', action: () => engine.drumEngine.triggerPad(1) },
    { name: 'Clap Neo Stereo', cat: 'audio-samples', action: () => engine.drumEngine.triggerPad(2) },
    { name: 'Prism Dynamic EQ v2.1', cat: 'vst-plugins', action: () => {} },
    { name: 'Analog Tape Saturation', cat: 'vst-plugins', action: () => {} },
    { name: 'Brickwall Peak Limiter', cat: 'vst-plugins', action: () => {} },
    { name: 'Solaris_Drift_v2.4.flac', cat: 'project-files', action: () => {} },
    { name: 'Nebula_Groove_Demo.wav', cat: 'project-files', action: () => {} },
  ];

  const filteredItems = presetsList.filter(
    (item) =>
      item.cat === activeCategory &&
      (searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePreview = async (item: (typeof presetsList)[0]) => {
    await engine.resumeContext();
    item.action();
  };

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-container-lowest z-40 flex flex-col border-r border-surface-container-high shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
      {/* Header / Search */}
      <div className="p-space-md flex items-center justify-between bg-surface-container-low/50 border-b border-surface-container-high">
        <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant flex items-center gap-space-xs font-semibold">
          <span className="material-symbols-outlined text-sm text-primary">folder_open</span>
          Sound Browser
        </span>
        <span className="material-symbols-outlined text-sm text-on-surface-variant hover:text-on-surface cursor-pointer">
          filter_list
        </span>
      </div>

      <div className="px-space-md py-space-xs border-b border-surface-container-high">
        <div className="flex items-center gap-space-xs bg-surface-container-high px-space-sm py-1 rounded">
          <span className="material-symbols-outlined text-xs text-on-surface-variant">search</span>
          <input
            className="bg-transparent border-none outline-none font-body-md text-body-md text-on-surface placeholder:text-outline-variant w-full"
            placeholder="Search sounds, plugins..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-on-surface-variant hover:text-on-surface"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Folders */}
      <nav className="p-space-sm space-y-space-xs font-label-md text-label-md border-b border-surface-container-high">
        {sampleCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`w-full flex items-center gap-space-md px-space-md py-space-sm rounded transition-all text-left ${
              activeCategory === cat.id
                ? 'bg-surface-container-high text-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span className={`material-symbols-outlined text-base ${cat.color}`}>{cat.icon}</span>
            <span className="truncate">{cat.label}</span>
          </button>
        ))}
      </nav>

      {/* Item List / Audition Trigger */}
      <div className="flex-1 px-space-sm py-space-xs overflow-y-auto space-y-1">
        <div className="px-space-sm py-1 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider flex justify-between">
          <span>Items ({filteredItems.length})</span>
          <span className="text-[10px]">Click to Audition</span>
        </div>

        {filteredItems.map((item, idx) => (
          <div
            key={idx}
            onClick={() => handlePreview(item)}
            className="group flex items-center justify-between px-space-md py-1.5 rounded bg-surface-container-low/60 hover:bg-surface-container hover:border-l-2 hover:border-primary cursor-pointer transition-all text-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="material-symbols-outlined text-xs text-on-surface-variant group-hover:text-primary transition-colors">
                play_arrow
              </span>
              <span className="truncate text-on-surface font-mono group-hover:text-primary">
                {item.name}
              </span>
            </div>
            <span className="font-meter-data text-[9px] text-on-surface-variant uppercase px-1 rounded bg-surface-container-lowest">
              LOAD
            </span>
          </div>
        ))}
      </div>

      {/* Storage Footer */}
      <div className="p-space-sm bg-surface-container-low font-meter-data text-meter-data text-on-surface-variant flex justify-between items-center border-t border-surface-container-high">
        <span className="text-[10px] tracking-wider">STORAGE: 42.8 GB FREE</span>
        <span className="material-symbols-outlined text-xs text-primary-container">cloud_done</span>
      </div>
    </aside>
  );
};
