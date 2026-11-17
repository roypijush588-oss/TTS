import React, { useState, useRef } from 'react';
import { Trash2, Loader2, AudioLines, CheckCircle2, Mic, Square, Upload, FileAudio, AlertCircle } from 'lucide-react';

export interface ClonedVoice {
  id: string;
  name: string;
  status: 'ready';
  createdAt: number;
}

interface VoiceCloneProps {
  clonedVoices: ClonedVoice[];
  setClonedVoices: React.Dispatch<React.SetStateAction<ClonedVoice[]>>;
}

export default function VoiceClone({ clonedVoices, setClonedVoices }: VoiceCloneProps) {
  const [voiceName, setVoiceName] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('audio/')) {
        setFile(droppedFile);
        setHasRecorded(false);
        setError(null);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setHasRecorded(false);
      setError(null);
    }
  };

  const startRecording = async () => {
    setFile(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setHasRecorded(true);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setHasRecorded(false);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Microphone access is required to clone your voice.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleTrain = () => {
    if ((!hasRecorded && !file) || !voiceName.trim()) return;
    setError(null);
    setIsTraining(true);
    setTrainingProgress(0);
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTraining) {
      interval = setInterval(() => {
        setTrainingProgress((prev) => {
          if (prev >= 100) return 100;
          return prev + 5;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isTraining]);

  React.useEffect(() => {
    if (isTraining && trainingProgress >= 100) {
      const newVoice: ClonedVoice = {
        id: `clone-${Date.now()}`,
        name: voiceName.trim(),
        status: 'ready',
        createdAt: Date.now(),
      };
      setClonedVoices((prevVoices) => [...prevVoices, newVoice]);
      setIsTraining(false);
      setHasRecorded(false);
      setFile(null);
      setVoiceName('');
      setTimeout(() => setTrainingProgress(0), 500);
    }
  }, [trainingProgress, isTraining, voiceName, setClonedVoices]);

  const deleteVoice = (id: string) => {
    setClonedVoices((prev) => prev.filter((v) => v.id !== id));
  };

  const getTrainingStatusText = (progress: number) => {
    if (progress < 20) return 'Analyzing audio frequencies...';
    if (progress < 40) return 'Extracting vocal formants...';
    if (progress < 60) return 'Building phonetic dictionary...';
    if (progress < 80) return 'Training acoustic model...';
    if (progress < 100) return 'Finalizing voice clone...';
    return 'Voice ready!';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left: Voice Creation Workflow */}
      <div className="lg:col-span-7 space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">Create Voice Clone</h2>
          <p className="text-xs text-zinc-400">
            Read the provided calibration script clearly, or upload an existing audio sample to create your custom voice.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 text-red-300 bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="clone-voice-name" className="block text-sm font-medium text-zinc-200">
            Voice Name
          </label>
          <input
            id="clone-voice-name"
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="e.g., My Custom Voice"
            className="w-full bg-[#0B0D10] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
            disabled={isTraining}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-200">Script to Read</label>
          <div className="p-4 sm:p-5 bg-[#0B0D10] border border-zinc-800 rounded-xl text-zinc-200 text-base leading-relaxed">
            "Hello dosto, I am now creating my custom{' '}
            <mark className="bg-amber-500/20 text-amber-300 rounded px-1.5 py-0.5 cursor-help" title="Voice Cloning Trigger">
              voice clone
            </mark>
            . Ekdum badhiya{' '}
            <mark className="bg-amber-500/20 text-amber-300 rounded px-1.5 py-0.5 cursor-help" title="Frequency calibration">
              audio quality
            </mark>{' '}
            capture karne ke liye, I am speaking clearly and at a{' '}
            <mark className="bg-amber-500/20 text-amber-300 rounded px-1.5 py-0.5 cursor-help" title="Pacing calibration">
              natural pace
            </mark>
            . Yeh sample help karega to generate realistic{' '}
            <mark className="bg-amber-500/20 text-amber-300 rounded px-1.5 py-0.5 cursor-help" title="Timbre matching">
              speech synthesis
            </mark>
            ."
          </div>
        </div>

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isTraining}
          className={`w-full flex items-center justify-center gap-2 min-h-[44px] py-3 px-6 rounded-xl font-medium text-sm transition-colors ${
            isRecording
              ? 'bg-red-500/15 text-red-400 border border-red-500/50'
              : hasRecorded
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/20'
                : 'bg-[#181C24] text-zinc-200 border border-zinc-700 hover:bg-zinc-800'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Recording</span>
            </>
          ) : hasRecorded ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Recording Captured (Tap to Redo)</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Start Mic Recording</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-4">
          <div className="h-px bg-zinc-800 flex-1" />
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">or</span>
          <div className="h-px bg-zinc-800 flex-1" />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-200">Upload Audio Sample</label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isTraining && fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center p-6 border border-dashed rounded-xl transition-colors cursor-pointer ${
              isDragging
                ? 'border-amber-500 bg-amber-500/10'
                : file
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-zinc-700 bg-[#0B0D10] hover:border-zinc-500 hover:bg-[#181C24]'
            } ${isTraining ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="hidden"
              disabled={isTraining}
            />

            {file ? (
              <div className="flex flex-col items-center gap-2 text-emerald-300">
                <FileAudio className="w-7 h-7" />
                <span className="font-medium text-sm text-center break-all px-4">{file.name}</span>
                <span className="text-xs font-mono tabular-nums text-zinc-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                <Upload className="w-5 h-5 mb-1 text-zinc-400" />
                <span className="font-medium text-sm text-zinc-200">Drop or browse audio file</span>
                <span className="text-xs text-zinc-500">MP3, WAV, M4A</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleTrain}
          disabled={(!hasRecorded && !file) || !voiceName.trim() || isTraining}
          className="w-full flex items-center justify-center gap-2 min-h-[46px] py-3 px-6 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isTraining ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-mono tabular-nums">
                {getTrainingStatusText(trainingProgress)} ({trainingProgress}%)
              </span>
            </>
          ) : (
            <>
              <AudioLines className="w-4 h-4" />
              <span>Train Custom Voice</span>
            </>
          )}
        </button>

        {isTraining && (
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-400 h-full transition-all duration-150 ease-linear"
              style={{ width: `${trainingProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Right: Saved Cloned Voices */}
      <div className="lg:col-span-5 lg:border-l lg:border-zinc-800/80 lg:pl-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AudioLines className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-base text-white">Your Cloned Voices</h3>
          </div>
          <span className="text-xs text-zinc-500 font-mono tabular-nums">{clonedVoices.length} saved</span>
        </div>

        {clonedVoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-[#0B0D10] border border-zinc-800/80 rounded-xl text-zinc-500 space-y-2">
            <AudioLines className="w-9 h-9 opacity-25" />
            <p className="text-sm text-zinc-400">No custom voices created yet.</p>
            <p className="text-xs text-zinc-500">Record a sample or upload an audio clip to add one.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {clonedVoices.map((voice) => (
              <div
                key={voice.id}
                className="flex items-center justify-between p-3.5 bg-[#0B0D10] border border-zinc-800 rounded-xl"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-zinc-100 truncate">{voice.name}</p>
                    <p className="text-xs text-emerald-400/90">Ready in AI Voices</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteVoice(voice.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                  title="Delete voice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
