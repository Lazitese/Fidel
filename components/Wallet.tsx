
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
    <div className="p-8 space-y-10 bg-[#fdfdfd] h-full overflow-y-auto">
      <div className="relative h-56 w-full rounded-[2.75rem] bg-slate-900 overflow-hidden shadow-2xl p-8 flex flex-col justify-between border border-slate-800">
        <div className="absolute top-[-30%] right-[-15%] w-64 h-64 bg-emerald-500/25 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-30%] left-[-15%] w-64 h-64 bg-amber-500/15 rounded-full blur-[80px]" />
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Student Balance</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white tracking-tight">{wallet.balanceETB.toFixed(2)}</span>
              <span className="text-xl font-bold text-amber-500">ETB</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
             </svg>
          </div>
        </div>
        
        <div className="relative z-10 flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{userName}</span>
            <p className="text-sm font-mono text-slate-300 tracking-wider">SECURE ACCOUNT ID: ...{Math.random().toString(36).substr(-4)}</p>
          </div>
          <div className="flex -space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 opacity-90 border border-white/10" />
            <div className="w-8 h-8 rounded-full bg-amber-500 opacity-90 border border-white/10" />
          </div>
        </div>
      </div>

      <div className="bg-emerald-50/80 border border-emerald-100 p-6 rounded-[2.25rem] flex items-center gap-5 shadow-sm">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-emerald-900/5 text-emerald-600">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        </div>
        <div className="flex-1">
          <p className="text-xs font-black text-emerald-900 uppercase tracking-wider">Manual Verification</p>
          <p className="text-[10px] text-emerald-700 leading-tight mt-1">Our team verifies Telebirr screenshots manually. It usually takes <b>5-15 minutes</b> to reflect in your balance.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">TELEBIRR Pay</span>
           <span className="text-sm font-black text-emerald-700 font-mono tracking-tighter">{TELEBIRR_NUMBER}</span>
        </div>
        <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Min Deposit</span>
           <span className="text-sm font-black text-amber-700 font-mono tracking-tighter">{MIN_DEPOSIT_ETB} ETB</span>
        </div>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-6 bg-emerald-800 text-white rounded-[2.25rem] font-black text-lg shadow-2xl shadow-emerald-900/25 active:scale-[0.98] transition-all flex items-center justify-center gap-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
          Add Funds
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel p-10 rounded-[3rem] border border-slate-200 shadow-2xl space-y-8 animate-fade-in relative z-20">
          <div className="flex justify-between items-center">
            <h4 className="font-black text-2xl text-slate-900 tracking-tight">Deposit</h4>
            <button type="button" onClick={() => setShowForm(false)} className="bg-slate-100/80 p-2.5 rounded-full hover:bg-slate-200 transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
               </svg>
            </button>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-1">Deposit Amount (ETB)</label>
              <input
                type="number"
                min={MIN_DEPOSIT_ETB}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none font-black text-2xl tracking-tight text-black"
                placeholder="50"
                required
                disabled={isUploading}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-1">Proof Screenshot</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="screenshot-upload"
                  required
                  disabled={isUploading}
                />
                <label htmlFor="screenshot-upload" className="w-full flex items-center justify-center gap-4 p-5 bg-emerald-50/50 border-2 border-dashed border-emerald-200/50 rounded-2xl cursor-pointer hover:bg-emerald-100/50 transition-all group">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-black text-emerald-800 truncate">{file ? file.name : "Select Screenshot"}</span>
                </label>
              </div>
            </div>
          </div>
          <button type="submit" disabled={isUploading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3">
            {isUploading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Confirm Deposit"}
          </button>
        </form>
      )}

      <div className="space-y-6 pb-32">
        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] px-2 flex justify-between items-center">
          Transaction History
          <span className="w-5 h-5 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-[10px]">{deposits.length}</span>
        </h4>
        {deposits.length === 0 ? (
          <div className="bg-slate-50/50 py-16 rounded-[3rem] flex flex-col items-center justify-center border border-dashed border-slate-200/50">
             <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center mb-4 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             </div>
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Awaiting First Deposit</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deposits.map(d => (
              <div key={d.id} className="flex items-center justify-between p-6 bg-white rounded-[2.25rem] border border-slate-100/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                    d.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                    d.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 text-lg tracking-tight">+{d.amount} ETB</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(d.timestamp)}</span>
                  </div>
                </div>
                <div className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  d.status === 'approved' ? 'bg-emerald-600 text-white' : 
                  d.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-700'
                }`}>
                  {d.status === 'pending' ? 'Verifying' : d.status === 'approved' ? 'Success' : 'Rejected'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
