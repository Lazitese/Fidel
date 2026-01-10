
export interface UserProfile {
  id: string;
  full_name: string;
  grade: string;
  role: 'student' | 'admin';
}

export interface TokenUsage {
  totalTokens: number;
  totalCostETB: number;
}

export interface UserWallet {
  balanceETB: number;
  pendingDeposits: number;
  totalTokensUsed?: number;
}

export interface UserStats extends UserProfile {
  balanceETB: number;
  pendingDeposits: number;
  totalTokensUsed: number;
  totalDeposited: number;
}

export interface DepositRecord {
  id: string;
  amount: number;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  screenshotUrl: string;
  userId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
