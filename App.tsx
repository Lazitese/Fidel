
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { VoiceInterface } from './components/VoiceInterface';
import { Wallet } from './components/Wallet';
import { AdminPanel } from './components/AdminPanel';
import { UserWallet, DepositRecord } from './types';
import { TOKEN_TO_ETB_RATE, ADMIN_PASSWORD } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'wallet' | 'admin' | 'login'>('chat');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // LocalStorage Persistence
  const [wallet, setWallet] = useState<UserWallet>(() => {
    const saved = localStorage.getItem('fidel_wallet');
    return saved ? JSON.parse(saved) : { balanceETB: 5.00, pendingDeposits: 0 };
  });

  const [deposits, setDeposits] = useState<DepositRecord[]>(() => {
    const saved = localStorage.getItem('fidel_deposits');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('fidel_wallet', JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem('fidel_deposits', JSON.stringify(deposits));
  }, [deposits]);

  useEffect(() => {
    if (window.location.hash === '#adminlaz') {
      setActiveTab('login');
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const handleTokenUsage = (tokens: number) => {
    const cost = tokens * TOKEN_TO_ETB_RATE;
    setWallet(prev => {
      const newBalance = Math.max(0, prev.balanceETB - cost);
      return { ...prev, balanceETB: newBalance };
    });
  };

  const handleAddDeposit = (amount: number, screenshot: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const newDeposit: DepositRecord = {
        id: Math.random().toString(36).substr(2, 9),
        amount,
        timestamp: new Date().toISOString(),
        status: 'pending',
        screenshotUrl: base64
      };
      
      setDeposits(prev => [newDeposit, ...prev]);
      setWallet(prev => ({
        ...prev,
        pendingDeposits: prev.pendingDeposits + 1
      }));
    };
    reader.readAsDataURL(screenshot);
  };

  const approveDeposit = (id: string) => {
    const deposit = deposits.find(d => d.id === id);
    if (!deposit) return;

    setDeposits(prev => prev.map(d => d.id === id ? { ...d, status: 'approved' } : d));
    setWallet(prev => ({
      balanceETB: prev.balanceETB + deposit.amount,
      pendingDeposits: Math.max(0, prev.pendingDeposits - 1)
    }));
  };

  const rejectDeposit = (id: string) => {
    setDeposits(prev => prev.map(d => d.id === id ? { ...d, status: 'rejected' } : d));
    setWallet(prev => ({
      ...prev,
      pendingDeposits: Math.max(0, prev.pendingDeposits - 1)
    }));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminLoggedIn(true);
      setActiveTab('admin');
      setPasswordInput('');
    } else {
      alert("Incorrect admin password.");
    }
  };

  if (activeTab === 'login') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 p-6">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 ethiopian-gradient rounded-3xl flex items-center justify-center text-white text-3xl font-black mb-4">ፊ</div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Admin Access</h2>
          </div>
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full p-5 bg-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 text-center font-bold"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">Login</button>
          <button type="button" onClick={() => setActiveTab('chat')} className="w-full text-slate-400 font-bold text-sm">Return to App</button>
        </form>
      </div>
    );
  }

  if (activeTab === 'admin' && isAdminLoggedIn) {
    return (
      <AdminPanel 
        deposits={deposits} 
        onApprove={approveDeposit} 
        onReject={rejectDeposit} 
        onLogout={() => { setIsAdminLoggedIn(false); setActiveTab('chat'); window.location.hash = ''; }} 
      />
    );
  }

  return (
    <Layout>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100 px-6 safe-pt pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 ethiopian-gradient rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-green-200">
            ፊ
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">ፊደል AI</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Educational Assistant</span>
          </div>
        </div>
        
        <div 
          onClick={() => setActiveTab('wallet')}
          className="flex flex-col items-end cursor-pointer active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-200">
             <span className="text-sm font-black text-slate-800">{wallet.balanceETB.toFixed(2)}</span>
             <span className="text-[10px] font-black text-green-600">ETB</span>
          </div>
        </div>
      </header>

      <div className="h-full pb-32">
        {activeTab === 'chat' ? (
          <VoiceInterface onTokenUsed={handleTokenUsage} balance={wallet.balanceETB} />
        ) : (
          <Wallet wallet={wallet} deposits={deposits} onAddDeposit={handleAddDeposit} />
        )}
      </div>

      {deferredPrompt && activeTab === 'chat' && (
        <div className="fixed bottom-28 left-4 right-4 bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-2xl z-[60] animate-bounce">
          <span className="text-xs font-bold">Install Fidel AI on your screen?</span>
          <button onClick={handleInstallClick} className="bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-black">Install Now</button>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100 safe-pb pt-4 flex justify-around items-center z-50">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-1.5 transition-all w-1/2 ${activeTab === 'chat' ? 'text-blue-600' : 'text-slate-400 opacity-60'}`}
        >
          <div className={`p-1 rounded-xl transition-all ${activeTab === 'chat' ? 'bg-blue-50' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill={activeTab === 'chat' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-[11px] font-black uppercase tracking-tight">ውይይት (Chat)</span>
        </button>

        <button 
          onClick={() => setActiveTab('wallet')}
          className={`flex flex-col items-center gap-1.5 transition-all w-1/2 relative ${activeTab === 'wallet' ? 'text-blue-600' : 'text-slate-400 opacity-60'}`}
        >
          <div className={`p-1 rounded-xl transition-all ${activeTab === 'wallet' ? 'bg-blue-50' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill={activeTab === 'wallet' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-[11px] font-black uppercase tracking-tight">ሂሳብ (Wallet)</span>
          {wallet.pendingDeposits > 0 && (
             <span className="absolute top-0 right-[35%] bg-amber-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white">
               {wallet.pendingDeposits}
             </span>
          )}
        </button>
      </nav>
    </Layout>
  );
};

export default App;
