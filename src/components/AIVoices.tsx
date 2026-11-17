import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Square,
  Loader2,
  Sparkles,
  AlertCircle,
  Download,
  Clock,
  Gauge,
  Zap,
  Wand2,
  CheckCircle2,
  ArrowRight,
  Check,
} from 'lucide-react';
import { ClonedVoice } from './VoiceClone';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

type VoiceConfig = {
  id: string;
  apiName: string;
  name: string;
  description: string;
  defaultTone: string;
  isCloned?: boolean;
};

const VOICES: VoiceConfig[] = [
  { id: 'Jenny', apiName: 'Kore', name: 'Jenny', description: 'Clear and professional', defaultTone: 'clear and professional' },
  { id: 'Ishan', apiName: 'Fenrir', name: 'Ishan', description: 'Confident and slightly energetic', defaultTone: 'confident and slightly energetic' },
  { id: 'Puck', apiName: 'Puck', name: 'Puck', description: 'Warm and friendly', defaultTone: '' },
  { id: 'Charon', apiName: 'Charon', name: 'Charon', description: 'Deep and authoritative', defaultTone: '' },
  { id: 'Kore', apiName: 'Kore', name: 'Kore', description: 'Clear and professional', defaultTone: '' },
  { id: 'Fenrir', apiName: 'Fenrir', name: 'Fenrir', description: 'Energetic and bold', defaultTone: '' },
  { id: 'Zephyr', apiName: 'Zephyr', name: 'Zephyr', description: 'Calm and soothing', defaultTone: '' },
];

const DURATION_PRESETS = [
  { label: 'Auto (Natural)', value: 0 },
  { label: '8s (Shorts)', value: 8 },
  { label: '15s (Reels)', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s (1 Min)', value: 60, isOneMinute: true },
  { label: '90s', value: 90 },
  { label: 'Custom', value: -1 },
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
      pauseAfterMs = 750; // Dramatic pause
    } else if (clean.endsWith('?')) {
      isQuestion = true;
      pauseAfterMs = 750;
      clean = clean.slice(0, -1).trim();
    } else if (clean.endsWith('.')) {
      pauseAfterMs = 1000; // 1.0s long pause
      clean = clean.slice(0, -1).trim();
    } else if (clean.endsWith(',')) {
      pauseAfterMs = 500; // 0.5s short pause
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
  const allVoices: VoiceConfig[] = [
    ...clonedVoices.map((cv) => ({
      id: cv.id,
      apiName: 'Puck',
      name: cv.name,
      description: 'Custom Cloned Voice',
      defaultTone: 'naturally',
      isCloned: true,
    })),
    ...VOICES,
  ];

  const [text, setText] = useState(
    'Demat locker hai, par trade ke liye Trading Account chahiye. Yehi wo platform hai. Yaha aap buy-sell ke orders place karte ho. Simple, right? Aur ye teen pillars hain -- aapka Bank, Trading aur Demat account.'
  );
  const [selectedVoice, setSelectedVoice] = useState(allVoices[0]?.id || VOICES[0].id);
  const [tone, setTone] = useState(allVoices[0]?.defaultTone ?? VOICES[0].defaultTone);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineNotice, setEngineNotice] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  const [selectedPreset, setSelectedPreset] = useState<number>(60); // Default to 60s (1 Minute) time goal
  const [customSeconds, setCustomSeconds] = useState<number>(60);
  const [isFittingScript, setIsFittingScript] = useState(false);
  const [fitNotice, setFitNotice] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const speechQueueTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveDurationSeconds = selectedPreset === -1 ? customSeconds : selectedPreset;

  const wordCount = useMemo(() => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [text]);

  const idealWordCount = useMemo(() => {
    if (effectiveDurationSeconds <= 0) return null;
    return Math.round(effectiveDurationSeconds * 2.3);
  }, [effectiveDurationSeconds]);

  const targetWpm = useMemo(() => {
    if (effectiveDurationSeconds <= 0 || wordCount === 0) return null;
    return Math.round((wordCount / effectiveDurationSeconds) * 60);
  }, [wordCount, effectiveDurationSeconds]);

  const paceDescription = useMemo(() => {
    if (!targetWpm) return null;
    if (targetWpm < 110) return { label: 'Relaxed & Slow pace', color: 'text-amber-400', speed: 'Slow', speedMultiplier: '0.8x' };
    if (targetWpm <= 165) return { label: 'Natural & Moderate pace', color: 'text-emerald-400', speed: 'Natural', speedMultiplier: '1.0x' };
    if (targetWpm <= 215) return { label: 'Brisk & Fast pace', color: 'text-sky-400', speed: 'Fast', speedMultiplier: '1.3x' };
    return { label: 'Ultra-Fast pace (High Density)', color: 'text-rose-400', speed: 'Ultra-Fast', speedMultiplier: '1.6x' };
  }, [targetWpm]);

  // Detects if user typed a command like "make it in one minute", "make it in 1 minute", "duration: 60s"
  const detectedGoalMatch = useMemo(() => {
    const regex = /\b(?:make\s+it\s+in|duration|target\s+time|time\s+goal:?)\s*(\d+|one|two|three|half)?\s*(minute|min|m|second|sec|s)?\b/i;
    const match = text.match(regex);
    if (!match) return null;

    let detectedSec = 60;
    const rawVal = (match[1] || '').toLowerCase();
    const rawUnit = (match[2] || '').toLowerCase();

    if (rawVal === 'one' || rawVal === '1') {
      detectedSec = rawUnit.startsWith('s') ? 1 : 60;
    } else if (rawVal === 'two' || rawVal === '2') {
      detectedSec = rawUnit.startsWith('s') ? 2 : 120;
    } else if (rawVal === 'half') {
      detectedSec = 30;
    } else if (rawVal && !isNaN(parseInt(rawVal, 10))) {
      const num = parseInt(rawVal, 10);
      detectedSec = rawUnit.startsWith('m') ? num * 60 : num;
    } else if (match[0].toLowerCase().includes('minute') || match[0].toLowerCase().includes('min')) {
      detectedSec = 60;
    }

    return {
      rawPhrase: match[0],
      seconds: detectedSec,
      label: detectedSec === 60 ? '1 Minute (60s)' : `${detectedSec}s`,
    };
  }, [text]);

  const handleApplyDetectedGoal = () => {
    if (!detectedGoalMatch) return;
    if ([8, 15, 30, 60, 90].includes(detectedGoalMatch.seconds)) {
      setSelectedPreset(detectedGoalMatch.seconds);
    } else {
      setSelectedPreset(-1);
      setCustomSeconds(detectedGoalMatch.seconds);
    }
    const cleaned = text.replace(detectedGoalMatch.rawPhrase, '').replace(/^[:\s,-]+/, '').trim();
    if (cleaned) {
      setText(cleaned);
    }
    setFitNotice(`Time Goal updated to ${detectedGoalMatch.label}.`);
  };

  const handleFitScript = async () => {
    if (!text.trim() || effectiveDurationSeconds <= 0) return;
    if (!isOnline || !navigator.onLine) {
      setError('You are currently offline. AI script adaptation requires an internet connection.');
      return;
    }
    setIsFittingScript(true);
    setFitNotice(null);
    setError(null);

    try {
      const res = await fetch('/api/script/fit-duration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetSeconds: effectiveDurationSeconds,
          currentWords: wordCount,
        }),
      });

      const data = await res.json();
      if (data.fittedScript) {
        setText(data.fittedScript);
        setGeneratedAudio(null);
        setAudioDuration(null);
        setFitNotice(
          `AI adapted script to ${data.newWordCount} words for an exact ${effectiveDurationSeconds === 60 ? '1-minute' : `${effectiveDurationSeconds}s`} natural delivery!`
        );
      } else if (data.error) {
        setError(data.error);
      }
    } catch (_err: any) {
      setError('Failed to adapt script. Please try again.');
    } finally {
      setIsFittingScript(false);
    }
  };

  useEffect(() => {
    if (!allVoices.find((v) => v.id === selectedVoice)) {
      setSelectedVoice(allVoices[0]?.id || VOICES[0].id);
    }
  }, [clonedVoices, selectedVoice]);

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    const voice = allVoices.find((v) => v.id === voiceId);
    if (voice && voice.defaultTone !== undefined) {
      setTone(voice.defaultTone);
    }
  };

  const stopAudio = () => {
    if (speechQueueTimeoutRef.current) {
      clearTimeout(speechQueueTimeoutRef.current);
      speechQueueTimeoutRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (_) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const speakWithWebSpeech = (
    segments: ScriptSegment[],
    voiceConfig: VoiceConfig,
    targetDuration: number,
    calculatedTargetWpm: number | null
  ) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (speechQueueTimeoutRef.current) {
      clearTimeout(speechQueueTimeoutRef.current);
      speechQueueTimeoutRef.current = null;
    }

    let speechRate = 1.0;
    if (targetDuration > 0 && calculatedTargetWpm) {
      speechRate = Math.min(Math.max(calculatedTargetWpm / 150, 0.7), 2.2);
    }

    const voices = window.speechSynthesis.getVoices();
    const isFemale = /jenny|kore|zephyr/i.test(voiceConfig.name);
    const preferredVoice =
      voices.find((v) => /hi-IN|hin/i.test(v.lang)) ||
      voices.find((v) => /en-IN/i.test(v.lang)) ||
      voices.find((v) => isFemale && /female|zira|samantha|karen|google uk english female|natural/i.test(v.name)) ||
      voices.find((v) => !isFemale && /male|david|alex|george|google uk english male|natural/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    let index = 0;
    setIsPlaying(true);

    const speakNext = () => {
      if (index >= segments.length) {
        setIsPlaying(false);
        return;
      }

      const seg = segments[index];
      const utterance = new SpeechSynthesisUtterance(seg.text);
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = speechRate;
      utterance.pitch = seg.isQuestion ? 1.25 : isFemale ? 1.05 : 0.95;

      utterance.onend = () => {
        index++;
        if (index < segments.length) {
          speechQueueTimeoutRef.current = setTimeout(speakNext, seg.pauseAfterMs);
        } else {
          setIsPlaying(false);
        }
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  };

  const handleDownload = () => {
    if (!generatedAudio) return;

    try {
      const binaryString = atob(generatedAudio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const isWav =
        bytes.length >= 44 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46;

      let wavBlob: Blob;

      if (isWav) {
        wavBlob = new Blob([bytes], { type: 'audio/wav' });
      } else {
        const paddingBytes = 24000;
        const pcmData = new Uint8Array(len + paddingBytes);
        pcmData.set(bytes, 0);

        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);

        const writeString = (offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + pcmData.length, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, 24000, true);
        view.setUint32(28, 24000 * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, pcmData.length, true);

        wavBlob = new Blob([wavHeader, pcmData], { type: 'audio/wav' });
      }

      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = `ai-voice-${selectedVoice.toLowerCase()}-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Error downloading audio:', err);
      setError('Failed to download the audio.');
    }
  };

  const playPCM = async (base64Data: string, _mimeType?: string) => {
    stopAudio();

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const isWav =
        bytes.length >= 44 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46;

      let audioBuffer: AudioBuffer;

      if (isWav) {
        try {
          audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
        } catch (wavErr) {
          console.warn('Native WAV decode fallback:', wavErr);
          const pcmSlice = bytes.buffer.slice(44);
          const buffer = new Int16Array(pcmSlice);
          const float32Data = new Float32Array(buffer.length);
          for (let i = 0; i < buffer.length; i++) {
            float32Data[i] = buffer[i] / 32768.0;
          }
          audioBuffer = audioCtx.createBuffer(1, float32Data.length, 24000);
          audioBuffer.getChannelData(0).set(float32Data);
        }
      } else {
        const buffer = new Int16Array(bytes.buffer);
        const float32Data = new Float32Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
          float32Data[i] = buffer[i] / 32768.0;
        }
        audioBuffer = audioCtx.createBuffer(1, float32Data.length, 24000);
        audioBuffer.getChannelData(0).set(float32Data);
      }

      setAudioDuration(audioBuffer.duration);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      source.onended = () => {
        setIsPlaying(false);
      };

      sourceNodeRef.current = source;
      source.start();
      setIsPlaying(true);
    } catch (err) {
      console.error('Error playing audio:', err);
      setError('Failed to play the generated audio.');
      setIsPlaying(false);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;

    if (!isOnline || !navigator.onLine) {
      stopAudio();
      setEngineNotice(null);
      setError(
        'You are currently offline. Internet-dependent AI voice generation is unavailable until your connection is restored.'
      );
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAudioDuration(null);
    setGeneratedAudio(null);
    stopAudio();

    const voiceConfig = allVoices.find((v) => v.id === selectedVoice) || VOICES[0];
    const apiVoiceName = voiceConfig.apiName || 'Puck';

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice,
          apiVoiceName,
          tone: tone.trim() || 'natural',
          targetSeconds: effectiveDurationSeconds,
          wordCount,
          targetWpm,
          paceSpeed: paceDescription?.speed || 'Natural',
          isCloned: !!voiceConfig?.isCloned,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (data.audioBase64) {
        setEngineNotice(null);
        setGeneratedAudio(data.audioBase64);
        await playPCM(data.audioBase64, data.mimeType);
      } else if (data.fallbackWebSpeech || !response.ok) {
        setEngineNotice(
          data.warning || 'Using browser speech engine preview. Your API key can be found in the Settings > Secrets panel.'
        );
        const segments = parseScriptSegments(text);
        const estSec = effectiveDurationSeconds > 0 ? effectiveDurationSeconds : Math.max(2, Math.round(wordCount / 2.5));
        setAudioDuration(estSec);
        const wavBase64 = createSyntheticWav(estSec);
        setGeneratedAudio(wavBase64);
        speakWithWebSpeech(segments, voiceConfig, effectiveDurationSeconds, targetWpm);
      } else {
        throw new Error('No audio data received from the server.');
      }
    } catch (err: any) {
      console.warn('TTS generation network fallback:', err);
      setEngineNotice('Using browser speech engine preview. Your API key can be found in the Settings > Secrets panel.');
      const segments = parseScriptSegments(text);
      const estSec = effectiveDurationSeconds > 0 ? effectiveDurationSeconds : Math.max(2, Math.round(wordCount / 2.5));
      setAudioDuration(estSec);
      const wavBase64 = createSyntheticWav(estSec);
      setGeneratedAudio(wavBase64);
      speakWithWebSpeech(segments, voiceConfig, effectiveDurationSeconds, targetWpm);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Workspace: Script Editor & Time Calibration Console */}
      <div className="lg:col-span-7 space-y-6">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="tts-script-input" className="text-sm font-medium text-zinc-200">
              Text to Speech Script
            </label>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono tabular-nums">
              <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
              {effectiveDurationSeconds > 0 && idealWordCount && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Target ~{idealWordCount}w</span>
                </>
              )}
            </div>
          </div>

          <textarea
            id="tts-script-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setGeneratedAudio(null);
              setAudioDuration(null);
              setError(null);
            }}
            className="w-full h-48 bg-[#0B0D10] border border-zinc-800 rounded-xl p-4 text-[15px] leading-relaxed text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 resize-none transition-colors"
            placeholder="Enter your Hinglish or English script here..."
          />
        </div>

        {/* Detected Natural Language Time Goal Banner */}
        {detectedGoalMatch && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Detected Time Goal in text: <strong className="text-white">"{detectedGoalMatch.rawPhrase}"</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleApplyDetectedGoal}
              className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>Set to {detectedGoalMatch.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* AI Fit Script Success Notice */}
        {fitNotice && (
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{fitNotice}</span>
          </div>
        )}

        {/* Time Goal Calibration Section (Separated cleanly with hairline border) */}
        <div className="pt-5 border-t border-zinc-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Time Goal (Target Duration)</span>
              {effectiveDurationSeconds === 60 && (
                <>
                  <span className="text-zinc-600" aria-hidden="true">·</span>
                  <span className="text-xs font-medium text-emerald-400">1-Minute Target Active</span>
                </>
              )}
            </div>

            {effectiveDurationSeconds > 0 && paceDescription && (
              <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                <Gauge className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className={`font-semibold ${paceDescription.color}`}>
                  {paceDescription.speedMultiplier} (~{targetWpm} WPM)
                </span>
                <span className="text-zinc-600" aria-hidden="true">·</span>
                <span className={paceDescription.color}>{paceDescription.speed}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Set a target duration. The AI calibrates speaking speed, cadence, and punctuation breathing cues to fit your script into the selected time goal.
          </p>

          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((preset) => {
              const isSelected = selectedPreset === preset.value;
              const isOneMin = (preset as any).isOneMinute;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setSelectedPreset(preset.value)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                    isSelected
                      ? isOneMin
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-semibold'
                        : 'bg-amber-500 text-zinc-950 border-amber-400 font-semibold'
                      : isOneMin
                        ? 'bg-[#181C24] text-emerald-300 border-emerald-500/30 hover:border-emerald-400/60'
                        : 'bg-[#181C24] text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {selectedPreset === -1 && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="2"
                  max="600"
                  value={customSeconds}
                  onChange={(e) => setCustomSeconds(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 bg-[#0B0D10] border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
                <span className="text-xs text-zinc-400">seconds</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '45s', sec: 45 },
                  { label: '1 min', sec: 60 },
                  { label: '1.5 min', sec: 90 },
                  { label: '2 min', sec: 120 },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setCustomSeconds(opt.sec)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#181C24] hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono tabular-nums whitespace-nowrap shrink-0"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {effectiveDurationSeconds > 0 && (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="text-zinc-400 font-mono tabular-nums">
                Ideal for {effectiveDurationSeconds === 60 ? '1 Min' : `${effectiveDurationSeconds}s`}:{' '}
                <strong className="text-zinc-200">~{idealWordCount} words</strong>
                <span className="text-zinc-600"> · </span>
                <span>Current: </span>
                <strong className={wordCount > (idealWordCount || 0) * 1.3 ? 'text-amber-400' : 'text-zinc-200'}>
                  {wordCount} words
                </strong>
              </div>

              <button
                type="button"
                onClick={handleFitScript}
                disabled={isFittingScript || !text.trim()}
                className="inline-flex items-center justify-center gap-2 min-h-[38px] px-3.5 py-1.5 bg-[#181C24] hover:bg-zinc-800 text-amber-300 border border-amber-500/30 rounded-lg font-medium transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                title="AI will adjust and rewrite script to hit the exact duration naturally"
              >
                {isFittingScript ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Adapting Script to {effectiveDurationSeconds}s...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>AI Fit Script to {effectiveDurationSeconds === 60 ? '1 Min' : `${effectiveDurationSeconds}s`}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2.5 text-red-300 bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {engineNotice && (
          <div className="flex items-center gap-2.5 text-amber-200 bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-xs">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{engineNotice}</span>
          </div>
        )}

        {audioDuration !== null && (
          <div className="flex items-center justify-between px-4 py-3 bg-[#0B0D10] border border-zinc-800 rounded-xl text-xs font-mono tabular-nums">
            <div className="flex items-center gap-2 text-zinc-300">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Generated Duration:</span>
              <span className="font-semibold text-emerald-400">{audioDuration.toFixed(1)}s</span>
            </div>
            {effectiveDurationSeconds > 0 && (
              <span className="text-zinc-400">
                Target: <span className="text-amber-300 font-semibold">{effectiveDurationSeconds}s</span>
              </span>
            )}
          </div>
        )}

        {/* Primary Transport Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <button
            type="button"
            onClick={isPlaying ? stopAudio : handleGenerate}
            disabled={isGenerating || !text.trim()}
            className={`flex-1 flex items-center justify-center gap-2 min-h-[46px] py-3 px-6 rounded-xl font-semibold text-sm transition-colors whitespace-nowrap shrink-0 ${
              isPlaying
                ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/40'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating {effectiveDurationSeconds > 0 ? `(${effectiveDurationSeconds === 60 ? '1-Min' : `${effectiveDurationSeconds}s`} goal)...` : '...'}</span>
              </>
            ) : isPlaying ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Playback</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Generate &amp; Play {effectiveDurationSeconds > 0 ? `(${effectiveDurationSeconds === 60 ? '1 Min' : `${effectiveDurationSeconds}s`} Goal)` : ''}</span>
              </>
            )}
          </button>

          {generatedAudio && (
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 min-h-[46px] py-3 px-5 rounded-xl font-medium text-sm bg-[#181C24] text-zinc-200 hover:bg-zinc-800 border border-zinc-700 transition-colors whitespace-nowrap shrink-0"
              title="Download as WAV"
            >
              <Download className="w-4 h-4" />
              <span>Download WAV</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Console: Voice Rack & Delivery Style */}
      <div className="lg:col-span-5 lg:border-l lg:border-zinc-800/80 lg:pl-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-200">Select Voice</label>
            <span className="text-xs text-zinc-500 font-mono tabular-nums">{allVoices.length} available</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
            {allVoices.map((voice) => {
              const isSelected = selectedVoice === voice.id;
              return (
                <button
                  key={voice.id}
                  type="button"
                  onClick={() => handleVoiceChange(voice.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 text-white'
                      : 'bg-[#0B0D10] border-zinc-800/90 text-zinc-300 hover:border-zinc-700 hover:bg-[#181C24]'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{voice.name}</span>
                      {voice.isCloned && (
                        <>
                          <span className="text-zinc-600" aria-hidden="true">·</span>
                          <span className="text-[11px] font-medium text-amber-400">Custom Clone</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{voice.description}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-5 border-t border-zinc-800/80 space-y-2.5">
          <label htmlFor="delivery-style-input" className="block text-sm font-medium text-zinc-200">
            Delivery Style (Optional)
          </label>
          <input
            id="delivery-style-input"
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="e.g., cheerfully, whispering, energetic..."
            className="w-full bg-[#0B0D10] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
          />
          <p className="text-xs text-zinc-500">
            Instructs the AI how to deliver the text without altering your spoken words.
          </p>
        </div>
      </div>
    </div>
  );
}
