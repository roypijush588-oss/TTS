import React, { useState } from 'react';
import { Mic, Volume2, Settings, Sparkles, AudioLines } from 'lucide-react';
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

  React.useEffect(() => {
    localStorage.setItem('vocalStudioClonedVoices', JSON.stringify(clonedVoices));
  }, [clonedVoices]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-indigo-500/30">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-4">
            <Volume2 className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Vocal<span className="text-indigo-400">Studio</span>
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Transform text into lifelike speech using advanced AI, customize system voices, or record your own natural voice.
          </p>
        </header>

        <div className="flex justify-center mb-8">
          <div className="bg-neutral-900/50 p-1.5 rounded-2xl inline-flex border border-neutral-800/50 backdrop-blur-sm">
            <TabButton
              active={activeTab === 'ai'}
              onClick={() => setActiveTab('ai')}
              icon={<Sparkles className="w-4 h-4" />}
              label="AI Voices"
            />
            <TabButton
              active={activeTab === 'clone'}
              onClick={() => setActiveTab('clone')}
              icon={<AudioLines className="w-4 h-4" />}
              label="Voice Cloning"
            />
            <TabButton
              active={activeTab === 'system'}
              onClick={() => setActiveTab('system')}
              icon={<Settings className="w-4 h-4" />}
              label="Voice Tuner"
            />
            <TabButton
              active={activeTab === 'record'}
              onClick={() => setActiveTab('record')}
              icon={<Mic className="w-4 h-4" />}
              label="My Voice"
            />
          </div>
        </div>

        <main className="relative bg-neutral-900/30 border border-neutral-800/50 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
          <AnimatePresence mode="wait">
            {activeTab === 'ai' && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <AIVoices clonedVoices={clonedVoices} />
              </motion.div>
            )}
            {activeTab === 'clone' && (
              <motion.div
                key="clone"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <VoiceClone clonedVoices={clonedVoices} setClonedVoices={setClonedVoices} />
              </motion.div>
            )}
            {activeTab === 'system' && (
              <motion.div
                key="system"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SystemVoices />
              </motion.div>
            )}
            {activeTab === 'record' && (
              <motion.div
                key="record"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
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

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors ${
        active ? 'text-white' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
      }`}
    >
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-indigo-500/20 border border-indigo-500/30 rounded-xl"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );
}
