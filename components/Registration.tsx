
import React, { useState } from 'react';
import { Logo } from './Logo';

interface RegistrationProps {
  onComplete: (name: string, password: string, grade: string) => void;
}

export const Registration: React.FC<RegistrationProps> = ({ onComplete }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const grades = [
    "KG", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
    "Grade 5", "Grade 6", "Grade 7", "Grade 8",
    "Grade 9", "Grade 10", "Grade 11", "Grade 12"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && password.trim() && (isLogin || grade)) {
      setIsLoading(true);
      try {
        await onComplete(name.trim(), password.trim(), grade);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#fdfdfd] px-4 py-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-100/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-amber-100/20 rounded-full blur-[100px]" />

      <div className="w-full max-w-sm space-y-6 relative z-10 text-center animate-fade-in">
        <div className="space-y-4">
          <Logo size="md" className="mx-auto" />
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight Amharic-font">
              {isLogin ? 'እንኳን ደህና መጡ!' : 'አዲስ አካውንት'}
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
              {isLogin ? 'Sign In to Fidel AI' : 'Register for Education Portal'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 glass-panel p-6 rounded-3xl border border-white/60 shadow-2xl">
          <div className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Full Name / ሙሉ ስም</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Abebe Balcha"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-base text-black"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Password / የይለፍ ቃል</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-base text-black"
                required
                disabled={isLoading}
              />
            </div>

            {!isLogin && (
              <div className="animate-slide-down">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Grade Level / የትምህርት ደረጃ</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-base text-black appearance-none"
                  required
                  disabled={isLoading}
                >
                  <option value="" disabled>ክፍልዎን ይምረጡ</option>
                  {grades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#064e3b] text-white rounded-2xl font-black text-base shadow-xl shadow-emerald-900/20 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'ግባ' : 'ተመዝገብ'}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full py-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-[#064e3b] transition-colors"
            >
              {isLogin ? "አዲስ አካውንት ለመክፈት እዚህ ይጫኑ" : "አካውንት አለዎት? ይግቡ"}
            </button>
          </div>
        </form>

        <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.4em]">Fidel Engine v4.0</p>
      </div>

      <style>{`
        .Amharic-font { font-family: 'Noto Sans Ethiopic', sans-serif; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slide-down { animation: slideDown 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};
