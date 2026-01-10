
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { VoiceInterface } from './components/VoiceInterface';
import { Wallet } from './components/Wallet';
import { AdminPanel } from './components/AdminPanel';
import { Registration } from './components/Registration';
import { Logo } from './components/Logo';
import { UserWallet, DepositRecord, UserProfile } from './types';
import { TOKEN_TO_ETB_RATE, ADMIN_PASSWORD } from './constants';
import { api } from './services/apiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'wallet' | 'admin' | 'login'>('chat');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<UserWallet>({ balanceETB: 5.00, pendingDeposits: 0 });
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [totalLifetimeTokens, setTotalLifetimeTokens] = useState<number>(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        await api.init();
        const storedUser = await api.getUser();
        
        if (storedUser) {
          setUserProfile(storedUser);
          const [storedWallet, storedDeposits, tokens] = await Promise.all([
            api.getWallet(),
            api.getDeposits(),
            api.getTotalTokens()
          ]);
          setWallet(storedWallet);
          setDeposits(storedDeposits);
          setTotalLifetimeTokens(tokens);
        }
      } catch (error) {
        console.error("Database connection failed", error);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadData();

    if (window.location.hash === '#adminlaz') {
      setActiveTab('login');
    }
  }, []);

  const handleRegister = async (name: string, password: string, grade: string) => {
    setIsSyncing(true);
    try {
      const result = await api.registerOrLogin(name, password, grade);
      setUserProfile(result);
      const [w, d] = await Promise.all([api.getWallet(), api.getDeposits()]);
      setWallet(w);
      setDeposits(d);
    } catch (err: any) {
      console.error("Auth failed", err);
      alert(`Registration error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTokenUsage = async (tokens: number) => {
    const cost = tokens * TOKEN_TO_ETB_RATE;
    const newTotal = totalLifetimeTokens + tokens;
    const newBalance = Math.max(0, wallet.balanceETB - cost);
    const newWallet = { ...wallet, balanceETB: newBalance };

    setTotalLifetimeTokens(newTotal);
    setWallet(newWallet);

    api.setTotalTokens(newTotal);
    api.updateWallet(newWallet);
  };

  const handleAddDeposit = async (amount: number, screenshot: File) => {
    setIsSyncing(true);
    try {
      // Production Grade: Upload to Supabase Storage, not as Base64 in DB
      const publicUrl = await api.uploadScreenshot(screenshot);
      
      const newDeposit: DepositRecord = {
        id: Math.random().toString(36).substr(2, 9),
        amount,
        timestamp: new Date().toISOString(),
        status: 'pending',
        screenshotUrl: publicUrl
      };

      const newWallet = {
        ...wallet,
        pendingDeposits: wallet.pendingDeposits + 1
      };

      await api.addDeposit(newDeposit);
      await api.updateWallet(newWallet);

      setDeposits(prev => [newDeposit, ...prev]);
      setWallet(newWallet);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const approveDeposit = async (id: string) => {
    setIsSyncing(true);
    const deposit = deposits.find(d => d.id === id);
    if (!deposit) return;

    const updatedDeposit: DepositRecord = { ...deposit, status: 'approved' };
    const newWallet = {
      balanceETB: wallet.balanceETB + deposit.amount,
      pendingDeposits: Math.max(0, wallet.pendingDeposits - 1)
    };

    await api.updateDeposit(updatedDeposit);
    await api.updateWallet(newWallet);

    setDeposits(prev => prev.map(d => d.id === id ? updatedDeposit : d));
    setWallet(newWallet);
    setIsSyncing(false);
  };

  const rejectDeposit = async (id: string) => {
    setIsSyncing(true);
    const deposit = deposits.find(d => d.id === id);
    if (!deposit) return;

    const updatedDeposit: DepositRecord = { ...deposit, status: 'rejected' };
    const newWallet = {
      ...wallet,
      pendingDeposits: Math.max(0, wallet.pendingDeposits - 1)
    };

    await api.updateDeposit(updatedDeposit);
    await api.updateWallet(newWallet);

    setDeposits(prev => prev.map(d => d.id === id ? updatedDeposit : d));
    setWallet(newWallet);
    setIsSyncing(false);
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

  if (!isDataLoaded) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white space-y-6">
        <Logo size="lg" className="animate-pulse" />
        <div className="flex flex-col items-center gap-2">
           <div className="w-12 h-1 border-2 border-emerald-100 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-600 w-1/2 animate-[loading_1.5s_infinite_linear]" />
           </div>
           <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Connecting Engine...</span>
        </div>
      </div>
    );
  }

  if (!userProfile && activeTab !== 'login') {
    return <Registration onComplete={handleRegister} />;
  }

  if (activeTab === 'login') {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a192f] p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-500 rounded-full blur-[120px]" />
           <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-amber-500 rounded-full blur-[120px]" />
        </div>
        <form onSubmit={handleLogin} className="glass-panel p-10 rounded-[3.5rem] w-full max-w-sm space-y-8 relative z-10 shadow-2xl">
          <div className="text-center">
            <Logo size="lg" className="mx-auto mb-6" />
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight text-black">Admin Gate</h2>
          </div>
          <input 
            type="password" 
            placeholder="Security Pin" 
            className="w-full p-6 bg-slate-100/50 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/20 text-center font-bold tracking-widest text-lg text-black"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="w-full py-5 bg-emerald-900 text-emerald-50 rounded-2xl font-black text-lg shadow-xl active:scale-[0.98] transition-all">Authorize</button>
          <button type="button" onClick={() => setActiveTab('chat')} className="w-full text-slate-400 font-bold text-sm">Cancel</button>
        </form>
      </div>
    );
  }

  if (activeTab === 'admin' && isAdminLoggedIn) {
    return (
      <AdminPanel 
        deposits={deposits} 
        totalTokens={totalLifetimeTokens}
        onApprove={approveDeposit} 
        onReject={rejectDeposit} 
        onLogout={() => { setIsAdminLoggedIn(false); setActiveTab('chat'); window.location.hash = ''; }} 
      />
    );
  }

  return (
    <Layout>
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-100/30 px-6 safe-pt pb-5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">ፊደል AI</h1>
              <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-600'}`} />
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">{userProfile?.grade}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{userProfile?.full_name?.split(' ')[0]}</span>
            </div>
          </div>
        </div>
        
        <div onClick={() => setActiveTab('wallet')} className="cursor-pointer active:scale-95 transition-all">
          <div className="bg-slate-900 px-4 py-2 rounded-[1.25rem] shadow-lg border border-slate-800 flex items-center gap-2">
             <span className="text-sm font-black text-white">{wallet.balanceETB.toFixed(2)}</span>
             <span className="text-[10px] font-black text-amber-500 uppercase">ETB</span>
          </div>
        </div>
      </header>

      <div className="h-full pb-32">
        {activeTab === 'chat' ? (
          <VoiceInterface onTokenUsed={handleTokenUsage} balance={wallet.balanceETB} grade={userProfile?.grade || 'Grade 1'} />
        ) : (
          <Wallet wallet={wallet} deposits={deposits} onAddDeposit={handleAddDeposit} userName={userProfile?.full_name || 'Student'} />
        )}
      </div>

      <nav className="fixed bottom-8 left-8 right-8 h-20 glass-panel rounded-[2.5rem] border border-white/50 shadow-2xl flex justify-around items-center z-50 px-6">
        <button onClick={() => setActiveTab('chat')} className={`relative flex flex-col items-center gap-1 transition-all duration-300 w-1/2 ${activeTab === 'chat' ? 'text-emerald-700' : 'text-slate-400'}`}>
          {activeTab === 'chat' && <div className="absolute -top-3 w-12 h-1 bg-emerald-700 rounded-full" />}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill={activeTab === 'chat' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-[0.15em]">Chat</span>
        </button>

        <button onClick={() => setActiveTab('wallet')} className={`relative flex flex-col items-center gap-1 transition-all duration-300 w-1/2 ${activeTab === 'wallet' ? 'text-amber-600' : 'text-slate-400'}`}>
          {activeTab === 'wallet' && <div className="absolute -top-3 w-12 h-1 bg-amber-600 rounded-full" />}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill={activeTab === 'wallet' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {wallet.pendingDeposits > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black animate-pulse border border-white">{wallet.pendingDeposits}</span>}
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.15em]">Wallet</span>
        </button>
      </nav>
    </Layout>
  );
};

export default App;
