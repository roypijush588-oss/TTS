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
  const [text, setText] = useState(
    'This is a system voice. You can tune my pitch and speed to create a custom voice profile.'
  );
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
      console.error('Failed to load presets', e);
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
        const defaultVoice =
          availableVoices.find((v) => v.lang.startsWith('en') && v.name.includes('Natural')) ||
          availableVoices.find((v) => v.lang.startsWith('en')) ||
          availableVoices[0];
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
    const voice = voices.find((v) => v.voiceURI === selectedVoiceURI);
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
    setPresets(presets.filter((p) => p.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left: Script & Transport */}
      <div className="lg:col-span-7 space-y-5">
        <div className="space-y-2.5">
          <label htmlFor="system-tts-input" className="block text-sm font-medium text-zinc-200">
            Text to Speech
          </label>
          <textarea
            id="system-tts-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-56 bg-[#0B0D10] border border-zinc-800 rounded-xl p-4 text-[15px] leading-relaxed text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 resize-none transition-colors"
            placeholder="Enter text here..."
          />
        </div>

        <button
          type="button"
          onClick={isPlaying ? handleStop : handlePlay}
          disabled={!text.trim() || voices.length === 0}
          className={`w-full flex items-center justify-center gap-2 min-h-[46px] py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${
            isPlaying
              ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/40'
              : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Play System Voice</span>
            </>
          )}
        </button>
      </div>

      {/* Right: Tuning Parameters & Presets */}
      <div className="lg:col-span-5 lg:border-l lg:border-zinc-800/80 lg:pl-8 space-y-6">
        <div className="flex items-center gap-2 text-zinc-100">
          <Settings2 className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-base">Voice Tuner</h3>
        </div>

        <div className="space-y-2">
          <label htmlFor="base-voice-select" className="block text-sm font-medium text-zinc-200">
            Base Voice
          </label>
          <select
            id="base-voice-select"
            value={selectedVoiceURI}
            onChange={(e) => setSelectedVoiceURI(e.target.value)}
            className="w-full bg-[#0B0D10] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
          >
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label htmlFor="pitch-slider" className="font-medium text-zinc-200">
              Pitch
            </label>
            <span className="font-mono tabular-nums text-amber-400">{pitch.toFixed(1)}</span>
          </div>
          <input
            id="pitch-slider"
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={pitch}
            onChange={(e) => setPitch(parseFloat(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Deep</span>
            <span>High</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label htmlFor="speed-slider" className="font-medium text-zinc-200">
              Speed
            </label>
            <span className="font-mono tabular-nums text-amber-400">{rate.toFixed(1)}x</span>
          </div>
          <input
            id="speed-slider"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>

        <div className="pt-5 border-t border-zinc-800/80 space-y-3">
          <h4 className="text-sm font-medium text-zinc-200">Save Preset</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              className="flex-1 min-w-0 bg-[#0B0D10] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
            />
            <button
              type="button"
              onClick={savePreset}
              disabled={!presetName.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              title="Save Preset"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>

        {presets.length > 0 && (
          <div className="pt-5 border-t border-zinc-800/80 space-y-3">
            <div className="flex items-center gap-2 text-zinc-200">
              <List className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-medium">Saved Presets</h4>
            </div>
            <div className="space-y-2 lg:max-h-60 lg:overflow-y-auto lg:pr-1 custom-scrollbar">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex justify-between items-center bg-[#0B0D10] border border-zinc-800 p-3 rounded-xl hover:border-zinc-700 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="flex-1 text-left flex flex-col items-start min-w-0"
                  >
                    <span className="text-sm font-medium text-zinc-100 truncate w-full">{preset.name}</span>
                    <span className="text-xs text-zinc-400 font-mono tabular-nums truncate w-full mt-0.5">
                      {voices.find((v) => v.voiceURI === preset.voiceURI)?.name || 'Unknown'} · Pt:{preset.pitch.toFixed(1)} · Sp:{preset.rate.toFixed(1)}x
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePreset(preset.id)}
                    className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors ml-2 shrink-0"
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
  );
}
