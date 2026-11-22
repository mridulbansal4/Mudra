export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  MUDRA_ESCROW_VPA: process.env.EXPO_PUBLIC_MUDRA_ESCROW_VPA ?? '',
  MUDRA_ESCROW_NAME: process.env.EXPO_PUBLIC_MUDRA_ESCROW_NAME ?? 'Mudra Escrow',
  // Mudra deal engine that issues Nexconn access tokens (POST /api/v1/auth/session).
  MUDRA_API_URL: process.env.EXPO_PUBLIC_MUDRA_API_URL || 'https://mudra.duckdns.org',
} as const;
