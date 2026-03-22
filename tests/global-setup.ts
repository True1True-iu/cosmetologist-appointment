import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/"/g, '');

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';
const TEST_NAME = 'Тест Тестов';

export default async function globalSetup() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: existing } = await supabase.auth.admin.listUsers();
  const user = existing?.users?.find((u: any) => u.email === TEST_EMAIL);

  if (user) {
    console.log(`[setup] Пользователь ${TEST_EMAIL} уже существует (id=${user.id})`);
    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: TEST_NAME },
  });

  if (error) {
    throw new Error(`Не удалось создать тестового пользователя: ${error.message}`);
  }

  await supabase.from('profiles').upsert({
    user_id: data.user.id,
    full_name: TEST_NAME,
    role: 'client',
  });

  console.log(`[setup] Создан тестовый пользователь ${TEST_EMAIL} (id=${data.user.id})`);
}
