export const environment = {
  isDevelopment: __DEV__,
  isProduction: !__DEV__,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};

// TODO: Move this to a shared utility package
export const isExpoGo = false; // Will be updated when Constants is available
