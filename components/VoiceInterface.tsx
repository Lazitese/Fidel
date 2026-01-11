
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
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    setIsActive(false);
    setIsModelSpeaking(false);
    nextStartTimeRef.current = 0;
    sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
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
                sessionPromise.then((session) => { 
                  if (session) session.sendRealtimeInput({ media: pcmBlob }); 
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
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
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
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError(true);
      } else {
        setError("ሚክሮፎኑን መክፈት አልተቻለም።");
      }
      setIsConnecting(false);
    }
  };

  useEffect(() => { return () => stopSession(); }, [stopSession]);

  return (
    <div className="flex flex-col items-center h-full bg-[#fdfdfd] relative overflow-hidden pt-10 select-none">
      <div className={`absolute top-0 left-0 w-full h-full pointer-events-none transition-all duration-[1000ms] ${isActive ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`absolute top-[15%] left-[-15%] w-[450px] h-[450px] rounded-full blur-[140px] transition-colors duration-1000 ${isModelSpeaking ? 'bg-amber-200/30' : 'bg-emerald-200/40'}`} />
        <div className={`absolute bottom-[15%] right-[-15%] w-[450px] h-[450px] rounded-full blur-[140px] transition-colors duration-1000 ${isModelSpeaking ? 'bg-orange-200/20' : 'bg-teal-200/30'}`} style={{ animationDelay: '1s' }} />
      </div>

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

      <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 py-6">
        <div className="relative flex items-center justify-center">
          <div className={`absolute w-[360px] h-[360px] flex items-center justify-center transition-all duration-700 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
             {frequencies.map((v, i) => {
               const angle = (i / frequencies.length) * 360;
               const radius = 170 + (v / 255) * 40;
               return (
                 <div 
                   key={i}
                   className={`absolute w-1.5 rounded-full transition-all duration-75 ${isModelSpeaking ? 'bg-amber-400' : 'bg-emerald-500'}`}
                   style={{
                     height: `${Math.max(4, (v / 255) * 60)}px`,
                     transform: `rotate(${angle}deg) translateY(-${radius}px)`,
                     opacity: 0.1 + (v / 255) * 0.9,
                     filter: isActive ? 'drop-shadow(0 0 8px currentColor)' : 'none'
                   }}
                 />
               );
             })}
          </div>

          <div className={`relative flex items-center justify-center transition-all duration-[1000ms] ${isActive ? 'scale-100' : 'scale-90'}`}>
            <div 
              className={`absolute rounded-full transition-all duration-200 blur-[80px] ${
                isActive 
                  ? (isModelSpeaking ? 'bg-amber-400' : 'bg-emerald-400') 
                  : 'bg-transparent'
              }`} 
              style={{ 
                width: `${280 + (volume * 1.5)}px`, 
                height: `${280 + (volume * 1.5)}px`,
                opacity: 0.2 + (volume / 255) * 0.5
              }}
            />

            <div className={`w-64 h-64 rounded-[42%] transition-all duration-[800ms] shadow-2xl flex items-center justify-center border-4 border-white overflow-hidden relative ${
              isActive 
                ? (isModelSpeaking ? 'bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-300 ring-8 ring-amber-500/10' : 'bg-gradient-to-br from-[#064e3b] via-emerald-600 to-teal-400 ring-8 ring-emerald-500/10') 
                : 'bg-slate-100 border-slate-200'
            }`}
            style={{
              transform: isActive ? `scale(${1 + (volume / 1000)}) rotate(${isModelSpeaking ? volume/10 : 0}deg)` : 'none'
            }}>
              <div className={`relative transition-all duration-1000 transform ${isActive ? 'scale-110 opacity-100 drop-shadow-xl' : 'scale-90 opacity-20'}`}>
                <Logo size="lg" />
              </div>
              {isActive && (
                <div 
                  className={`absolute bottom-0 left-0 right-0 transition-all duration-300 pointer-events-none ${isModelSpeaking ? 'bg-white/20' : 'bg-white/10'}`} 
                  style={{ height: `${20 + (volume / 2)}%` }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-20 text-center space-y-3">
           <div className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${isActive ? (isModelSpeaking ? 'text-amber-600' : 'text-emerald-600') : 'text-slate-400'}`}>
             {isActive ? (isModelSpeaking ? 'Fidel AI Speaking' : 'Listening...') : `${grade} Education Portal`}
           </div>
           <h2 className={`Amharic-font text-2xl font-black transition-all duration-500 ${isActive ? 'text-slate-900 opacity-100' : 'text-slate-300 opacity-50'}`}>
             {isActive ? (isModelSpeaking ? 'በማዳመጥ ላይ...' : 'ምን ላግዝዎት?') : 'ትምህርት ለመጀመር ይጫኑ'}
           </h2>
        </div>

        <div className="mt-12 w-full px-12 flex flex-col items-center">
          <button
            onClick={isActive ? stopSession : startSession}
            disabled={isConnecting}
            className={`w-full max-w-[280px] py-6 rounded-[2.5rem] font-black text-xl shadow-2xl transform active:scale-95 transition-all duration-500 flex items-center justify-center gap-4 border-b-4 ${
              isActive 
                ? 'bg-slate-900 border-slate-950 text-white shadow-slate-200' 
                : 'bg-gradient-to-br from-[#064e3b] via-emerald-800 to-emerald-900 border-[#032e23] text-white shadow-emerald-900/40'
            } ${isConnecting ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {isConnecting ? (
              <div className="w-7 h-7 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            ) : isActive ? (
              <>
                <div className="w-3.5 h-3.5 bg-red-500 rounded-full animate-pulse ring-4 ring-red-500/20" />
                <span className="Amharic-font tracking-tight">ጨርስ</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                <span className="Amharic-font font-black tracking-tighter">ትምህርት ጀምር</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="fixed bottom-28 left-0 right-0 flex justify-center px-10 pointer-events-none">
        {error && (
          <div className="p-5 bg-red-50 text-red-700 rounded-3xl text-[11px] font-black border border-red-100 shadow-lg text-center animate-shake flex items-center justify-center gap-3 pointer-events-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}
      </div>
      
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
