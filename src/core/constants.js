export const SUPABASE_URL = 'https://dqiyvfpntkitbjqieklb.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaXl2ZnBudGtpdGJqcWlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDk3MTUsImV4cCI6MjA4MDk4NTcxNX0.4k05eS7EFPm3UYM357_lHhh4oze2_wg-bMNWaRriTeI';

export const ROLES = {
  DEV: 'dev',
  CREATOR: 'creator',
  CONSUMER: 'consumer'
};

export const PERMISSIONS = {
  [ROLES.DEV]: ['macros', 'pix', 'proxies', 'passwords', 'execute'],
  [ROLES.CREATOR]: ['macros', 'pix'],
  [ROLES.CONSUMER]: ['proxies', 'passwords', 'execute']
};

export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  DESKTOP: 'desktop'
};

export const PIX_KEY_TYPES = {
  CPF: 'cpf',
  CNPJ: 'cnpj',
  EMAIL: 'email',
  PHONE: 'phone',
  RANDOM: 'random'
};