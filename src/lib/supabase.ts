import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://astkouozumrednfmfrbi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdGtvdW96dW1yZWRuZm1mcmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NjM4NDMsImV4cCI6MjA2NTAzOTg0M30.PHFvshjboXHB6t1LrMrhNZs3z57Xdi3437gC-3mf3E0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 