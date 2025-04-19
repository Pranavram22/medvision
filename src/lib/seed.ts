import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqfqpwqxjxjhxdfzgpgz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxZnFwd3F4anhqaHhkZnpncGd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTA2MjI0MDAsImV4cCI6MjAyNjE5ODQwMH0.JQXT8BK_EBZoXPPPNMBkZMBqGHopHJlJyp-LXuQ5n7Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEFAULT_PASSWORD = 'password123';

const DEFAULT_USERS = [
  {
    email: 'doctor@medvision.com',
    name: 'Dr. John Smith',
    role: 'doctor',
  },
  {
    email: 'patient@medvision.com',
    name: 'Alice Johnson',
    role: 'patient',
  },
  {
    email: 'admin@medvision.com',
    name: 'Admin User',
    role: 'admin',
  },
];

export async function seedDefaultUsers() {
  console.log('Starting to seed default users...');

  for (const user of DEFAULT_USERS) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      if (existingUser) {
        console.log(`User ${user.email} already exists, skipping...`);
        continue;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: DEFAULT_PASSWORD,
        options: {
          data: {
            name: user.name,
            role: user.role,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No user returned from auth signup');
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            created_at: new Date().toISOString(),
          },
        ]);

      if (profileError) {
        throw profileError;
      }

      console.log(`Created default user: ${user.email}`);
    } catch (error) {
      console.error(`Failed to create user ${user.email}:`, error);
    }
  }

  console.log('Finished seeding default users');
} 