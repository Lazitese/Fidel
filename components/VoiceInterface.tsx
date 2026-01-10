
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { APP_MODELS, SYSTEM_INSTRUCTION } from '../constants';
import { createPcmBlob, decode, decodeAudioData } from '../services/audioUtils';
import { Logo } from './Logo';

interface VoiceInterfaceProps {
  onTokenUsed: (tokens: number) => void;
  balance: number;
  grade: string;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onTokenUsed, balance, grade }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [frequencies, setFrequencies] = useState<number[]>(new Array(32).fill(0));
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const analyserInRef = useRef<AnalyserNode | null>(null);
  const analyserOutRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) { }
      sessionRef.current = null;
    }
    setIsActive(false);
    setIsModelSpeaking(false);
    nextStartTimeRef.current = 0;
    sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
    sourcesRef.current.clear();

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (outContextRef.current) { outContextRef.current.close(); outContextRef.current = null; }
    setFrequencies(new Array(32).fill(0));
    setVolume(0);
  }, []);

  const updateFrequencies = useCallback(() => {
    const currentAnalyser = isModelSpeaking ? analyserOutRef.current : analyserInRef.current;
    if (currentAnalyser) {
      const dataArray = new Uint8Array(currentAnalyser.frequencyBinCount);
      currentAnalyser.getByteFrequencyData(dataArray);

      let sumVolume = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sumVolume += dataArray[i];
      }
      setVolume(sumVolume / dataArray.length);

      const step = Math.floor(dataArray.length / 32);
      const newFreqs = [];
      for (let i = 0; i < 32; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j];
        }
        newFreqs.push(sum / step);
      }
      setFrequencies(newFreqs);
    } else {
      setFrequencies(prev => prev.map(f => f * 0.85));
      setVolume(prev => prev * 0.9);
    }
    animationFrameRef.current = requestAnimationFrame(updateFrequencies);
  }, [isModelSpeaking]);

  const startSession = async () => {
    if (balance <= 0) {
      setError("በቂ ሂሳብ የለዎትም (Insufficient balance)");
      return;
    }
    try {
      setIsConnecting(true);
      setError(null);
      setPermissionError(false);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      audioContextRef.current = new AudioCtx({ sampleRate: 16000 });
      outContextRef.current = new AudioCtx({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
      });

      const inSource = audioContextRef.current.createMediaStreamSource(stream);
      const analyserIn = audioContextRef.current.createAnalyser();
      analyserIn.fftSize = 256;
      inSource.connect(analyserIn);
      analyserInRef.current = analyserIn;

      const analyserOut = outContextRef.current.createAnalyser();
      analyserOut.fftSize = 256;
      analyserOut.connect(outContextRef.current.destination);
      analyserOutRef.current = analyserOut;

      updateFrequencies();

      const studentContext = `\nSTUDENT PROFILE: Currently in ${grade}.\nTailor your language complexity, terminology, and depth of explanation to a student in this specific grade. A KG student needs stories and basic counting, while a Grade 12 student needs technical depth for national exams.`;

      const sessionPromise = ai.live.connect({
        model: APP_MODELS.LIVE,
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            if (audioContextRef.current) {
              const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                onTokenUsed(Math.ceil(0.256 * 150));
                sessionPromise.then(async (session) => {
                  if (session && sessionRef.current) {
                    try {
                      await session.sendRealtimeInput({ media: pcmBlob });
                    } catch (e) {
                      // Ignore errors if socket is closing
                    }
                  }
                });
              };
              inSource.connect(scriptProcessor);
              scriptProcessor.connect(audioContextRef.current.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data && outContextRef.current) {
                  setIsModelSpeaking(true);
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outContextRef.current.currentTime);
                  const audioBuffer = await decodeAudioData(decode(part.inlineData.data), outContextRef.current, 24000, 1);
                  const source = outContextRef.current.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(analyserOutRef.current!);
                  source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) setIsModelSpeaking(false);
                  });
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  sourcesRef.current.add(source);
                  onTokenUsed(Math.ceil(audioBuffer.duration * 200));
                }
              }
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
              sourcesRef.current.clear();
              setIsModelSpeaking(false);
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            setError("የግንኙነት ስህተት!");
            stopSession();
          },
          onclose: () => setIsActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: SYSTEM_INSTRUCTION + studentContext + "\nRespond instantly. Be concise. High-quality Ethiopian teacher persona.",
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Session Start Error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError(true);
      } else {
        // Show actual error for debugging
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`ስህተት: ${errorMessage}`);
      }
      setIsConnecting(false);
    }
  };

  useEffect(() => { return () => stopSession(); }, [stopSession]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-between bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      {permissionError && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-2xl flex items-center justify-center p-8 animate-fade-in">
          <div className="w-full max-w-sm glass-panel p-10 rounded-[3rem] border border-red-100 shadow-2xl space-y-8 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-[2.25rem] mx-auto flex items-center justify-center text-red-500 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight Amharic-font leading-tight">የሚክሮፎን ፍቃድ ተከልክሏል</h3>
              <p className="text-slate-600 font-medium Amharic-font text-sm leading-relaxed">ትምህርት ለመጀመር ማይክሮፎኑን መፍቀድ አለብዎት።</p>
            </div>
            <button
              onClick={() => { setPermissionError(false); startSession(); }}
              className="w-full py-5 bg-[#064e3b] text-white rounded-2xl font-black text-lg shadow-xl"
            >
              እንደገና ሞክር
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Centered Logo */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-6 pt-6 pb-4">
        {/* Logo Circle */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-56 h-56 flex items-center justify-center">
            <div className={`transition-all duration-700 ${isActive
              ? 'opacity-100 filter drop-shadow-[0_0_25px_rgba(5,150,105,0.3)]'
              : 'opacity-40 grayscale'
              }`}>
              <Logo size="lg" />
            </div>
          </div>
        </div>

        {isActive && (
          <div className="w-full max-w-xs h-16 flex items-center justify-center gap-[3px] mb-4">
            {frequencies.slice(0, 25).map((v, i) => (
              <div
                key={i}
                className={`w-2 rounded-full transition-all duration-100 ${isModelSpeaking ? 'bg-amber-500' : 'bg-[#064e3b]'}`}
                style={{
                  height: `${Math.max(12, (v / 255) * 64)}px`,
                  opacity: 1
                }}
              />
            ))}
          </div>
        )}

        {/* Status Text */}
        <div className="text-center space-y-2 mb-4">
          <div className={`text-xs font-bold uppercase tracking-wider transition-all duration-500 Amharic-font ${isActive ? (isModelSpeaking ? 'text-amber-600' : 'text-emerald-600') : 'text-slate-400'
            }`}>
            {isActive ? (isModelSpeaking ? 'ፊደል ኤአይ በመናገር ላይ...' : 'በማዳመጥ ላይ...') : `${grade} የትምህርት ፖርታል`}
          </div>
          <h2 className={`Amharic-font text-xl font-black transition-all duration-500 ${isActive ? 'text-slate-900' : 'text-slate-400'
            }`}>
            {isActive ? (isModelSpeaking ? 'እባክዎ ያዳምጡ' : 'አሁን መናገር ይችላሉ') : 'ለመጀመር ይጫኑ'}
          </h2>
        </div>

        {/* Start/Stop Button */}
        <button
          onClick={isActive ? stopSession : startSession}
          disabled={isConnecting}
          className={`w-full max-w-sm py-5 rounded-3xl font-black text-lg shadow-xl transform active:scale-95 transition-all duration-500 flex items-center justify-center gap-3 ${isActive
            ? 'bg-slate-900 text-white'
            : 'bg-gradient-to-br from-[#064e3b] via-emerald-800 to-emerald-900 text-white'
            } ${isConnecting ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {isConnecting ? (
            <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          ) : isActive ? (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse ring-4 ring-red-500/20" />
              <span className="Amharic-font">ጨርስ</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              <span className="Amharic-font">ትምህርት ጀምር</span>
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute bottom-24 left-6 right-6 p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-black border border-red-100 shadow-lg text-center animate-shake flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      <style>{`
        .Amharic-font { font-family: 'Noto Sans Ethiopic', sans-serif; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};
