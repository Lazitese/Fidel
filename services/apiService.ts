
import { UserWallet, DepositRecord, UserProfile } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * FIDEL AI - DATABASE REPAIR SCRIPT
 * -----------------------------------------------------------------------------
 * RUN THIS IN SUPABASE SQL EDITOR:
 * 
 * ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade text NOT NULL DEFAULT 'Grade 1';
 */

const SUPABASE_URL = 'https://yrdxmexonbzhylaxibut.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZHhtZXhvbmJ6aHlsYXhpYnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDkyMTYsImV4cCI6MjA4MzU4NTIxNn0.d9ZHUwbMGKfyL0le4ulwXTHHnZbRRsX-3lzW9z0LxY4';

const DB_NAME = 'FidelAIDatabase_v4';
const DB_VERSION = 1;
const STORES = {
  USER: 'user',
  WALLET: 'wallet',
  DEPOSITS: 'deposits',
  USAGE: 'usage'
};

class ApiService {
  private db: IDBDatabase | null = null;
  private supabase: SupabaseClient | null = null;
  private currentUserId: string | null = null;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        Object.values(STORES).forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, store === STORES.DEPOSITS ? { keyPath: 'id' } : undefined);
          }
        });
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async localAction<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = action(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async registerOrLogin(name: string, password: string, grade?: string): Promise<UserProfile> {
    if (!this.supabase) throw new Error("Supabase client not initialized");

    try {
      const { data: existingUser, error: fetchError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('full_name', name)
        .maybeSingle();

      if (fetchError) {
        if (fetchError.message.includes('column "grade" does not exist')) {
          throw new Error("የዳታቤዝ ስህተት፡ እባክዎን የ Supabase SQL ስክሪፕቱን ያሂዱ። (Database error: Please run the SQL script to add the 'grade' column).");
        }
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (existingUser) {
        if (existingUser.password !== password) {
          throw new Error("የተሳሳተ የይለፍ ቃል! (Incorrect password)");
        }
        this.currentUserId = existingUser.id;
        const profile: UserProfile = {
          id: existingUser.id,
          full_name: existingUser.full_name,
          grade: existingUser.grade || 'Grade 1',
          role: existingUser.role as 'student' | 'admin' || 'student'
        };
        await this.localAction(STORES.USER, 'readwrite', (s) => s.put(profile, 'current_user'));
        return profile;
      }

      // If user doesn't exist, we must be in registration mode
      if (!grade) {
        throw new Error("ተጠቃሚው አልተገኘም! እባክዎን መጀመሪያ ይመዝገቡ። (User not found! Please register first.)");
      }

      const { data: newUser, error: insertError } = await this.supabase
        .from('profiles')
        .insert([{ full_name: name, password: password, grade: grade }])
        .select()
        .single();

      if (insertError) {
        if (insertError.message.includes('column "grade" does not exist')) {
          throw new Error("የዳታቤዝ ስህተት፡ እባክዎን የ Supabase SQL ስክሪፕቱን ያሂዱ። (Database error: Please run the SQL script to add the 'grade' column).");
        }
        throw new Error(`Registration failed: ${insertError.message}`);
      }

      await this.supabase.from('wallets').insert([{ id: newUser.id, balance_etb: 5.00, pending_deposits: 0 }]);

      this.currentUserId = newUser.id;
      const profile: UserProfile = {
        id: newUser.id,
        full_name: newUser.full_name,
        grade: newUser.grade,
        role: newUser.role as 'student' | 'admin' || 'student'
      };
      await this.localAction(STORES.USER, 'readwrite', (s) => s.put(profile, 'current_user'));
      return profile;
    } catch (e: any) {
      console.error("Auth process error:", e);
      throw e;
    }
  }

  async uploadScreenshot(file: File): Promise<string> {
    if (!this.supabase) throw new Error("Supabase client not initialized");
    const fileName = `${this.currentUserId}/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const { data, error } = await this.supabase.storage
      .from('deposits')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) throw new Error(`Upload failed: ${error.message}. Make sure you created a public bucket named 'deposits' in Supabase.`);

    const { data: urlData } = this.supabase.storage.from('deposits').getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  async getUser(): Promise<UserProfile | null> {
    const user = await this.localAction<UserProfile>(STORES.USER, 'readonly', (s) => s.get('current_user'));
    if (user && !this.currentUserId) this.currentUserId = user.id;
    return user;
  }

  async getWallet(): Promise<UserWallet> {
    if (this.supabase && this.currentUserId) {
      const { data } = await this.supabase.from('wallets').select('*').eq('id', this.currentUserId).maybeSingle();
      if (data) {
        const wallet = { balanceETB: data.balance_etb, pendingDeposits: data.pending_deposits || 0 };
        await this.localAction(STORES.WALLET, 'readwrite', (s) => s.put(wallet, 'main_wallet'));
        return wallet;
      }
    }
    const localWallet = await this.localAction<UserWallet>(STORES.WALLET, 'readonly', (s) => s.get('main_wallet'));
    return localWallet || { balanceETB: 5.00, pendingDeposits: 0 };
  }

  async updateWallet(wallet: UserWallet): Promise<void> {
    await this.localAction(STORES.WALLET, 'readwrite', (s) => s.put(wallet, 'main_wallet'));
    if (this.supabase && this.currentUserId) {
      await this.supabase.from('wallets').upsert({
        id: this.currentUserId,
        balance_etb: wallet.balanceETB,
        pending_deposits: wallet.pendingDeposits
      });
    }
  }

  async getDeposits(): Promise<DepositRecord[]> {
    if (this.supabase && this.currentUserId) {
      const { data } = await this.supabase
        .from('deposits')
        .select('*')
        .eq('profile_id', this.currentUserId)
        .order('created_at', { ascending: false });

      if (data) {
        const mapped = data.map(d => ({
          id: d.id,
          amount: d.amount,
          timestamp: d.created_at,
          status: d.status,
          screenshotUrl: d.screenshot_url,
          userId: d.profile_id
        }));
        return mapped;
      }
    }
    return [];
  }

  async getAllDeposits(): Promise<DepositRecord[]> {
    if (this.supabase) {
      const { data } = await this.supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        return data.map(d => ({
          id: d.id,
          amount: d.amount,
          timestamp: d.created_at,
          status: d.status,
          screenshotUrl: d.screenshot_url,
          userId: d.profile_id
        }));
      }
    }
    return [];
  }

  async addDeposit(deposit: DepositRecord): Promise<void> {
    if (this.supabase && this.currentUserId) {
      const { error } = await this.supabase.from('deposits').insert([{
        id: deposit.id,
        profile_id: this.currentUserId,
        amount: deposit.amount,
        status: deposit.status,
        screenshot_url: deposit.screenshotUrl,
        created_at: deposit.timestamp
      }]);
      if (error) throw error;
    }
  }

  async updateDeposit(deposit: DepositRecord): Promise<void> {
    if (this.supabase) {
      const { error } = await this.supabase.from('deposits').update({ status: deposit.status }).eq('id', deposit.id);
      if (error) throw error;
    }
  }

  async updateUserWallet(userId: string, amountChange: number): Promise<void> {
    if (this.supabase) {
      // Fetch current wallet
      const { data: walletData, error: fetchError } = await this.supabase
        .from('wallets')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const newBalance = (walletData.balance_etb || 0) + amountChange;
      const newPending = Math.max(0, (walletData.pending_deposits || 0) - (amountChange > 0 ? 1 : 0)); // Rough logic: if adding money, assume one pending cleared

      const { error: updateError } = await this.supabase.from('wallets').update({
        balance_etb: newBalance,
        pending_deposits: newPending
      }).eq('id', userId);

      if (updateError) throw updateError;
    }
  }

  async getTotalTokens(): Promise<number> {
    const tokens = await this.localAction<number>(STORES.USAGE, 'readonly', (s) => s.get('lifetime_tokens'));
    return tokens || 0;
  }

  async setTotalTokens(tokens: number): Promise<void> {
    await this.localAction(STORES.USAGE, 'readwrite', (s) => s.put(tokens, 'lifetime_tokens'));

    if (this.supabase && this.currentUserId) {
      const { error } = await this.supabase
        .from('wallets')
        .update({ total_tokens_used: tokens })
        .eq('id', this.currentUserId);
      if (error) console.error("Failed to sync tokens", error);
    }
  }

  getCloudStatus() {
    return "Supabase Cloud Pro";
  }

  async getUsersWithStats(): Promise<import('../types').UserStats[]> {
    if (!this.supabase) return [];

    const [profilesData, walletsData, depositsData] = await Promise.all([
      this.supabase.from('profiles').select('*').order('full_name'),
      this.supabase.from('wallets').select('*'),
      this.supabase.from('deposits').select('*').eq('status', 'approved')
    ]);

    if (profilesData.error) throw profilesData.error;

    const wallets = walletsData.data || [];
    const deposits = depositsData.data || [];

    return (profilesData.data || []).map(profile => {
      const wallet = wallets.find(w => w.id === profile.id);
      const userDeposits = deposits.filter(d => d.profile_id === profile.id);
      const totalDeposited = userDeposits.reduce((sum, d) => sum + d.amount, 0);

      return {
        id: profile.id,
        full_name: profile.full_name,
        grade: profile.grade,
        role: profile.role || 'student',
        balanceETB: wallet?.balance_etb || 0,
        pendingDeposits: wallet?.pending_deposits || 0,
        totalTokensUsed: wallet?.total_tokens_used || 0,
        totalDeposited: totalDeposited
      };
    });
  }

  async getAllUsers(): Promise<UserProfile[]> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return [];
  }

  async updateUser(userId: string, updates: Partial<UserProfile>): Promise<void> {
    if (this.supabase) {
      const { error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      if (error) throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    if (this.supabase) {
      const { error } = await this.supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      if (error) throw error;
    }
  }

  async logout(): Promise<void> {
    this.currentUserId = null;
    await this.localAction(STORES.USER, 'readwrite', (s) => s.delete('current_user'));
    await this.localAction(STORES.WALLET, 'readwrite', (s) => s.delete('main_wallet'));
  }
}

export const api = new ApiService();
