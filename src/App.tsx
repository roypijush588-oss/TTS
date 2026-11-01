import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Settings2, Sparkles, AudioLines, Radio, Sliders, Activity, Disc3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AIVoices from './components/AIVoices';
import SystemVoices from './components/SystemVoices';
import MyVoice from './components/MyVoice';
import VoiceClone, { ClonedVoice } from './components/VoiceClone';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ai' | 'clone' | 'system' | 'record'>('ai');
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>(() => {
    try {
      const saved = localStorage.getItem('vocalStudioClonedVoices');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load cloned voices", e);
    }
    return [];
  });

  const [vuLevel, setVuLevel] = useState<number[]>([45, 60, 52, 70, 65, 40, 55, 68]);

  useEffect(() => {
    localStorage.setItem('vocalStudioClonedVoices', JSON.stringify(clonedVoices));
  }, [clonedVoices]);

  // Subtle VU meter idle animation for DAW authenticity
  useEffect(() => {
    const interval = setInterval(() => {
      setVuLevel([
        Math.floor(30 + Math.random() * 45),
        Math.floor(35 + Math.random() * 50),
        Math.floor(25 + Math.random() * 55),
        Math.floor(40 + Math.random() * 50),
        Math.floor(30 + Math.random() * 40),
        Math.floor(20 + Math.random() * 45),
        Math.floor(35 + Math.random() * 40),
        Math.floor(25 + Math.random() * 35),
      ]);
    }, 450);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 font-sans selection:bg-indigo-500/30 flex flex-col">
      {/* Top DAW Transport & Session Ribbon */}
      <header className="border-b border-[#172033] bg-[#0A0E17]/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          {/* Brand Identity & Engine Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400/30">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-white text-lg">
                    Vocal<span className="text-indigo-400">Studio</span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    DAW v2.0
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>DSP ENGINE ONLINE</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-indigo-400/90">24.0 kHz HD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Master Transport / Session Readout */}
          <div className="hidden md:flex items-center gap-6 bg-[#0E1524] px-4 py-1.5 rounded-xl border border-[#1E2B45]">
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">Session Target</span>
              <span className="font-mono text-sm font-bold text-indigo-300 tracking-wider">
                01:00.00 <span className="text-[10px] text-slate-500">(1 MIN)</span>
              </span>
            </div>

            <div className="h-7 w-[1px] bg-[#1E2B45]" />

            {/* Simulated Live Master Stereo VU Meter */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">Output Bus (L/R)</span>
              <div className="flex items-center gap-1">
                {vuLevel.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="w-1.5 h-4 bg-[#141E33] rounded-sm overflow-hidden flex flex-col justify-end"
                  >
                    <div
                      className={`w-full transition-all duration-300 ${
                        lvl > 65
                          ? 'bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ height: `${lvl}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="h-7 w-[1px] bg-[#1E2B45]" />

            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">AI Model</span>
              <span className="text-xs font-semibold text-slate-200">Gemini 3.8 Flash Neural</span>
            </div>
          </div>

          {/* Quick Project Specs */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 bg-[#0E1524] px-3 py-1.5 rounded-lg border border-[#1E2B45]">
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              <span>Verbatim TTS Mode</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
              <Disc3 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Server Proxy Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Studio Console Layout */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left Studio Dock / Track Selector */}
        <aside className="lg:w-64 shrink-0 flex flex-col gap-4">
          <div className="bg-[#0C111C] border border-[#182338] rounded-2xl p-3 flex flex-col gap-1.5 shadow-xl">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Studio Tracks</span>
              <Activity className="w-3 h-3 text-indigo-400" />
            </div>

            <StudioTrackButton
              active={activeTab === 'ai'}
              onClick={() => setActiveTab('ai')}
              icon={<Sparkles className="w-4 h-4" />}
              label="AI Voice Studio"
              sublabel="TTS & 1-Min Time Goal"
              hotkey="1"
            />
            <StudioTrackButton
              active={activeTab === 'clone'}
              onClick={() => setActiveTab('clone')}
              icon={<AudioLines className="w-4 h-4" />}
              label="Voice Clone Lab"
              sublabel={`${clonedVoices.length} Custom Model${clonedVoices.length === 1 ? '' : 's'}`}
              hotkey="2"
            />
            <StudioTrackButton
              active={activeTab === 'system'}
              onClick={() => setActiveTab('system')}
              icon={<Settings2 className="w-4 h-4" />}
              label="Voice Tuner Rack"
              sublabel="Pitch & Speed Calibration"
              hotkey="3"
            />
            <StudioTrackButton
              active={activeTab === 'record'}
              onClick={() => setActiveTab('record')}
              icon={<Mic className="w-4 h-4" />}
              label="Mic Booth"
              sublabel="Live Studio Vocal Capture"
              hotkey="4"
            />
          </div>

          {/* Quick Hardware Rack Telemetry */}
          <div className="hidden lg:flex flex-col gap-3 bg-[#0C111C]/60 border border-[#182338] rounded-2xl p-4 text-xs font-mono text-slate-400">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
              <span>Station Rack Info</span>
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between items-center py-1 border-b border-[#162033]">
                <span className="text-slate-400">Time Goal Mode</span>
                <span className="text-indigo-400 font-semibold">60s / 1 Min Lock</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#162033]">
                <span className="text-slate-400">Synthesis Engine</span>
                <span className="text-slate-200">Neural TTS</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#162033]">
                <span className="text-slate-400">Cloned Profiles</span>
                <span className="text-slate-200">{clonedVoices.length} active</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Audio Latency</span>
                <span className="text-emerald-400">&lt; 180ms</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Stage: Active Studio Deck */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'ai' && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.15 }}
              >
                <AIVoices clonedVoices={clonedVoices} />
              </motion.div>
            )}
            {activeTab === 'clone' && (
              <motion.div
                key="clone"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.15 }}
              >
                <VoiceClone clonedVoices={clonedVoices} setClonedVoices={setClonedVoices} />
              </motion.div>
            )}
            {activeTab === 'system' && (
              <motion.div
                key="system"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.15 }}
              >
                <SystemVoices />
              </motion.div>
            )}
            {activeTab === 'record' && (
              <motion.div
                key="record"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.15 }}
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

function StudioTrackButton({
  active,
  onClick,
  icon,
  label,
  sublabel,
  hotkey,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  hotkey: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left p-2.5 rounded-xl transition-all duration-150 flex items-center gap-3 border ${
        active
          ? 'bg-gradient-to-r from-indigo-950/70 to-indigo-900/40 border-indigo-500/50 text-white shadow-lg shadow-indigo-950/40'
          : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121927]'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          active
            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
            : 'bg-[#151D2D] text-slate-400'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold truncate ${active ? 'text-white' : 'text-slate-200'}`}>
            {label}
          </span>
          <span
            className={`text-[10px] font-mono px-1 py-0.2 rounded border ${
              active
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                : 'bg-[#141C2B] text-slate-500 border-[#1B263B]'
            }`}
          >
            [{hotkey}]
          </span>
        </div>
        <p className="text-[11px] text-slate-400 truncate">{sublabel}</p>
      </div>
      {active && (
        <span className="w-1.5 h-4 rounded-full bg-indigo-400 shrink-0" />
      )}
    </button>
  );
}
