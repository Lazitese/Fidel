
import React, { useState } from 'react';
import { UserWallet, DepositRecord } from '../types';
import { TELEBIRR_NUMBER, MIN_DEPOSIT_ETB } from '../constants';

interface WalletProps {
  wallet: UserWallet;
  deposits: DepositRecord[];
  onAddDeposit: (amount: number, screenshot: File) => void;
}

export const Wallet: React.FC<WalletProps> = ({ wallet, deposits, onAddDeposit }) => {
  const [amount, setAmount] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !amount || parseFloat(amount) < MIN_DEPOSIT_ETB) return;
    onAddDeposit(parseFloat(amount), file);
    setAmount('');
    setFile(null);
    setShowForm(false);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-slate-500 text-sm font-medium">የአሁኑ ቀሪ ሂሳብ (Current Balance)</h3>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-4xl font-bold text-slate-900">{wallet.balanceETB.toFixed(2)}</span>
          <span className="text-xl font-semibold text-green-600">ETB</span>
        </div>
      </div>

      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
        <h4 className="font-bold text-blue-900 mb-2">እንዴት ሂሳብ መሙላት ይቻላል? (How to Recharge)</h4>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>ወደ ቴሌብር ቁጥር <span className="font-mono font-bold">{TELEBIRR_NUMBER}</span> ይላኩ።</li>
          <li>ቢያንስ {MIN_DEPOSIT_ETB} ብር ይላኩ።</li>
          <li>የላኩበትን ደረሰኝ ስክሪንሾት (Screenshot) ያንሱ።</li>
          <li>ከታች ያለውን "ብር ጨምር" የሚለውን በመጫን ማስረጃውን ይላኩ።</li>
        </ol>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold shadow-lg transition-all"
        >
          + ብር ጨምር (Add Funds)
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold">ሂሳብ ይሙሉ</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 text-sm">ሰርዝ</button>
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-1">የብር መጠን (ETB)</label>
            <input
              type="number"
              min={MIN_DEPOSIT_ETB}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="ለምሳሌ፡ 50"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-1">ደረሰኝ (Screenshot Upload)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold"
          >
            አረጋግጥ (Submit Verification)
          </button>
        </form>
      )}

      <div className="space-y-3">
        <h4 className="font-bold text-slate-900 px-1">የቅርብ ጊዜ ዝውውሮች</h4>
        {deposits.length === 0 ? (
          <p className="text-slate-400 text-center py-8">ምንም ዝውውር የለም</p>
        ) : (
          deposits.map(d => (
            <div key={d.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100">
              <div className="flex flex-col">
                <span className="font-bold">+{d.amount} ETB</span>
                <span className="text-xs text-slate-400">{new Date(d.timestamp).toLocaleDateString()}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                d.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                d.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {d.status === 'pending' ? 'በሂደት ላይ' : d.status === 'approved' ? 'ተቀባይነት አግኝቷል' : 'ተከልክሏል'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
