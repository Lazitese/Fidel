
import React from 'react';
import { DepositRecord } from '../types';

interface AdminPanelProps {
  deposits: DepositRecord[];
  totalTokens: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ deposits, totalTokens, onApprove, onReject, onLogout }) => {
  const pending = deposits.filter(d => d.status === 'pending');
  const processed = deposits.filter(d => d.status !== 'pending');
  
  const totalRevenue = deposits
    .filter(d => d.status === 'approved')
    .reduce((sum, d) => sum + d.amount, 0);

  // Gemini Flash cost is roughly 9 ETB per 1M tokens
  const estimatedCostETB = (totalTokens / 1000000) * 9;
  const netProfit = Math.max(0, (totalTokens / 1000000) * 3.86); // Difference between charge (12.86) and cost (9.00)
  const currentMargin = totalTokens > 0 ? (netProfit / ((totalTokens / 1000000) * 12.86)) * 100 : 30;

  return (
    <div className="p-8 bg-slate-50 min-h-screen pb-32">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Admin Console</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Fidel Engine Management</p>
        </div>
        <button onClick={onLogout} className="bg-white border border-slate-200 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm">Logout</button>
      </header>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Revenue</span>
          <div className="text-4xl font-black mt-2 tracking-tighter">{totalRevenue.toFixed(2)} <span className="text-xs text-emerald-500">ETB</span></div>
          <p className="text-[10px] text-slate-500 mt-4 uppercase font-bold tracking-widest">Approved Deposits</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Profit (30%)</span>
          <div className="text-4xl font-black mt-2 tracking-tighter text-emerald-600">{netProfit.toFixed(2)} <span className="text-xs text-slate-400">ETB</span></div>
          <div className="flex items-center gap-2 mt-4">
             <span className="text-[10px] font-black text-white bg-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">{currentMargin.toFixed(1)}% Target Margin</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Usage Volume</span>
          <div className="text-4xl font-black mt-2 tracking-tighter text-slate-900">{(totalTokens / 1000).toFixed(1)}k</div>
          <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">Tokens Streamed</p>
        </div>
      </div>

      <div className="space-y-10">
        <section>
          <div className="flex items-center justify-between mb-6 px-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Pending Verification</h3>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-4 py-1.5 rounded-full">{pending.length} Requests</span>
          </div>
          
          {pending.length === 0 ? (
            <div className="bg-white/40 border border-dashed border-slate-200 py-16 rounded-[3rem] text-center">
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Inbox Clean</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {pending.map(d => (
                <div key={d.id} className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-48 h-48 rounded-[2rem] overflow-hidden border border-slate-100 cursor-zoom-in group relative" onClick={() => window.open(d.screenshotUrl, '_blank')}>
                    <img src={d.screenshotUrl} alt="Telebirr proof" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                       </svg>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-2">
                    <div className="space-y-1">
                       <div className="text-3xl font-black text-emerald-700 tracking-tighter">{d.amount} ETB</div>
                       <p className="text-xs font-bold text-slate-400">{new Date(d.timestamp).toLocaleString()}</p>
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-4">Transaction ID: {d.id}</p>
                    </div>
                    <div className="flex gap-4 mt-8">
                      <button 
                        onClick={() => onApprove(d.id)}
                        className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm tracking-widest shadow-xl active:scale-95 transition-all"
                      >
                        APPROVE
                      </button>
                      <button 
                        onClick={() => onReject(d.id)}
                        className="bg-red-50 text-red-500 px-6 py-4 rounded-2xl font-black text-sm tracking-widest active:scale-95 transition-all"
                      >
                        REJECT
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-4">Recent History</h3>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
            {processed.length === 0 ? (
              <p className="p-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No processed transactions</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {processed.map(d => (
                  <div key={d.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-black text-slate-900 tracking-tight">{d.amount} ETB</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{new Date(d.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                      d.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
