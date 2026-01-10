
import React, { useState, useEffect } from 'react';
import { DepositRecord, UserProfile, UserStats } from '../types';
import { api } from '../services/apiService';

interface AdminPanelProps {
  deposits: DepositRecord[];
  totalTokens: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ deposits, totalTokens, onApprove, onReject, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'deposits'>('dashboard');
  const [users, setUsers] = useState<UserStats[]>([]);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Dashboard Stats
  const pending = deposits.filter(d => d.status === 'pending');
  const processed = deposits.filter(d => d.status !== 'pending');
  const totalRevenue = deposits
    .filter(d => d.status === 'approved')
    .reduce((sum, d) => sum + d.amount, 0);
  const estimatedCostETB = (totalTokens / 1000000) * 9;
  const netProfit = Math.max(0, (totalTokens / 1000000) * 3.86);
  const currentMargin = totalTokens > 0 ? (netProfit / ((totalTokens / 1000000) * 12.86)) * 100 : 30;

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'deposits') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await api.getUsersWithStats();
      setUsers(data);
    } catch (e) {
      alert("Failed to fetch users");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.updateUser(editingUser.id, { full_name: editingUser.full_name, grade: editingUser.grade });
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, full_name: editingUser.full_name, grade: editingUser.grade } : u));
      setEditingUser(null);
    } catch (e) {
      alert("Failed to update user");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure? This will delete the user and their wallet.")) return;
    try {
      await api.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e) {
      alert("Failed to delete user");
    }
  };

  const getUserNameById = (userId?: string) => {
    if (!userId) return 'Unknown';
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Unknown User';
  };

  return (

    <div className="p-4 md:p-8 bg-slate-50 min-h-screen pb-32">
      <header className="flex justify-between items-center mb-6 md:mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Admin Console</h2>
          <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Fidel Engine Management</p>
        </div>
        <div className="flex gap-4">
          <div className="hidden md:flex bg-white rounded-2xl p-1 shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Users ({users.length > 0 ? users.length : '...'})
            </button>
            <button
              onClick={() => setActiveTab('deposits')}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'deposits' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Deposits ({deposits.length})
            </button>
          </div>
          <button onClick={onLogout} className="bg-white border border-slate-200 px-4 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm hover:bg-slate-50">Logout</button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-6 left-4 right-4 h-16 bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl flex justify-around items-center z-50 md:hidden px-2">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'dashboard' ? 'text-slate-900' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-wider">Dash</span>
        </button>
        <button onClick={() => setActiveTab('users')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'users' ? 'text-slate-900' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-wider">Users</span>
        </button>
        <button onClick={() => setActiveTab('deposits')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'deposits' ? 'text-slate-900' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-wider">Deposits</span>
        </button>
      </nav>

      {activeTab === 'dashboard' ? (
        <>
          {/* Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
            <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Revenue</span>
              <div className="text-3xl md:text-4xl font-black mt-2 tracking-tighter">{totalRevenue.toFixed(2)} <span className="text-xs text-emerald-500">ETB</span></div>
              <p className="text-[10px] text-slate-500 mt-4 uppercase font-bold tracking-widest">Approved Deposits</p>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Profit (30%)</span>
              <div className="text-3xl md:text-4xl font-black mt-2 tracking-tighter text-emerald-600">{netProfit.toFixed(2)} <span className="text-xs text-slate-400">ETB</span></div>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-[9px] md:text-[10px] font-black text-white bg-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">{currentMargin.toFixed(1)}% Margin</span>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Usage Volume</span>
              <div className="text-3xl md:text-4xl font-black mt-2 tracking-tighter text-slate-900">{(totalTokens / 1000).toFixed(1)}k</div>
              <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">Tokens Streamed</p>
            </div>
          </div>

          <div className="space-y-10">
            <section>
              <div className="flex items-center justify-between mb-6 px-2 md:px-4">
                <h3 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Pending Verification</h3>
                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 md:px-4 md:py-1.5 rounded-full">{pending.length} Requests</span>
              </div>

              {pending.length === 0 ? (
                <div className="bg-white/40 border border-dashed border-slate-200 py-16 rounded-[3rem] text-center">
                  <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Inbox Clean</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {pending.map(d => (
                    <div key={d.id} className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 md:gap-8">
                      <div className="w-full md:w-48 h-64 md:h-48 rounded-[2rem] overflow-hidden border border-slate-100 cursor-zoom-in group relative shrink-0" onClick={() => window.open(d.screenshotUrl, '_blank')}>
                        <img src={d.screenshotUrl} alt="Telebirr proof" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-2">
                        <div className="space-y-2 md:space-y-1">
                          <div className="text-3xl font-black text-emerald-700 tracking-tighter">{d.amount} ETB</div>
                          <p className="text-xs font-bold text-slate-400">{new Date(d.timestamp).toLocaleString()}</p>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-2 md:mt-4 break-all">ID: {d.id}</p>
                        </div>
                        <div className="flex gap-3 md:gap-4 mt-6 md:mt-8">
                          <button
                            onClick={() => onApprove(d.id)}
                            className="flex-1 bg-slate-900 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm tracking-widest shadow-xl active:scale-95 transition-all"
                          >
                            APPROVE
                          </button>
                          <button
                            onClick={() => onReject(d.id)}
                            className="bg-red-50 text-red-500 px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm tracking-widest active:scale-95 transition-all"
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
              <h3 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-2 md:px-4">Recent History</h3>
              <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                {processed.length === 0 ? (
                  <p className="p-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No processed transactions</p>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {processed.map(d => (
                      <div key={d.id} className="p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex shrink-0 items-center justify-center ${d.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-black text-slate-900 tracking-tight text-lg">{d.amount} ETB</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">{new Date(d.timestamp).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest self-end sm:self-auto ${d.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
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
        </>
      ) : activeTab === 'users' ? (
        <section>
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              {isLoadingUsers ? (
                <div className="p-10 text-center text-slate-400 font-bold text-sm">Loading users...</div>
              ) : (
                <table className="w-full text-left min-w-[800px] md:min-w-0">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Name</th>
                      <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Grade</th>
                      <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Usage</th>
                      <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Deposited</th>
                      <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Balance</th>
                      <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="p-4 md:p-6">
                          <div className="font-bold text-slate-900 text-sm md:text-base">{u.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.role === 'admin' ? 'Administrator' : 'Student'}</div>
                        </td>
                        <td className="p-4 md:p-6 text-xs md:text-sm font-medium text-slate-600">{u.grade}</td>
                        <td className="p-4 md:p-6 text-xs md:text-sm font-black text-slate-700">{(u.totalTokensUsed / 1000).toFixed(1)}k</td>
                        <td className="p-4 md:p-6 text-xs md:text-sm font-medium text-slate-600">{u.totalDeposited.toFixed(2)}</td>
                        <td className="p-4 md:p-6 text-xs md:text-sm font-black text-emerald-600 text-right">{u.balanceETB.toFixed(2)}</td>
                        <td className="p-4 md:p-6">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingUser(u)} className="text-[10px] font-black bg-slate-900 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl">EDIT</button>
                            <button onClick={() => handleDeleteUser(u.id)} className="text-[10px] font-black bg-red-50 text-red-500 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl">DEL</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      ) : activeTab === 'deposits' ? (
        <section>
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px] md:min-w-0">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">User</th>
                    <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Amount</th>
                    <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                    <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                    <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Proof</th>
                    <th className="p-4 md:p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {deposits.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="p-4 md:p-6">
                        <div className="font-bold text-slate-900 text-sm md:text-base">{getUserNameById(d.userId)}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[100px]">{d.userId || 'N/A'}</div>
                      </td>
                      <td className="p-4 md:p-6 text-sm font-black text-emerald-700">{d.amount.toFixed(2)}</td>
                      <td className="p-4 md:p-6">
                        <span className={`text-[8px] md:text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${d.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          d.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-4 md:p-6 text-xs md:text-sm text-slate-600 whitespace-nowrap">{new Date(d.timestamp).toLocaleDateString()}</td>
                      <td className="p-4 md:p-6">
                        <button
                          onClick={() => window.open(d.screenshotUrl, '_blank')}
                          className="text-[10px] font-black bg-slate-100 text-slate-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl hover:bg-slate-200"
                        >
                          VIEW
                        </button>
                      </td>
                      <td className="p-4 md:p-6">
                        {d.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => onApprove(d.id)}
                              className="text-[10px] font-black bg-slate-900 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl"
                            >
                              YES
                            </button>
                            <button
                              onClick={() => onReject(d.id)}
                              className="text-[10px] font-black bg-red-50 text-red-500 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl"
                            >
                              NO
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6">Edit User</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                <input
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Grade</label>
                <select
                  value={editingUser.grade}
                  onChange={(e) => setEditingUser({ ...editingUser, grade: e.target.value })}
                  className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {["KG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 mt-4 pt-4">
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest">Save</button>
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-xs uppercase tracking-widest">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
