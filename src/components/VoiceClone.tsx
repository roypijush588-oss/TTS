import React, { useState, useRef } from 'react';
import { Trash2, Loader2, AudioLines, CheckCircle2, Mic, Square, Upload, FileAudio, Sparkles, Activity } from 'lucide-react';

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

  const handleLeave = () => {
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
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setHasRecorded(false);
    }
  };

  const startRecording = async () => {
    setFile(null);
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
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleTrain = () => {
    if ((!hasRecorded && !file) || !voiceName.trim()) return;
    
    setIsTraining(true);
    setTrainingProgress(0);
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTraining) {
      interval = setInterval(() => {
        setTrainingProgress(prev => {
          if (prev >= 100) return 100;
          return prev + 5;
        });
      }, 140);
    }
    return () => clearInterval(interval);
  }, [isTraining]);

  React.useEffect(() => {
    if (isTraining && trainingProgress >= 100) {
      const newVoice: ClonedVoice = {
        id: `clone-${Date.now()}`,
        name: voiceName.trim(),
        status: 'ready',
        createdAt: Date.now()
      };
      setClonedVoices(prevVoices => [...prevVoices, newVoice]);
      setIsTraining(false);
      setHasRecorded(false);
      setFile(null);
      setVoiceName('');
      setTimeout(() => setTrainingProgress(0), 400);
    }
  }, [trainingProgress, isTraining, voiceName, setClonedVoices]);

  const deleteVoice = (id: string) => {
    setClonedVoices(prev => prev.filter(v => v.id !== id));
  };

  const getTrainingStatusText = (progress: number) => {
    if (progress < 20) return "Analyzing audio spectrum & formants...";
    if (progress < 45) return "Extracting phonetic pitch contours...";
    if (progress < 70) return "Synthesizing timbre neural weights...";
    if (progress < 95) return "Calibrating model for DAW voice rack...";
    return "Voice profile successfully compiled!";
  };

  return (
    <div className="space-y-6">
      {/* Header Ribbon */}
      <div className="bg-[#0C111C] border border-[#182338] rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <AudioLines className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">TRACK 02: NEURAL VOICE CLONING LAB</h2>
            <p className="text-xs text-slate-400">Train custom timbre profiles from live microphone audio or studio samples</p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
          <Activity className="w-3.5 h-3.5" />
          <span>{clonedVoices.length} CLONED PROFILES READY</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Section (Cols 1-7): Creation Rack */}
        <div className="lg:col-span-7 bg-[#0C111C] border border-[#182338] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-[#182338] pb-3">
            <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider">
              PROFILE CONFIGURATION & SAMPLE CAPTURE
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Provide a name and a clean audio sample using the reference calibration script.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                Voice Profile Name
              </label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g. Studio Narrator, Host Hindi, Brand Persona..."
                className="w-full bg-[#080B12] border border-[#182338] rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 font-sans"
                disabled={isTraining}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                Reference Calibration Script (Read aloud)
              </label>
              <div className="p-4 bg-[#080B12] border border-[#182338] rounded-xl text-slate-200 text-sm leading-relaxed font-sans">
                "Hello dosto, I am now creating my custom <span className="text-indigo-400 font-semibold bg-indigo-500/10 px-1 rounded">voice clone</span> in VocalStudio. 
                Ekdum badhiya <span className="text-indigo-400 font-semibold bg-indigo-500/10 px-1 rounded">audio quality</span> capture karne ke liye, 
                I am speaking clearly and at a <span className="text-indigo-400 font-semibold bg-indigo-500/10 px-1 rounded">natural 1-minute pace</span>. 
                Yeh sample help karega to generate realistic speech synthesis."
              </div>
            </div>

            {/* Mic Record Button */}
            <div className="flex gap-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTraining}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-mono text-xs font-bold transition-all border ${
                  isRecording 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-lg shadow-rose-500/20 animate-pulse' 
                    : hasRecorded
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                      : 'bg-[#121A2A] text-slate-200 border-[#202D47] hover:bg-[#1A253C]'
                } disabled:opacity-50`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>STOP RECORDING SAMPLE</span>
                  </>
                ) : hasRecorded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>SAMPLE CAPTURED (CLICK TO RE-RECORD)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-indigo-400" />
                    <span>RECORD VOCAL SAMPLE VIA MIC</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-4 py-1">
              <div className="h-[1px] bg-[#182338] flex-1" />
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">OR IMPORT FILE</span>
              <div className="h-[1px] bg-[#182338] flex-1" />
            </div>

            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleLeave}
              onDrop={handleDrop}
              onClick={() => !isTraining && fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-500/10' 
                  : file 
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-[#1E2B45] hover:border-indigo-500/50 bg-[#080B12]/80 hover:bg-[#0E1524]'
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
                  <FileAudio className="w-7 h-7 text-emerald-400" />
                  <span className="font-mono text-xs text-center break-all px-4">{file.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB Audio Sample</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                  <Upload className="w-5 h-5 text-indigo-400 mb-1" />
                  <span className="font-mono text-xs font-semibold text-slate-300">Drop audio sample or click to browse</span>
                  <span className="text-[10px] font-mono text-slate-500">Supports WAV, MP3, FLAC, M4A</span>
                </div>
              )}
            </div>

            {/* Train Trigger */}
            <button
              onClick={handleTrain}
              disabled={(!hasRecorded && !file) || !voiceName.trim() || isTraining}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-6 rounded-xl font-mono text-xs font-bold bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white shadow-xl shadow-indigo-600/30 disabled:opacity-40 transition-all"
            >
              {isTraining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{getTrainingStatusText(trainingProgress)} ({trainingProgress}%)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>TRAIN & COMPILE VOICE MODEL</span>
                </>
              )}
            </button>
            
            {isTraining && (
              <div className="w-full bg-[#080B12] rounded-full h-2 overflow-hidden border border-[#182338]">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-150 ease-linear"
                  style={{ width: `${trainingProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Section (Cols 8-12): Cloned Voices Library */}
        <div className="lg:col-span-5 bg-[#0C111C] border border-[#182338] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#182338]">
            <div className="flex items-center gap-2">
              <AudioLines className="w-4 h-4 text-indigo-400" />
              <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-200">
                ACTIVE CLONED LIBRARY ({clonedVoices.length})
              </h3>
            </div>
          </div>

          {clonedVoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3 font-mono text-xs text-center">
              <AudioLines className="w-10 h-10 opacity-30 text-indigo-400" />
              <p>No custom voice models created yet.</p>
              <p className="text-[11px] text-slate-600">Trained voices automatically appear in Track 01's Voice Rack.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {clonedVoices.map((voice) => (
                <div 
                  key={voice.id}
                  className="flex items-center justify-between p-3.5 bg-[#080B12] border border-[#182338] rounded-xl hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-100">{voice.name}</p>
                      <p className="text-[10px] font-mono text-indigo-400">Biometric Profile • Active in Voice Rack</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteVoice(voice.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Remove voice profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
