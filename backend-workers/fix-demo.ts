import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.dev.vars') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in .dev.vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDemoAccount() {
  console.log("Mencari akun pengguna demo (08123456789)...");
  
  // Find the user with phone 08123456789
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, business_id')
    .eq('phone', '08123456789')
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error("User demo tidak ditemukan atau terjadi error:", userError?.message);
    return;
  }

  const demoUserId = users[0].id;
  const demoBusinessId = users[0].business_id;
  console.log("User demo ditemukan. ID:", demoUserId, "Business ID:", demoBusinessId);

  if (!demoBusinessId) {
    console.error("User demo tidak memiliki business_id.");
    return;
  }

  // Update the business to is_demo = true
  const { error: updateError } = await supabase
    .from('businesses')
    .update({ is_demo: true })
    .eq('id', demoBusinessId);

  if (updateError) {
    console.error("Gagal mengupdate is_demo:", updateError.message);
  } else {
    console.log("✅ BERHASIL: is_demo telah di-set menjadi true untuk bisnis demo asli!");
  }
}

fixDemoAccount();
