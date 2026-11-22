import { ENV } from './env';

export const BRAND = {
  name: 'mudra',
  display: 'Mudra',
  escrowVpa: ENV.MUDRA_ESCROW_VPA || 'mudra.escrow@upi',
  escrowName: ENV.MUDRA_ESCROW_NAME || 'Mudra Escrow',
} as const;
