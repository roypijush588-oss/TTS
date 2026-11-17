import React, { useState, useEffect } from 'react';
import { Play, Square, Settings2, Save, Trash2, List } from 'lucide-react';

interface VoicePreset {
  id: string;
  name: string;
  voiceURI: string;
  pitch: number;
  rate: number;
}

export default function SystemVoices() {
  const [text, setText] = useState('This is a system voice. You can tune my pitch and speed to create a custom voice profile.');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [pitch, setPitch] = useState(1);
  const [rate, setRate] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [presets, setPresets] = useState<VoicePreset[]>(() => {
    try {
      const saved = localStorage.getItem('vocalStudioPresets');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load presets", e);
    }
    return [];
  });
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    localStorage.setItem('vocalStudioPresets', JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoiceURI) {
        // Prefer a natural sounding English voice if available
        const defaultVoice = availableVoices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) 
                          || availableVoices.find(v => v.lang.startsWith('en')) 
                          || availableVoices[0];
        setSelectedVoiceURI(defaultVoice.voiceURI);
      }
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoiceURI]);

  const handlePlay = () => {
    if (!text.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.pitch = pitch;
    utterance.rate = rate;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const savePreset = () => {
    if (!presetName.trim() || !selectedVoiceURI) return;
    const newPreset: VoicePreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      voiceURI: selectedVoiceURI,
      pitch,
      rate,
    };
    setPresets([...presets, newPreset]);
    setPresetName('');
  };

  const applyPreset = (preset: VoicePreset) => {
    setSelectedVoiceURI(preset.voiceURI);
    setPitch(preset.pitch);
    setRate(preset.rate);
  };

  const deletePreset = (id: string) => {
    setPresets(presets.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <label className="block text-sm font-medium text-neutral-300">
            Text to Speech
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-48 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none resize-none transition-all"
            placeholder="Enter text here..."
          />
          
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={isPlaying ? handleStop : handlePlay}
              disabled={!text.trim() || voices.length === 0}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium transition-all ${
                isPlaying 
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square className="w-5 h-5 fill-current" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Play
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-6 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-2 text-indigo-400 mb-4">
            <Settings2 className="w-5 h-5" />
            <h3 className="font-medium">Voice Tuner</h3>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-neutral-300">
              Base Voice
            </label>
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-neutral-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none appearance-none"
            >
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-neutral-300">Pitch</label>
              <span className="text-sm text-neutral-500">{pitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-neutral-600">
              <span>Deep</span>
              <span>High</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-neutral-300">Speed</label>
              <span className="text-sm text-neutral-500">{rate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-neutral-600">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 space-y-4">
            <h4 className="text-sm font-medium text-neutral-300">Save Preset</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name..."
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-sm text-neutral-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
              />
              <button
                onClick={savePreset}
                disabled={!presetName.trim()}
                className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Save Preset"
              >
                <Save className="w-5 h-5" />
              </button>
            </div>
          </div>

          {presets.length > 0 && (
            <div className="pt-4 border-t border-neutral-800 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <List className="w-5 h-5" />
                <h4 className="text-sm font-medium">Saved Presets</h4>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {presets.map((preset) => (
                  <div key={preset.id} className="flex justify-between items-center bg-neutral-950 border border-neutral-800 p-3 rounded-xl hover:border-neutral-700 transition-colors group">
                    <button 
                      onClick={() => applyPreset(preset)}
                      className="flex-1 text-left flex flex-col items-start min-w-0"
                    >
                      <span className="text-sm font-medium text-neutral-200 truncate w-full">{preset.name}</span>
                      <span className="text-xs text-neutral-500 truncate w-full">
                        {voices.find(v => v.voiceURI === preset.voiceURI)?.name || 'Unknown'} • Pt: {preset.pitch.toFixed(1)} • Sp: {preset.rate.toFixed(1)}
                      </span>
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="text-neutral-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors ml-2 flex-shrink-0"
                      title="Delete Preset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
