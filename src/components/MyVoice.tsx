import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, AlertCircle, Download, Loader2, Radio, AudioWaveform } from 'lucide-react';

export default function MyVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setError(null);
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setError("Could not access the microphone. Please grant permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const downloadAsWav = async () => {
    if (!audioURL) return;
    setIsDownloading(true);
    try {
      const response = await fetch(audioURL);
      const arrayBuffer = await response.arrayBuffer();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      const numOfChan = audioBuffer.numberOfChannels;
      let length = audioBuffer.length * numOfChan * 2 + 44;
      
      const paddingSamples = Math.floor(audioBuffer.sampleRate * 0.5);
      length += paddingSamples * numOfChan * 2;
      
      const buffer = new ArrayBuffer(length);
      const view = new DataView(buffer);
      
      const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      const totalDataLen = (audioBuffer.length + paddingSamples) * numOfChan * 2;

      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + totalDataLen, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numOfChan, true);
      view.setUint32(24, audioBuffer.sampleRate, true);
      view.setUint32(28, audioBuffer.sampleRate * 2 * numOfChan, true);
      view.setUint16(32, numOfChan * 2, true);
      view.setUint16(34, 16, true);
      writeString(view, 36, 'data');
      view.setUint32(40, totalDataLen, true);

      let offset = 44;
      for (let i = 0; i < audioBuffer.length; i++) {
        for (let channel = 0; channel < numOfChan; channel++) {
          let sample = audioBuffer.getChannelData(channel)[i];
          sample = Math.max(-1, Math.min(1, sample));
          sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
          view.setInt16(offset, sample, true);
          offset += 2;
        }
      }

      const wavBlob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = `VocalStudio_Booth_Capture_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      console.error("Failed to convert to WAV:", err);
      setError("Failed to download standard WAV format.");
    } finally {
      setIsDownloading(false);
    }
  };

  const deleteRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL(null);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}.00`;
  };

  return (
    <div className="space-y-6">
      {/* Header Ribbon */}
      <div className="bg-[#0C111C] border border-[#182338] rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">TRACK 04: STUDIO MIC BOOTH & VOCAL CAPTURE</h2>
            <p className="text-xs text-slate-400">High-fidelity local microphone recording with instant broadcast WAV export</p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-[#080B12] px-3 py-1.5 rounded-lg border border-[#182338]">
          <Radio className="w-3.5 h-3.5 text-indigo-400" />
          <span>DIRECT PCM BUS</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-[#0C111C] border border-[#182338] rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center">
        {!audioURL ? (
          <div className="flex flex-col items-center gap-6 py-6 text-center">
            {/* Live Recording HUD */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                {isRecording ? 'LIVE RECORDING IN PROGRESS' : 'STANDBY • READY TO RECORD'}
              </span>
              <span className="font-mono text-3xl font-bold text-white tracking-wider">
                {formatTimer(recordingSeconds)}
              </span>
            </div>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`relative flex items-center justify-center w-28 h-28 rounded-full transition-all duration-300 ${
                isRecording 
                  ? 'bg-rose-500/20 text-rose-400 border-2 border-rose-500/60 shadow-[0_0_24px_rgba(244,63,94,0.4)]' 
                  : 'bg-indigo-500/20 text-indigo-400 border-2 border-indigo-500/40 hover:bg-indigo-500/30 hover:border-indigo-400'
              }`}
            >
              {isRecording && (
                <span className="absolute inset-0 rounded-full border-4 border-rose-500/40 animate-ping" />
              )}
              {isRecording ? (
                <Square className="w-10 h-10 fill-current" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>

            <p className="text-xs font-mono text-slate-400 max-w-sm">
              {isRecording ? 'Capturing audio... Tap button to complete recording session' : 'Click the microphone button to start recording your studio voice'}
            </p>
          </div>
        ) : (
          <div className="w-full max-w-xl space-y-6 py-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="flex items-center gap-2">
                <AudioWaveform className="w-4 h-4 text-emerald-400" />
                TAKE 01 AUDIO BUFFER CAPTURED
              </span>
              <span className="text-emerald-400 font-bold">{recordingSeconds}s Duration</span>
            </div>

            <div className="bg-[#080B12] p-4 rounded-xl border border-[#182338]">
              <audio 
                ref={audioRef}
                src={audioURL} 
                controls 
                className="w-full"
              />
            </div>

            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={() => {
                  deleteRecording();
                  startRecording();
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#141C2B] hover:bg-[#1E2B42] text-slate-200 border border-[#222E45] font-mono text-xs font-semibold transition-colors"
              >
                <Mic className="w-4 h-4 text-indigo-400" />
                RE-RECORD
              </button>
              <button
                onClick={isDownloading ? undefined : downloadAsWav}
                disabled={isDownloading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-mono text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isDownloading ? 'EXPORTING...' : 'EXPORT WAV'}
              </button>
              <button
                onClick={deleteRecording}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                DISCARD
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
