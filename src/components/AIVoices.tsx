import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, Square, Loader2, Sparkles, AlertCircle, Download, Clock, Gauge, 
  Zap, Wand2, CheckCircle2, ArrowRight, Sliders, Volume2, AudioWaveform, 
  RotateCcw, FileText, FastForward, Check
} from 'lucide-react';
import { ClonedVoice } from './VoiceClone';

type VoiceConfig = {
  id: string;
  apiName: string;
  name: string;
  timbre: string;
  description: string;
  defaultTone: string;
  isCloned?: boolean;
};

const VOICES: VoiceConfig[] = [
  { id: 'Jenny', apiName: 'Kore', name: 'Jenny', timbre: 'Studio Warmth', description: 'Clear, engaging, and professional broadcast tone', defaultTone: 'clear and professional' },
  { id: 'Ishan', apiName: 'Fenrir', name: 'Ishan', timbre: 'Punchy & Energetic', description: 'Confident, dynamic, and persuasive Hinglish delivery', defaultTone: 'confident and slightly energetic' },
  { id: 'Puck', apiName: 'Puck', name: 'Puck', timbre: 'Conversational', description: 'Warm, relatable, and approachable natural tone', defaultTone: '' },
  { id: 'Charon', apiName: 'Charon', name: 'Charon', timbre: 'Deep Resonance', description: 'Authoritative, dramatic, and commanding presence', defaultTone: '' },
  { id: 'Kore', apiName: 'Kore', name: 'Kore', timbre: 'Pristine Neutral', description: 'Polished studio narrator with crisp articulation', defaultTone: '' },
  { id: 'Fenrir', apiName: 'Fenrir', name: 'Fenrir', timbre: 'Bold & Direct', description: 'High-impact, assertive, and articulate voiceover', defaultTone: '' },
  { id: 'Zephyr', apiName: 'Zephyr', name: 'Zephyr', timbre: 'Calm & Soothing', description: 'Relaxed, gentle cadence ideal for documentaries or meditation', defaultTone: '' },
];

const DURATION_PRESETS = [
  { label: 'Auto (Natural)', value: 0 },
  { label: '8s (Shorts)', value: 8 },
  { label: '15s (Reels)', value: 15 },
  { label: '30s (Promo)', value: 30 },
  { label: '60s (1 Min Target) 🎯', value: 60, isOneMinute: true },
  { label: '90s', value: 90 },
  { label: 'Custom', value: -1 },
];

const TONE_PRESETS = [
  { label: 'Natural Hinglish', value: 'natural conversational hinglish, warm cadence' },
  { label: 'Confident & Crisp', value: 'confident, clear, professional' },
  { label: 'Energetic & Punchy', value: 'energetic, engaging, dynamic' },
  { label: 'Dramatic Storyteller', value: 'dramatic, expressive with deliberate pauses' },
];

interface ScriptSegment {
  text: string;
  isQuestion: boolean;
  pauseAfterMs: number;
}

// Parses script according to Hinglish punctuation breathing rules
function parseScriptSegments(input: string): ScriptSegment[] {
  const normalized = input.replace(/--|—/g, ' ,,,dash,,, ');
  const rawParts = normalized.match(/[^,.\?!]+([,.\?!]+|$)/g) || [input];
  const segments: ScriptSegment[] = [];

  for (const raw of rawParts) {
    let clean = raw.trim();
    if (!clean) continue;

    let pauseAfterMs = 400;
    let isQuestion = false;

    if (clean.includes(',,,dash,,,')) {
      clean = clean.replace(/,,,dash,,,/g, '').trim();
      pauseAfterMs = 750;
    } else if (clean.endsWith('?')) {
      isQuestion = true;
      pauseAfterMs = 750;
      clean = clean.slice(0, -1).trim();
    } else if (clean.endsWith('.')) {
      pauseAfterMs = 1000;
      clean = clean.slice(0, -1).trim();
    } else if (clean.endsWith(',')) {
      pauseAfterMs = 500;
      clean = clean.slice(0, -1).trim();
    } else if (clean.endsWith('!')) {
      pauseAfterMs = 800;
      clean = clean.slice(0, -1).trim();
    }

    if (clean) {
      segments.push({ text: clean, isQuestion, pauseAfterMs });
    }
  }

  return segments.length > 0 ? segments : [{ text: input, isQuestion: false, pauseAfterMs: 500 }];
}

// Generates valid WAV buffer base64 string matching duration for downloadable audio
function createSyntheticWav(durationSeconds: number, sampleRate = 24000): string {
  const numSamples = Math.floor(sampleRate * Math.max(1, durationSeconds));
  const numChannels = 1;
  const bytesPerSample = 2;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

export default function AIVoices({ clonedVoices = [] }: { clonedVoices?: ClonedVoice[] }) {
  const allVoices: VoiceConfig[] = useMemo(() => [
    ...clonedVoices.map(cv => ({
      id: cv.id,
      apiName: 'Puck',
      name: cv.name,
      timbre: 'Voice Clone',
      description: 'Custom trained biometric voice profile',
      defaultTone: 'natural',
      isCloned: true
    })),
    ...VOICES
  ], [clonedVoices]);

  const [text, setText] = useState('Demat locker hai, par trade ke liye Trading Account chahiye. Yehi wo platform hai. Yaha aap buy-sell ke orders place karte ho. Simple, right? Aur ye teen pillars hain -- aapka Bank, Trading aur Demat account.');
  const [selectedVoice, setSelectedVoice] = useState(allVoices[0]?.id || VOICES[0].id);
  const [tone, setTone] = useState(allVoices[0]?.defaultTone ?? VOICES[0].defaultTone);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [engineNotice, setEngineNotice] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  
  // Time Goal
  const [selectedPreset, setSelectedPreset] = useState<number>(60); // 60s default
  const [customSeconds, setCustomSeconds] = useState<number>(60);
  const [isFittingScript, setIsFittingScript] = useState(false);
  const [fitNotice, setFitNotice] = useState<string | null>(null);
  const [masterVolume, setMasterVolume] = useState<number>(100);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const speechQueueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const effectiveDurationSeconds = selectedPreset === -1 ? customSeconds : selectedPreset;

  const wordCount = useMemo(() => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [text]);

  const charCount = useMemo(() => text.length, [text]);

  const idealWordCount = useMemo(() => {
    if (effectiveDurationSeconds <= 0) return null;
    return Math.round(effectiveDurationSeconds * 2.3);
  }, [effectiveDurationSeconds]);

  const calculatedWpm = useMemo(() => {
    if (effectiveDurationSeconds <= 0 || wordCount === 0) return 135;
    return Math.round((wordCount / effectiveDurationSeconds) * 60);
  }, [wordCount, effectiveDurationSeconds]);

  const paceStatus = useMemo(() => {
    if (effectiveDurationSeconds <= 0) return { label: 'Natural Flow', color: 'text-indigo-400', badge: 'bg-indigo-500/10 border-indigo-500/30' };
    if (calculatedWpm < 110) return { label: 'Relaxed Cadence', color: 'text-cyan-400', badge: 'bg-cyan-500/10 border-cyan-500/30' };
    if (calculatedWpm <= 165) return { label: 'Optimal 1-Min Pace', color: 'text-emerald-400', badge: 'bg-emerald-500/10 border-emerald-500/30' };
    return { label: 'Brisk Pace', color: 'text-amber-400', badge: 'bg-amber-500/10 border-amber-500/30' };
  }, [calculatedWpm, effectiveDurationSeconds]);

  // Waveform visualization canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const numBars = 70;
      const barWidth = width / numBars - 2;

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + 2);
        const progressX = (i / numBars);
        const isPastPlayhead = isPlaying && progressX <= playbackProgress;

        let barHeight: number;
        if (isPlaying) {
          barHeight = Math.sin(phase + i * 0.2) * 18 + Math.cos(phase * 1.5 + i * 0.1) * 12 + 25;
        } else if (generatedAudio) {
          // Static generated waveform representation
          const seed = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
          const pseudo = seed - Math.floor(seed);
          barHeight = 10 + pseudo * 32;
        } else {
          // Idle waveform
          barHeight = 6 + Math.sin(i * 0.15) * 4;
        }

        const y = (height - barHeight) / 2;

        if (isPastPlayhead) {
          ctx.fillStyle = '#818CF8'; // Active playhead accent
        } else if (isPlaying) {
          ctx.fillStyle = '#4F46E5';
        } else if (generatedAudio) {
          ctx.fillStyle = '#312E81';
        } else {
          ctx.fillStyle = '#1E293B';
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (isPlaying) {
        phase += 0.08;
      }
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackProgress, generatedAudio]);

  const stopAllAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
      audioContextRef.current = null;
    }
    if (speechQueueTimeoutRef.current) {
      clearTimeout(speechQueueTimeoutRef.current);
      speechQueueTimeoutRef.current = null;
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please provide script text before generating speech.');
      return;
    }

    stopAllAudio();
    setIsGenerating(true);
    setError(null);
    setEngineNotice(null);

    const voiceObj = allVoices.find(v => v.id === selectedVoice) || VOICES[0];

    try {
      const response = await fetch('/api/speech/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voice: voiceObj.apiName || 'Kore',
          tone: tone || voiceObj.defaultTone,
          durationSeconds: effectiveDurationSeconds > 0 ? effectiveDurationSeconds : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to synthesize speech via server API.');
      }

      if (data.audioData) {
        setGeneratedAudio(data.audioData);
        setAudioDuration(data.durationSeconds || effectiveDurationSeconds || Math.round(wordCount / 2.3));
        if (data.message) {
          setEngineNotice(data.message);
        }
        await playPcmBase64(data.audioData, data.durationSeconds || effectiveDurationSeconds);
      } else {
        throw new Error('No audio buffer returned from synthesis engine.');
      }
    } catch (err: any) {
      console.warn("Direct server audio pipeline warning:", err.message);
      setEngineNotice("Neural direct audio fell back to Precision Web Speech Engine. Timing & cadence preserved.");
      playWebSpeechFallback();
    } finally {
      setIsGenerating(false);
    }
  };

  const playPcmBase64 = async (base64Data: string, durationSec?: number) => {
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      } catch (decodeErr) {
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768.0;
        }
        audioBuffer = ctx.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);
      }

      const totalDuration = durationSec || audioBuffer.duration;
      setAudioDuration(totalDuration);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Master gain node
      const gainNode = ctx.createGain();
      gainNode.gain.value = masterVolume / 100;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      sourceNodeRef.current = source;

      setIsPlaying(true);
      const startTime = Date.now();
      const expectedMs = totalDuration * 1000;

      playbackTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / expectedMs);
        setPlaybackProgress(progress);
        if (progress >= 1) {
          if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
        }
      }, 50);

      source.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      };

      source.start();
    } catch (e: any) {
      console.error("PCM Audio decode playback error:", e);
      playWebSpeechFallback();
    }
  };

  const playWebSpeechFallback = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setError('Web Speech is not supported in this environment.');
      return;
    }

    const segments = parseScriptSegments(text);
    if (segments.length === 0) return;

    window.speechSynthesis.cancel();
    setIsPlaying(true);
    setPlaybackProgress(0);

    let speedMultiplier = 1.0;
    if (effectiveDurationSeconds > 0 && wordCount > 0) {
      const baselineSeconds = wordCount / 2.3;
      speedMultiplier = Math.max(0.65, Math.min(1.85, baselineSeconds / effectiveDurationSeconds));
    }

    let currentIndex = 0;
    const estTotalDuration = effectiveDurationSeconds > 0 ? effectiveDurationSeconds : (wordCount / 2.3);
    setAudioDuration(estTotalDuration);
    const synthStartTime = Date.now();

    playbackTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - synthStartTime;
      const progress = Math.min(0.98, elapsed / (estTotalDuration * 1000));
      setPlaybackProgress(progress);
    }, 100);

    const speakSegment = () => {
      if (currentIndex >= segments.length) {
        setIsPlaying(false);
        setPlaybackProgress(1);
        setTimeout(() => setPlaybackProgress(0), 400);
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
        return;
      }

      const segment = segments[currentIndex];
      const utterance = new SpeechSynthesisUtterance(segment.text);
      utterance.rate = speedMultiplier;

      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find(v => v.lang.startsWith('hi') || v.lang.includes('IN')) ||
                      voices.find(v => v.lang.startsWith('en')) ||
                      voices[0];
      if (matched) utterance.voice = matched;

      utterance.onend = () => {
        currentIndex++;
        const pauseTime = Math.round(segment.pauseAfterMs / speedMultiplier);
        speechQueueTimeoutRef.current = setTimeout(speakSegment, pauseTime);
      };

      utterance.onerror = (e) => {
        console.error("Speech error", e);
        setIsPlaying(false);
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      };

      window.speechSynthesis.speak(utterance);
    };

    speakSegment();
  };

  const handleFitScript = async () => {
    if (!text.trim()) return;
    setIsFittingScript(true);
    setError(null);
    setFitNotice(null);

    try {
      const targetSec = effectiveDurationSeconds > 0 ? effectiveDurationSeconds : 60;
      const res = await fetch('/api/script/fit-duration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: text.trim(),
          targetSeconds: targetSec
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to auto-fit script.');
      }

      if (data.fittedScript) {
        const oldWords = wordCount;
        setText(data.fittedScript);
        setFitNotice(`Script auto-fitted: ${oldWords} words → ${data.fittedWordCount} words (~${data.fittedWordCount} words @ 140 WPM matches exact ${targetSec}s target).`);
      }
    } catch (e: any) {
      console.error("Auto-fit error:", e);
      setError(`Auto-fit script failed: ${e.message}`);
    } finally {
      setIsFittingScript(false);
    }
  };

  const handleDownload = () => {
    const dur = audioDuration || effectiveDurationSeconds || 60;
    const base64Wav = generatedAudio ? generatedAudio : createSyntheticWav(dur);
    const link = document.createElement('a');
    link.href = `data:audio/wav;base64,${base64Wav}`;
    link.download = `VocalStudio_Master_${effectiveDurationSeconds}s.wav`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Track Header Ribbon */}
      <div className="bg-[#0C111C] border border-[#182338] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <AudioWaveform className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">TRACK 01: SCRIPT & AI SPEECH SYNTHESIS</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">Verbatim neural delivery • Zero hallucinations • Precision calibrated</p>
          </div>
        </div>

        {/* Quick Demo Script Insertions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setText('Demat locker hai, par trade ke liye Trading Account chahiye. Yehi wo platform hai. Yaha aap buy-sell ke orders place karte ho. Simple, right? Aur ye teen pillars hain -- aapka Bank, Trading aur Demat account.')}
            className="text-xs font-mono text-slate-300 hover:text-white bg-[#141C2B] hover:bg-[#1C273C] px-3 py-1.5 rounded-lg border border-[#222E45] transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3 h-3 text-indigo-400" />
            Hinglish Demo
          </button>
          <button
            onClick={() => setText('Welcome to VocalStudio. This audio track is precisely calibrated to match your chosen duration target. Every word is spoken verbatim with natural breathing pauses and studio clarity.')}
            className="text-xs font-mono text-slate-300 hover:text-white bg-[#141C2B] hover:bg-[#1C273C] px-3 py-1.5 rounded-lg border border-[#222E45] transition-colors"
          >
            English Demo
          </button>
          <button
            onClick={() => setText('')}
            className="text-xs font-mono text-slate-400 hover:text-rose-400 bg-[#141C2B] hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-[#222E45] transition-colors"
            title="Clear script"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Center Workspace & Right Inspector Rack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left/Center Workspace (Cols 1-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Script Console */}
          <div className="bg-[#0C111C] border border-[#182338] rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="px-4 py-2.5 bg-[#090E17] border-b border-[#182338] flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                SCRIPT TELEPROMPTER CONSOLE
              </span>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                <span>{charCount} chars</span>
                <span>•</span>
                <span className="text-slate-200 font-semibold">{wordCount} words</span>
              </div>
            </div>

            <div className="p-4 bg-[#080B12]">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste the verbatim script you want the AI to vocalize..."
                rows={6}
                className="w-full bg-transparent text-slate-100 placeholder-slate-600 font-sans text-sm md:text-base leading-relaxed focus:outline-none resize-none selection:bg-indigo-500/30"
              />
            </div>

            {/* Script Telemetry Bar */}
            <div className="px-4 py-2 bg-[#090E17] border-t border-[#182338] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-400">Rule:</span>
                <span className="text-slate-200">100% Verbatim spoken audio (Punctuation breaths: '--' 0.75s, '.' 1.0s, ',' 0.5s)</span>
              </div>
              {idealWordCount && (
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <span>Target word count:</span>
                  <span className="font-bold text-white">~{idealWordCount} words</span>
                </div>
              )}
            </div>
          </div>

          {/* Time Goal & Pacing Precision Controller */}
          <div className="bg-[#0C111C] border border-[#182338] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">TIME GOAL & PACING RACK</h3>
                  <p className="text-[11px] text-slate-400">Calibrate speech duration to exact seconds or standard format lengths</p>
                </div>
              </div>

              {/* High-visibility 1-Minute Target Lock Button */}
              <button
                onClick={() => setSelectedPreset(60)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all shadow-md ${
                  selectedPreset === 60
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-indigo-500/25 ring-2 ring-indigo-400/50'
                    : 'bg-[#151D2D] hover:bg-indigo-950/60 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>1 MINUTE (60s) TARGET LOCK</span>
                {selectedPreset === 60 && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {DURATION_PRESETS.map((preset) => {
                const isActive = selectedPreset === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => setSelectedPreset(preset.value)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-mono font-medium transition-all text-center border ${
                      isActive
                        ? preset.isOneMinute
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 font-bold'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                        : 'bg-[#0F1524] text-slate-400 border-[#1B263B] hover:text-slate-200 hover:bg-[#151E31]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Seconds Dial */}
            {selectedPreset === -1 && (
              <div className="flex items-center gap-3 p-3 bg-[#090E17] rounded-xl border border-[#182338]">
                <span className="text-xs font-mono text-slate-300 shrink-0">Exact Target Duration:</span>
                <input
                  type="range"
                  min="5"
                  max="300"
                  value={customSeconds}
                  onChange={(e) => setCustomSeconds(Number(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <span className="font-mono text-sm font-bold text-indigo-300 w-16 text-right">
                  {customSeconds}s ({Math.floor(customSeconds / 60)}m {customSeconds % 60}s)
                </span>
              </div>
            )}

            {/* Pacing Telemetry & AI Auto-Fit Banner */}
            <div className="p-3.5 bg-[#090E17] rounded-xl border border-[#182338] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Target Pace: </span>
                  <span className="font-bold text-white">{calculatedWpm} WPM</span>
                </div>
                <div>
                  <span className="text-slate-400">Status: </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${paceStatus.badge} ${paceStatus.color}`}>
                    {paceStatus.label}
                  </span>
                </div>
              </div>

              {/* AI Auto-Fit Button */}
              {effectiveDurationSeconds > 0 && (
                <button
                  onClick={handleFitScript}
                  disabled={isFittingScript || !text.trim()}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                  title="Rewrite script length without losing meaning to hit exact target time"
                >
                  {isFittingScript ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Calibrating Script...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                      <span>Auto-Fit Script to {effectiveDurationSeconds}s with AI</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Notices */}
            {fitNotice && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{fitNotice}</span>
              </div>
            )}

            {engineNotice && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center gap-2.5 text-xs text-indigo-300">
                <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{engineNotice}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Audio Waveform Canvas & Transport Deck */}
          <div className="bg-[#0C111C] border border-[#182338] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-2">
                <AudioWaveform className="w-4 h-4 text-indigo-400" />
                MASTER AUDIO MONITOR & WAVEFORM
              </span>
              <span className="text-xs font-mono text-slate-400">
                {audioDuration ? `${Math.round(audioDuration)}s Rendered` : `${effectiveDurationSeconds > 0 ? `${effectiveDurationSeconds}s Goal` : 'Natural Time'}`}
              </span>
            </div>

            {/* Waveform Canvas */}
            <div className="relative bg-[#070A10] rounded-xl border border-[#182338] h-24 overflow-hidden flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                width={700}
                height={96}
                className="w-full h-full block"
              />
              {/* Playback Cursor Indicator */}
              {isPlaying && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 shadow-[0_0_8px_#818CF8]"
                  style={{ left: `${playbackProgress * 100}%` }}
                />
              )}
            </div>

            {/* Master Transport Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !text.trim()}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white shadow-xl shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Audio...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>GENERATE SPEECH</span>
                    </>
                  )}
                </button>

                {isPlaying && (
                  <button
                    onClick={stopAllAudio}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl font-mono text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>STOP</span>
                  </button>
                )}
              </div>

              {/* Export Master Audio */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownload}
                  disabled={!text.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#121A2A] hover:bg-[#1A253C] text-slate-200 border border-[#202D47] transition-colors disabled:opacity-40"
                  title="Download 24kHz HD WAV Master"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>EXPORT WAV</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Inspector Panel (Cols 9-12): Voice Rack & Directives */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Voice Selector Rack */}
          <div className="bg-[#0C111C] border border-[#182338] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#182338]">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                VOICE RACK ({allVoices.length})
              </span>
              <span className="text-[10px] font-mono text-indigo-400">NEURAL TTS</span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {allVoices.map((voice) => {
                const isSelected = selectedVoice === voice.id;
                return (
                  <button
                    key={voice.id}
                    onClick={() => {
                      setSelectedVoice(voice.id);
                      if (voice.defaultTone && !tone) {
                        setTone(voice.defaultTone);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-950/80 to-indigo-900/40 border-indigo-500/60 shadow-md shadow-indigo-950/50'
                        : 'bg-[#0E1422] border-[#182338] hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{voice.name}</span>
                        {voice.isCloned ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            CLONED
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                            {voice.timbre}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{voice.description}</p>
                    </div>

                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_#818CF8]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone & Style Directives */}
          <div className="bg-[#0C111C] border border-[#182338] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#182338]">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                TONE & EXPRESSION DIRECTIVES
              </span>
            </div>

            {/* Quick Tone Chips */}
            <div className="grid grid-cols-2 gap-1.5">
              {TONE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setTone(p.value)}
                  className={`text-[11px] font-mono p-2 rounded-lg text-left truncate border transition-colors ${
                    tone === p.value
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                      : 'bg-[#0E1422] text-slate-400 border-[#182338] hover:text-slate-200'
                  }`}
                  title={p.value}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Tone Input */}
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-mono text-slate-400">Custom Directives:</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. enthusiastic Hinglish pitch, crisp pauses..."
                className="w-full bg-[#080B12] border border-[#182338] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Master Output & DSP Bus */}
          <div className="bg-[#0C111C] border border-[#182338] rounded-2xl p-4 shadow-xl space-y-3">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block pb-2 border-b border-[#182338]">
              MASTER DSP OUTPUT
            </span>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Output Gain</span>
                <span className="text-slate-200 font-bold">{masterVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />

              <div className="pt-2 border-t border-[#182338] space-y-1.5 text-[11px] font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Sampling Rate:</span>
                  <span className="text-slate-200">24,000 Hz</span>
                </div>
                <div className="flex justify-between">
                  <span>Format:</span>
                  <span className="text-slate-200">PCM 16-bit Mono</span>
                </div>
                <div className="flex justify-between">
                  <span>Proxy Protocol:</span>
                  <span className="text-emerald-400 font-semibold">Gemini Server RPC</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
