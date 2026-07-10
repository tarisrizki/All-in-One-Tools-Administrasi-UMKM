import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
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

async function testCron() {
  console.log("Checking businesses table for is_demo column...");
  const { data, error } = await supabase.from('businesses').select('id, is_demo').limit(1);
  
  if (error) {
    console.error("Error fetching businesses:", error.message);
  } else {
    console.log("Success! Data:", data);
  }
}

testCron();
