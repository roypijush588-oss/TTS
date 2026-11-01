import React, { useState, useEffect } from 'react';
import { Play, Square, Settings2, Save, Trash2, List, Sliders, Volume2 } from 'lucide-react';

interface VoicePreset {
  id: string;
  name: string;
  voiceURI: string;
  pitch: number;
  rate: number;
}

export default function SystemVoices() {
  const [text, setText] = useState('This is the vocal calibration track. Adjust pitch and playback speed to dial in exact formant characteristics.');
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
    <div className="space-y-6">
      {/* Header Ribbon */}
      <div className="bg-[#0C111C] border border-[#182338] rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">TRACK 03: VOICE TUNER & FORMANT RACK</h2>
            <p className="text-xs text-slate-400">Real-time pitch shift, tempo rate calibration, and custom preset memory</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Section (Cols 1-7): Script & Playback */}
        <div className="lg:col-span-7 bg-[#0C111C] border border-[#182338] rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Vocal Script Input
              </label>
              <span className="text-xs font-mono text-slate-400">
                {text.trim() ? text.trim().split(/\s+/).length : 0} words
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-56 bg-[#080B12] border border-[#182338] rounded-xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 font-sans leading-relaxed resize-none"
              placeholder="Enter text to test calibration..."
            />
          </div>
          
          <div className="pt-2">
            <button
              onClick={isPlaying ? handleStop : handlePlay}
              disabled={!text.trim() || voices.length === 0}
              className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-mono text-xs font-bold transition-all ${
                isPlaying 
                  ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40'
                  : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
              } disabled:opacity-50`}
            >
              {isPlaying ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>STOP PLAYBACK</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>PREVIEW TUNED VOCALS</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Section (Cols 8-12): Sliders & Presets Rack */}
        <div className="lg:col-span-5 bg-[#0C111C] border border-[#182338] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-[#182338]">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              DSP CONTROLS
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-300">
              Selected Audio Unit Voice
            </label>
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="w-full bg-[#080B12] border border-[#182338] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 font-mono"
            >
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Pitch Slider */}
          <div className="space-y-2 p-3 bg-[#080B12] rounded-xl border border-[#182338]">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Pitch Formant</span>
              <span className="text-indigo-400 font-bold">{pitch.toFixed(1)}</span>
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
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Deep (0.0)</span>
              <span>Default (1.0)</span>
              <span>High (2.0)</span>
            </div>
          </div>

          {/* Speed Slider */}
          <div className="space-y-2 p-3 bg-[#080B12] rounded-xl border border-[#182338]">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Playback Rate (Speed)</span>
              <span className="text-indigo-400 font-bold">{rate.toFixed(1)}x</span>
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
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0.5x Slow</span>
              <span>1.0x Normal</span>
              <span>2.0x Fast</span>
            </div>
          </div>

          {/* Save Preset */}
          <div className="pt-3 border-t border-[#182338] space-y-2">
            <span className="text-xs font-mono text-slate-400">Save Preset to Rack</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name..."
                className="flex-1 bg-[#080B12] border border-[#182338] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 font-mono"
              />
              <button
                onClick={savePreset}
                disabled={!presetName.trim()}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-semibold disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>SAVE</span>
              </button>
            </div>
          </div>

          {/* Saved Presets */}
          {presets.length > 0 && (
            <div className="pt-3 border-t border-[#182338] space-y-2">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <List className="w-3.5 h-3.5 text-indigo-400" />
                Saved Calibration Presets
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {presets.map((preset) => (
                  <div key={preset.id} className="flex justify-between items-center bg-[#080B12] border border-[#182338] px-3 py-2 rounded-lg hover:border-slate-700 transition-colors">
                    <button 
                      onClick={() => applyPreset(preset)}
                      className="flex-1 text-left min-w-0"
                    >
                      <span className="text-xs font-semibold text-slate-200 truncate block">{preset.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Pitch {preset.pitch.toFixed(1)} • Speed {preset.rate.toFixed(1)}x
                      </span>
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition-colors"
                      title="Delete Preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
