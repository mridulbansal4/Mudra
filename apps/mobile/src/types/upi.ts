import '@/types';

export type UpiWalletTxStatus = 'completed' | 'unverified' | 'requested';

declare module '@/types' {
  interface WalletTx {
    utr?: string | null;
    upi_id?: string | null;
    status?: UpiWalletTxStatus;
  }

  interface Me {
    upi_id?: string | null;
  }

  interface Deal {
    latest_voucher_hash?: string | null;
  }
}

export interface RecordUpiDepositParams {
  amount_minor: number;
  utr: string;
}

export interface RecordUpiDepositDealParams {
  amount_minor: number;
  utr: string;
  deal_id: string;
  expected_version?: number | null;
  idem?: string | null;
}

export interface WithdrawUpiParams {
  amount_minor: number;
  upi_id: string;
}
