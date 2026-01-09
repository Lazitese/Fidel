
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { APP_MODELS, SYSTEM_INSTRUCTION, TOKEN_TO_ETB_RATE } from '../constants';
import { createPcmBlob, decode, decodeAudioData } from '../services/audioUtils';

interface VoiceInterfaceProps {
  onTokenUsed: (tokens: number) => void;
  balance: number;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onTokenUsed, balance }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<{ user: string; model: string }>({ user: '', model: '' });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const transcriptionRef = useRef({ user: '', model: '' });

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {}
      sessionRef.current = null;
    }
    
    setIsActive(false);
    setIsModelSpeaking(false);
    nextStartTimeRef.current = 0;
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outContextRef.current) {
      outContextRef.current.close();
      outContextRef.current = null;
    }
  }, []);

  // Emergency stop if balance hits zero
  useEffect(() => {
    if (balance <= 0 && isActive) {
      setError("በቂ ሂሳብ የለዎትም (Insufficient balance)");
      stopSession();
    }
  }, [balance, isActive, stopSession]);

  const startSession = async () => {
    if (balance <= 0) {
      setError("በቂ ሂሳብ የለዎትም (Insufficient balance)");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      setTranscription({ user: '', model: '' });
      transcriptionRef.current = { user: '', model: '' };
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      audioContextRef.current = new AudioCtx({ sampleRate: 16000 });
      outContextRef.current = new AudioCtx({ sampleRate: 24000 });
      
      await audioContextRef.current.resume();
      await outContextRef.current.resume();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: APP_MODELS.LIVE,
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            
            if (audioContextRef.current) {
              const source = audioContextRef.current.createMediaStreamSource(stream);
              const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                sessionPromise.then((session) => {
                  if (session) session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextRef.current.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              transcriptionRef.current.user += message.serverContent.inputTranscription.text;
              setTranscription({ ...transcriptionRef.current });
            }
            if (message.serverContent?.outputTranscription) {
              transcriptionRef.current.model += message.serverContent.outputTranscription.text;
              setTranscription({ ...transcriptionRef.current });
            }
            if (message.serverContent?.turnComplete) {
              transcriptionRef.current = { user: '', model: '' };
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outContextRef.current) {
              setIsModelSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outContextRef.current.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outContextRef.current,
                24000,
                1
              );
              
              const source = outContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outContextRef.current.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsModelSpeaking(false);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              
              onTokenUsed(Math.ceil(audioBuffer.duration * 25));
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsModelSpeaking(false);
              transcriptionRef.current.model = '';
              setTranscription({ ...transcriptionRef.current });
            }
          },
          onerror: (e) => {
            setError("የግንኙነት ስህተት ተፈጥሯል። (Connection Error)");
            stopSession();
          },
          onclose: () => {
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      setError("ሚክሮፎኑን መጠቀም አልተቻለም። እባክዎን ፍቃድ ይስጡ።");
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  return (
    <div className="flex flex-col items-center justify-between p-6 h-full bg-white">
      <div className="w-full flex-1 flex flex-col items-center justify-center space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {isActive ? "አሁን እየሰማሁ ነው" : "ፊደል AI"}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {isActive ? "ኦንላይን (Online)" : "ተዘግቷል (Offline)"}
            </span>
          </div>
        </div>

        <div className="relative">
          <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-700 ${
            isActive ? 'bg-blue-50 scale-110 shadow-2xl' : 'bg-slate-50'
          }`}>
            {isActive && (
              <>
                <div className={`absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-20 ${isModelSpeaking ? 'duration-500' : 'duration-1000'}`} />
                <div className={`absolute inset-4 rounded-full border border-blue-200 animate-pulse opacity-40`} />
              </>
            )}
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isActive ? 'bg-blue-600 shadow-inner' : 'bg-slate-300'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 text-white ${isActive && !isModelSpeaking ? 'animate-bounce' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 00-3 3v10a3 3 0 003 33 3 0 003-3V5a3 3 0 00-3-3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm min-h-[120px] flex flex-col gap-3">
          {transcription.user && (
            <div className="bg-slate-100 p-3 rounded-2xl rounded-tr-none self-end max-w-[85%] border border-slate-200">
              <p className="text-sm text-slate-700 leading-relaxed font-medium Amharic-font">{transcription.user}</p>
            </div>
          )}
          {transcription.model && (
            <div className="bg-blue-600 p-3 rounded-2xl rounded-tl-none self-start max-w-[85%] shadow-md">
              <p className="text-sm text-white leading-relaxed font-medium Amharic-font">{transcription.model}</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 text-center animate-shake">
            {error}
          </div>
        )}

        <button
          onClick={isActive ? stopSession : startSession}
          disabled={isConnecting}
          className={`w-full py-5 rounded-3xl font-black text-xl shadow-xl transform active:scale-95 transition-all flex items-center justify-center gap-3 ${
            isActive 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
          } ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isConnecting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>በመገናኘት ላይ...</span>
            </>
          ) : isActive ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>አቁም (Stop)</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>አሁን አውራ (Talk Now)</span>
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-3 pb-4">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">CURRICULUM</span>
            <span className="font-extrabold text-slate-700 text-sm">KG - 12</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">LANGUAGE</span>
            <span className="font-extrabold text-slate-700 text-sm">አማርኛ</span>
          </div>
        </div>
      </div>
      
      <style>{`
        .Amharic-font {
          font-family: 'Noto Sans Ethiopic', sans-serif;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};
