// Quick setup verification script
// Run with: node scripts/verify-setup.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Railway Police Portal Setup...\n');

let hasErrors = false;

// Check .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found');
  console.log('   Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY\n');
  hasErrors = true;
} else {
  console.log('✅ .env.local file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('NEXT_PUBLIC_SUPABASE_URL')) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
    hasErrors = true;
  } else {
    console.log('✅ NEXT_PUBLIC_SUPABASE_URL found');
  }
  if (!envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local');
    hasErrors = true;
  } else {
    console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY found');
  }
}

// Check package.json
const packagePath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packagePath)) {
  console.log('❌ package.json not found');
  hasErrors = true;
} else {
  console.log('✅ package.json exists');
}

// Check node_modules
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('❌ node_modules not found');
  console.log('   Run: npm install\n');
  hasErrors = true;
} else {
  console.log('✅ node_modules exists');
}

// Check key files
const keyFiles = [
  'app/(auth)/login/page.tsx',
  'lib/auth.ts',
  'lib/supabase/client.ts',
  'middleware.ts',
  'supabase-setup.sql'
];

console.log('\n📁 Checking key files:');
keyFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    hasErrors = true;
  }
});

console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Setup incomplete. Please fix the errors above.');
  process.exit(1);
} else {
  console.log('✅ Setup looks good!');
  console.log('\nNext steps:');
  console.log('1. Run: npm install (if not done)');
  console.log('2. Set up Supabase database (run supabase-setup.sql)');
  console.log('3. Create test user in Supabase Auth');
  console.log('4. Link user in users table (see SETUP.md)');
  console.log('5. Run: npm run dev');
  process.exit(0);
}


