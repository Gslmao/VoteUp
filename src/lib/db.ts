import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!; // use service role key for admin ops if needed

export const supabase = createClient(supabaseUrl, supabaseKey);