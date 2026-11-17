import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2, AlertCircle, Download, Loader2 } from 'lucide-react';

export default function MyVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setError("Could not access the microphone. Please ensure you have granted permission.");
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
      
      // Pad with 0.5s of silence to prevent cutoffs
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
      a.download = `my-voice-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Delay revoke significantly to ensure dialog completes
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

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-white">Record Your Natural Voice</h2>
        <p className="text-neutral-400">
          Create a recording of your own voice to use as a baseline or just to hear how you sound.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col items-center justify-center p-12 bg-neutral-900/50 border border-neutral-800 rounded-3xl">
        {!audioURL ? (
          <div className="flex flex-col items-center gap-6">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`relative group flex items-center justify-center w-32 h-32 rounded-full transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                  : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
              }`}
            >
              {isRecording && (
                <span className="absolute inset-0 rounded-full border-4 border-red-500/50 animate-ping" />
              )}
              {isRecording ? (
                <Square className="w-12 h-12 fill-current" />
              ) : (
                <Mic className="w-12 h-12" />
              )}
            </button>
            <p className="text-lg font-medium text-neutral-300">
              {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
            </p>
          </div>
        ) : (
          <div className="w-full space-y-6">
            <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800">
              <audio 
                ref={audioRef}
                src={audioURL} 
                controls 
                className="w-full"
              />
            </div>
            <div className="flex justify-center gap-4 flex-wrap">
              <button
                onClick={() => {
                  deleteRecording();
                  startRecording();
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors font-medium"
              >
                <Mic className="w-5 h-5" />
                Record Again
              </button>
              <button
                onClick={isDownloading ? undefined : downloadAsWav}
                disabled={isDownloading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {isDownloading ? 'Converting...' : 'Download'}
              </button>
              <button
                onClick={deleteRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors font-medium"
              >
                <Trash2 className="w-5 h-5" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
