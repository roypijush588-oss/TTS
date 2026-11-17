import React, { useState, useRef } from 'react';
import { Mic, Square, Trash2, AlertCircle, Download, Loader2 } from 'lucide-react';

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
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      setError('Could not access the microphone. Please ensure you have granted permission.');
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

      const writeString = (viewObj: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          viewObj.setUint8(offset + i, string.charCodeAt(i));
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

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      console.error('Failed to convert to WAV:', err);
      setError('Failed to download standard WAV format.');
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
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <div className="text-center space-y-1.5">
        <h2 className="text-xl font-semibold text-white">Record Your Natural Voice</h2>
        <p className="text-sm text-zinc-400">
          Capture a clean microphone take to review your vocal tone or export as a WAV file.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 text-red-300 bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-[#0B0D10] border border-zinc-800 rounded-2xl">
        {!audioURL ? (
          <div className="flex flex-col items-center gap-5">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`relative flex items-center justify-center w-28 h-28 rounded-full border transition-all duration-200 ${
                isRecording
                  ? 'bg-red-500/15 text-red-400 border-red-500/60 hover:bg-red-500/25'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
              }`}
              aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? (
                <Square className="w-10 h-10 fill-current" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>
            <p className="text-sm font-medium text-zinc-300">
              {isRecording ? 'Recording in progress... Tap to stop' : 'Tap microphone to start recording'}
            </p>
          </div>
        ) : (
          <div className="w-full space-y-6">
            <audio ref={audioRef} src={audioURL} controls className="w-full" />

            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  deleteRecording();
                  startRecording();
                }}
                className="flex items-center gap-2 min-h-[42px] px-5 py-2.5 rounded-xl bg-[#181C24] text-zinc-200 hover:bg-zinc-800 border border-zinc-700 transition-colors text-sm font-medium whitespace-nowrap shrink-0"
              >
                <Mic className="w-4 h-4" />
                <span>Record Again</span>
              </button>

              <button
                type="button"
                onClick={isDownloading ? undefined : downloadAsWav}
                disabled={isDownloading}
                className="flex items-center gap-2 min-h-[42px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isDownloading ? 'Converting...' : 'Download WAV'}</span>
              </button>

              <button
                type="button"
                onClick={deleteRecording}
                className="flex items-center gap-2 min-h-[42px] px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors text-sm font-medium whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
