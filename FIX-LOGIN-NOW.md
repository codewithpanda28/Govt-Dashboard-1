# 🚨 FIX LOGIN NOW - Step by Step

## The console errors you see are NOT the problem!

Those errors are from browser extensions. The real issue is your user setup.

## ✅ DO THIS RIGHT NOW:

### Step 1: Go to Simple Login Test
**Open this URL:** `http://localhost:3000/simple-login`

This page will:
- Test login directly
- Show you EXACTLY what's wrong
- Give you the SQL to fix it

### Step 2: Click "Test Login Now"
- It will test everything step by step
- You'll see exactly where it fails
- It will give you the SQL fix

### Step 3: Fix the Issues

The page will tell you what SQL to run. Most likely you need to run this:

```sql
-- First, check if user exists in auth
SELECT id, email FROM auth.users WHERE email = 'officer1@railpolice.in';

-- If user exists, link it to users table:
INSERT INTO users (auth_id, employee_id, email, mobile, full_name, designation, role, police_station_id, railway_district_id, is_first_login)
SELECT 
  id, 
  'EMP001', 
  'officer1@railpolice.in', 
  '9876543210', 
  'Officer Rajesh Kumar', 
  'SHO', 
  'station_officer', 
  1, 
  1, 
  true
FROM auth.users 
WHERE email = 'officer1@railpolice.in'
ON CONFLICT (email) DO UPDATE SET
  auth_id = EXCLUDED.auth_id,
  is_active = true,
  role = 'station_officer',
  police_station_id = 1,
  railway_district_id = 1;
```

### Step 4: Verify Everything is Correct

Run this SQL to check:

```sql
SELECT 
  u.email,
  u.role,
  u.is_active,
  u.police_station_id,
  u.auth_id,
  au.id as auth_user_id,
  CASE 
    WHEN u.auth_id = au.id THEN '✅ Match'
    ELSE '❌ MISMATCH'
  END as status
FROM users u
LEFT JOIN auth.users au ON au.email = u.email
WHERE u.email = 'officer1@railpolice.in';
```

You should see:
- ✅ role = 'station_officer'
- ✅ is_active = true
- ✅ police_station_id = 1
- ✅ status = '✅ Match'

### Step 5: Try Login Again

1. Go to: `http://localhost:3000/simple-login`
2. Click "Test Login Now"
3. If all checks pass, it will redirect you automatically!

## 🎯 Most Common Issues:

### Issue 1: User not in users table
**Fix:** Run the INSERT SQL above

### Issue 2: auth_id doesn't match
**Fix:** 
```sql
UPDATE users 
SET auth_id = (SELECT id FROM auth.users WHERE email = 'officer1@railpolice.in')
WHERE email = 'officer1@railpolice.in';
```

### Issue 3: User inactive
**Fix:**
```sql
UPDATE users SET is_active = true WHERE email = 'officer1@railpolice.in';
```

### Issue 4: Wrong role
**Fix:**
```sql
UPDATE users SET role = 'station_officer' WHERE email = 'officer1@railpolice.in';
```

## 📋 Complete Checklist:

- [ ] User exists in Supabase Auth (check Authentication > Users)
- [ ] User exists in users table (run SELECT query above)
- [ ] auth_id matches between auth.users and users table
- [ ] is_active = true
- [ ] role = 'station_officer' or 'data_operator'
- [ ] police_station_id is set (not NULL)
- [ ] .env.local has correct Supabase credentials
- [ ] Dev server is running (npm run dev)

## 🚀 Quick Test:

1. **Go to:** `http://localhost:3000/simple-login`
2. **Click:** "Test Login Now"
3. **Read:** The results - it tells you exactly what to fix
4. **Fix:** Run the SQL it provides
5. **Try again:** Click "Test Login Now" again

The simple-login page will guide you through everything!


