import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'https://fbbjdxgxcoinnpeogepy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiYmpkeGd4Y29pbm5wZW9nZXB5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzM1NzM1MywiZXhwIjoyMDYyOTMzMzUzfQ.lcVWFe8E9y13SSX-wHt0iv-Tz1-X3pDYCBGxLcp1g18',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export { supabaseAdmin }; 