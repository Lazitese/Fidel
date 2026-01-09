
export interface TokenUsage {
  totalTokens: number;
  totalCostETB: number;
}

export interface UserWallet {
  balanceETB: number;
  pendingDeposits: number;
}

export interface DepositRecord {
  id: string;
  amount: number;
  timestamp: string; // ISO string for persistence
  status: 'pending' | 'approved' | 'rejected';
  screenshotUrl: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
