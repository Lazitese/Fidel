
import React from 'react';
import { DepositRecord } from '../types';

interface AdminPanelProps {
  deposits: DepositRecord[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ deposits, onApprove, onReject, onLogout }) => {
  const pending = deposits.filter(d => d.status === 'pending');
  const processed = deposits.filter(d => d.status !== 'pending');

  return (
    <div className="p-4 bg-slate-100 min-h-screen">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">Admin Dashboard</h2>
        <button onClick={onLogout} className="text-sm bg-slate-200 px-3 py-1 rounded-lg">Logout</button>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            Pending Requests <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{pending.length}</span>
          </h3>
          {pending.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center text-slate-400">No pending deposits</div>
          ) : (
            pending.map(d => (
              <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-slate-500">Amount</p>
                    <p className="text-xl font-bold text-green-600">{d.amount} ETB</p>
                    <p className="text-xs text-slate-400">{new Date(d.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onApprove(d.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-green-100"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => onReject(d.id)}
                      className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs text-slate-500 mb-2">Proof of Payment:</p>
                  <img 
                    src={d.screenshotUrl} 
                    alt="Telebirr proof" 
                    className="w-full rounded-xl border border-slate-100"
                    onClick={() => window.open(d.screenshotUrl, '_blank')}
                  />
                </div>
              </div>
            ))
          )}
        </section>

        <section>
          <h3 className="text-lg font-bold mb-3">Processed History</h3>
          <div className="space-y-2">
            {processed.map(d => (
              <div key={d.id} className="bg-white/60 p-3 rounded-xl flex justify-between items-center border border-slate-100">
                <div className="text-sm">
                  <span className="font-bold">{d.amount} ETB</span>
                  <span className="text-slate-400 ml-2 text-xs">{new Date(d.timestamp).toLocaleDateString()}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                  d.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
