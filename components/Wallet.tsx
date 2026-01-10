
import React, { useState } from 'react';
import { UserWallet, DepositRecord } from '../types';
import { TELEBIRR_NUMBER, MIN_DEPOSIT_ETB } from '../constants';

interface WalletProps {
  wallet: UserWallet;
  deposits: DepositRecord[];
  onAddDeposit: (amount: number, screenshot: File) => void;
  userName: string;
}

export const Wallet: React.FC<WalletProps> = ({ wallet, deposits, onAddDeposit, userName }) => {
  const [amount, setAmount] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!file || isNaN(parsedAmount) || parsedAmount < MIN_DEPOSIT_ETB) return;
    
    setIsUploading(true);
    try {
      await onAddDeposit(parsedAmount, file);
      setAmount('');
      setFile(null);
      setShowForm(false);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'Processing...' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return 'Processing...'; }
  };

  return (
    <div className="p-6 space-y-8 bg-[#fdfdfd] h-full overflow-y-auto">
      <div className="relative h-52 w-full rounded-[2.5rem] bg-slate-900 overflow-hidden shadow-2xl p-6 flex flex-col justify-between border border-slate-800">
        <div className="absolute top-[-30%] right-[-15%] w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px]" />
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Balance</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white tracking-tight">{wallet.balanceETB.toFixed(2)}</span>
              <span className="text-sm font-bold text-amber-500">ETB</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-white/5 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/10">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
             </svg>
          </div>
        </div>
        
        <div className="relative z-10">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{userName}</span>
          <p className="text-[9px] font-mono text-slate-500 tracking-wider">SECURE ACCOUNT ID: ...{Math.random().toString(36).substr(-6).toUpperCase()}</p>
        </div>
      </div>

      <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-3xl flex items-center gap-4">
        <div className="flex-1">
          <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Telebirr Transfer</p>
          <p className="text-[14px] font-bold text-emerald-600 mt-1">{TELEBIRR_NUMBER}</p>
        </div>
        <button 
          onClick={() => navigator.clipboard.writeText(TELEBIRR_NUMBER)}
          className="bg-white px-3 py-1.5 rounded-lg border border-emerald-100 text-[10px] font-bold text-emerald-700"
        >
          Copy
        </button>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-5 bg-emerald-800 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
          Add Funds
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6 animate-fade-in relative z-20">
          <div className="flex justify-between items-center">
            <h4 className="font-black text-lg text-slate-900 tracking-tight">Deposit Request</h4>
            <button type="button" onClick={() => setShowForm(false)} className="bg-slate-100 p-2 rounded-full">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
               </svg>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Amount (ETB)</label>
              <input
                type="number"
                inputMode="decimal"
                min={MIN_DEPOSIT_ETB}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-black text-xl text-black"
                placeholder="50.00"
                required
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Proof Screenshot</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-emerald-50 file:text-emerald-700"
                required
              />
            </div>
          </div>
          <button type="submit" disabled={isUploading} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all">
            {isUploading ? "Uploading..." : "Submit Proof"}
          </button>
        </form>
      )}

      <div className="space-y-4 pb-32">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">History</h4>
        {deposits.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-3xl">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deposits.map(d => (
              <div key={d.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 text-sm">{d.amount} ETB</span>
                    <span className="text-[9px] font-bold text-slate-400">{formatDate(d.timestamp)}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  d.status === 'approved' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
