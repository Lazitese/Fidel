
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { VoiceInterface } from './components/VoiceInterface';
import { Wallet } from './components/Wallet';
import { AdminPanel } from './components/AdminPanel';
import { Registration } from './components/Registration';
import { Logo } from './components/Logo';
import { UserWallet, DepositRecord, UserProfile } from './types';
import { TOKEN_TO_ETB_RATE } from './constants';
import { api } from './services/apiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'wallet' | 'admin'>('chat');
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

          let storedDeposits;
          if (storedUser.role === 'admin') {
            storedDeposits = await api.getAllDeposits();
          } else {
            storedDeposits = await api.getDeposits();
          }

          const [storedWallet, tokens] = await Promise.all([
            api.getWallet(),
            api.getTotalTokens()
          ]);
          setWallet(storedWallet);
          setDeposits(storedDeposits);
          setTotalLifetimeTokens(tokens);

          if (storedUser.role === 'admin') {
            setActiveTab('admin');
          }
        }
      } catch (error) {
        console.error("Database connection failed", error);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadData();
  }, []);

  const handleRegister = async (name: string, password: string, grade: string) => {
    setIsSyncing(true);
    try {
      const result = await api.registerOrLogin(name, password, grade);
      setUserProfile(result);
      const w = await api.getWallet();
      setWallet(w);

      let d;
      if (result.role === 'admin') {
        d = await api.getAllDeposits();
        setActiveTab('admin');
      } else {
        d = await api.getDeposits();
        setActiveTab('chat');
      }
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
    await api.updateDeposit(updatedDeposit);

    if (userProfile?.role === 'admin' && deposit.userId) {
      await api.updateUserWallet(deposit.userId, deposit.amount);
    } else {
      const newWallet = {
        balanceETB: wallet.balanceETB + deposit.amount,
        pendingDeposits: Math.max(0, wallet.pendingDeposits - 1)
      };
      await api.updateWallet(newWallet);
      setWallet(newWallet);
    }

    setDeposits(prev => prev.map(d => d.id === id ? updatedDeposit : d));
    setIsSyncing(false);
  };

  const rejectDeposit = async (id: string) => {
    setIsSyncing(true);
    const deposit = deposits.find(d => d.id === id);
    if (!deposit) return;

    const updatedDeposit: DepositRecord = { ...deposit, status: 'rejected' };
    await api.updateDeposit(updatedDeposit);

    if (userProfile?.role !== 'admin') {
      const newWallet = {
        ...wallet,
        pendingDeposits: Math.max(0, wallet.pendingDeposits - 1)
      };
      await api.updateWallet(newWallet);
      setWallet(newWallet);
    }

    setDeposits(prev => prev.map(d => d.id === id ? updatedDeposit : d));
    setIsSyncing(false);
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

  if (!userProfile) {
    return <Registration onComplete={handleRegister} />;
  }

  if (activeTab === 'admin') {
    return (
      <AdminPanel
        deposits={deposits}
        totalTokens={totalLifetimeTokens}
        onApprove={approveDeposit}
        onReject={rejectDeposit}
        onLogout={() => {
          api.logout().then(() => {
            setUserProfile(null);
            setWallet({ balanceETB: 5.00, pendingDeposits: 0 });
            setDeposits([]);
            setActiveTab('chat');
          });
        }}
      />
    );
  }

  return (
    <Layout>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="Fidel AI" className="w-14 h-14 object-contain" />
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-900">{userProfile?.full_name}</span>
              <span className="text-xs font-bold text-emerald-600">{userProfile?.grade}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                if (confirm('ከመለያዎ መውጣት ይፈልጋሉ?')) {
                  await api.logout();
                  setUserProfile(null);
                  setWallet({ balanceETB: 5.00, pendingDeposits: 0 });
                  setDeposits([]);
                  setActiveTab('chat');
                }
              }}
              className="text-xs text-red-500 hover:text-red-600 font-bold uppercase tracking-wider Amharic-font"
            >
              ውጣ
            </button>
            <div onClick={() => setActiveTab('wallet')} className="cursor-pointer active:scale-95 transition-all">
              <div className="bg-slate-900 px-4 py-2 rounded-xl shadow-md flex items-center gap-2">
                <span className="text-base font-black text-white">{wallet.balanceETB.toFixed(2)}</span>
                <span className="text-xs font-black text-amber-500 uppercase Amharic-font">ብር</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="h-full pb-24">
        {activeTab === 'chat' ? (
          <VoiceInterface onTokenUsed={handleTokenUsage} balance={wallet.balanceETB} grade={userProfile?.grade || 'Grade 1'} />
        ) : (
          <Wallet wallet={wallet} deposits={deposits} onAddDeposit={handleAddDeposit} userName={userProfile?.full_name || 'Student'} />
        )}
      </div>

      <nav className="fixed bottom-6 left-6 right-6 h-16 glass-panel rounded-3xl border border-white/50 shadow-2xl flex justify-around items-center z-50 px-4">
        <button onClick={() => setActiveTab('chat')} className={`relative flex flex-col items-center gap-1 transition-all duration-300 w-1/2 py-2 ${activeTab === 'chat' ? 'text-emerald-700' : 'text-slate-400'}`}>
          {activeTab === 'chat' && <div className="absolute top-0 w-8 h-0.5 bg-emerald-700 rounded-full" />}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-wider Amharic-font">ውይይት</span>
        </button>

        <button onClick={() => setActiveTab('wallet')} className={`relative flex flex-col items-center gap-1 transition-all duration-300 w-1/2 py-2 ${activeTab === 'wallet' ? 'text-amber-600' : 'text-slate-400'}`}>
          {activeTab === 'wallet' && <div className="absolute top-0 w-8 h-0.5 bg-amber-600 rounded-full" />}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {wallet.pendingDeposits > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-black animate-pulse border border-white">{wallet.pendingDeposits}</span>}
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider Amharic-font">ቦርሳ</span>
        </button>
      </nav>
    </Layout>
  );
};

export default App;
