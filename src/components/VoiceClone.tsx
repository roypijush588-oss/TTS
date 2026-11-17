import React, { useState, useRef } from 'react';
import { Trash2, Loader2, AudioLines, CheckCircle2, Mic, Square, Upload, FileAudio } from 'lucide-react';

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
      alert("Microphone access is required to clone your voice.");
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
        createdAt: Date.now()
      };
      setClonedVoices(prevVoices => [...prevVoices, newVoice]);
      setIsTraining(false);
      setHasRecorded(false);
      setFile(null);
      setVoiceName('');
      setTimeout(() => setTrainingProgress(0), 500);
    }
  }, [trainingProgress, isTraining, voiceName, setClonedVoices]);

  const deleteVoice = (id: string) => {
    setClonedVoices(prev => prev.filter(v => v.id !== id));
  };

  const getTrainingStatusText = (progress: number) => {
    if (progress < 20) return "Analyzing audio frequencies...";
    if (progress < 40) return "Extracting vocal formants...";
    if (progress < 60) return "Building phonetic dictionary...";
    if (progress < 80) return "Training acoustic model...";
    if (progress < 100) return "Finalizing voice clone...";
    return "Voice ready!";
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Record Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">Create Voice Clone</h3>
            <p className="text-neutral-400 text-sm">
              Read the provided script clearly, or upload an existing audio file of your voice to create your clone.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Voice Name
              </label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g., My Custom Voice"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                disabled={isTraining}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Script to Read
              </label>
              <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-300 text-lg leading-relaxed font-medium">
                "Hello dosto, I am now creating my custom <mark className="bg-indigo-500/20 text-indigo-300 rounded px-1.5 cursor-help" title="Voice Cloning Trigger">voice clone</mark>. 
                Ekdum badhiya <mark className="bg-indigo-500/20 text-indigo-300 rounded px-1.5 cursor-help" title="Frequency calibration">audio quality</mark> capture karne ke liye, 
                I am speaking clearly and at a <mark className="bg-indigo-500/20 text-indigo-300 rounded px-1.5 cursor-help" title="Pacing calibration">natural pace</mark>. 
                Yeh sample help karega to generate realistic <mark className="bg-indigo-500/20 text-indigo-300 rounded px-1.5 cursor-help" title="Timbre matching">speech synthesis</mark>."
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTraining}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium transition-all ${
                  isRecording 
                    ? 'bg-red-500/10 text-red-500 border border-red-500/50 animate-pulse' 
                    : hasRecorded
                      ? 'bg-green-500/10 text-green-400 border border-green-500/50 hover:bg-green-500/20'
                      : 'bg-neutral-800 text-neutral-200 border border-neutral-700 hover:bg-neutral-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-5 h-5 fill-current" />
                    Stop Recording
                  </>
                ) : hasRecorded ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Recording Captured (Redo?)
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    Start Recording
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-neutral-800 flex-1"></div>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">OR</span>
              <div className="h-px bg-neutral-800 flex-1"></div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-neutral-300">
                Upload Voice Record
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isTraining && fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : file 
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50'
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
                  <div className="flex flex-col items-center gap-3 text-green-400">
                    <FileAudio className="w-8 h-8" />
                    <span className="font-medium text-center break-all px-4">{file.name}</span>
                    <span className="text-xs opacity-70">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-neutral-400">
                    <Upload className="w-6 h-6 mb-1 opacity-60" />
                    <span className="font-medium text-sm">Upload audio file</span>
                    <span className="text-xs opacity-70">MP3, WAV, M4A</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleTrain}
              disabled={(!hasRecorded && !file) || !voiceName.trim() || isTraining}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-medium bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isTraining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {getTrainingStatusText(trainingProgress)} ({trainingProgress}%)
                </>
              ) : (
                <>
                  <AudioLines className="w-5 h-5" />
                  Train Custom Voice
                </>
              )}
            </button>
            
            {isTraining && (
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-150 ease-linear"
                  style={{ width: `${trainingProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-6 bg-neutral-900/30 p-6 rounded-2xl border border-neutral-800/50">
          <div className="flex items-center gap-2 text-indigo-400 mb-4">
            <AudioLines className="w-5 h-5" />
            <h3 className="font-medium text-lg text-white">Your Cloned Voices</h3>
          </div>

          {clonedVoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500 space-y-3">
              <AudioLines className="w-12 h-12 opacity-20" />
              <p>No custom voices created yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clonedVoices.map((voice) => (
                <div 
                  key={voice.id}
                  className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 text-green-400 rounded-lg">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-200">{voice.name}</p>
                      <p className="text-xs text-neutral-500">Ready to use</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteVoice(voice.id)}
                    className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
    </div>
  );
}
