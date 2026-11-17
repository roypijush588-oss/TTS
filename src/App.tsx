import React, { useState } from 'react';
import { Mic, Settings, Sparkles, AudioLines } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AIVoices from './components/AIVoices';
import SystemVoices from './components/SystemVoices';
import MyVoice from './components/MyVoice';
import VoiceClone, { ClonedVoice } from './components/VoiceClone';

type StudioTab = 'ai' | 'clone' | 'system' | 'record';

const TAB_ITEMS: { id: StudioTab; label: string; subtitle: string; icon: React.ReactNode }[] = [
  {
    id: 'ai',
    label: 'AI Voices',
    subtitle: 'Generate natural Hinglish and English voiceovers calibrated to exact duration targets.',
    icon: <Sparkles className="w-4 h-4 shrink-0" />,
  },
  {
    id: 'clone',
    label: 'Voice Cloning',
    subtitle: 'Train custom voice profiles from a quick mic take or uploaded audio sample.',
    icon: <AudioLines className="w-4 h-4 shrink-0" />,
  },
  {
    id: 'system',
    label: 'Voice Tuner',
    subtitle: 'Fine-tune browser speech pitch, speed multipliers, and reusable voice presets.',
    icon: <Settings className="w-4 h-4 shrink-0" />,
  },
  {
    id: 'record',
    label: 'My Voice',
    subtitle: 'Capture clean studio microphone takes and export standard WAV audio files.',
    icon: <Mic className="w-4 h-4 shrink-0" />,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<StudioTab>('ai');
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>(() => {
    try {
      const saved = localStorage.getItem('vocalStudioClonedVoices');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load cloned voices', e);
    }
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('vocalStudioClonedVoices', JSON.stringify(clonedVoices));
  }, [clonedVoices]);

  const currentTabMeta = TAB_ITEMS.find((t) => t.id === activeTab) || TAB_ITEMS[0];

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0B0D10] text-zinc-100 selection:bg-amber-500/30 selection:text-amber-100">
      {/* Top Studio Bar — 3-Zone Contract */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#0B0D10]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className="text-lg sm:text-xl font-semibold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 rounded-md"
          >
            Vocal<span className="text-amber-400">Studio</span>
          </button>

          {/* Zone 2: Single-line Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Studio Sections">
            {TAB_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 rounded-md ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="activeNavUnderline"
                      className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-amber-400"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'record' ? 'ai' : 'record')}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {activeTab === 'record' ? 'Open AI Studio' : 'Record Voice'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Shell */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Mobile Navigation Grid (Prevents horizontal overflow on narrow viewports) */}
        <nav className="grid grid-cols-2 gap-2 md:hidden" aria-label="Mobile Studio Sections">
          {TAB_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-center gap-2 min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-[#12151B] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Workspace Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 pb-1">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              {currentTabMeta.label}
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl">
              {currentTabMeta.subtitle}
            </p>
          </div>
          <div className="text-xs text-zinc-500 font-mono tabular-nums whitespace-nowrap">
            {clonedVoices.length} custom {clonedVoices.length === 1 ? 'voice' : 'voices'} saved
          </div>
        </div>

        {/* Single-Elevation Studio Surface */}
        <main className="bg-[#12151B] border border-zinc-800/80 rounded-2xl p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'ai' && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
              >
                <AIVoices clonedVoices={clonedVoices} />
              </motion.div>
            )}
            {activeTab === 'clone' && (
              <motion.div
                key="clone"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
              >
                <VoiceClone clonedVoices={clonedVoices} setClonedVoices={setClonedVoices} />
              </motion.div>
            )}
            {activeTab === 'system' && (
              <motion.div
                key="system"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
              >
                <SystemVoices />
              </motion.div>
            )}
            {activeTab === 'record' && (
              <motion.div
                key="record"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
              >
                <MyVoice />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
