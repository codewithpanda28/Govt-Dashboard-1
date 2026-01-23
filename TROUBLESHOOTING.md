# Troubleshooting Login Issues

## Quick Diagnostic

**First, try the diagnostic page:**
1. Go to: `http://localhost:3000/debug-login`
2. Enter your email
3. Click "Run Diagnostics"
4. Review the results

This will show you exactly what's wrong with your setup.

## Common Login Problems and Solutions

### 1. "Invalid email or password" Error

**Possible Causes:**
- User doesn't exist in Supabase Auth
- Password is incorrect
- User exists in Auth but not in `users` table
- User account is inactive

**Solutions:**

#### Check if user exists in Supabase Auth:
1. Go to Supabase Dashboard > Authentication > Users
2. Look for your email address
3. If not found, create the user first

#### Check if user is linked in `users` table:
Run this SQL in Supabase SQL Editor:
```sql
SELECT * FROM users WHERE email = 'officer1@railpolice.in';
```

If no results, link the user:
```sql
INSERT INTO users (auth_id, employee_id, email, mobile, full_name, designation, role, police_station_id, railway_district_id, is_first_login)
SELECT id, 'EMP001', 'officer1@railpolice.in', '9876543210', 'Officer Rajesh Kumar', 'SHO', 'station_officer', 1, 1, true
FROM auth.users WHERE email = 'officer1@railpolice.in';
```

#### Check if user is active:
```sql
SELECT id, email, is_active, role FROM users WHERE email = 'officer1@railpolice.in';
```

If `is_active` is false, activate:
```sql
UPDATE users SET is_active = true WHERE email = 'officer1@railpolice.in';
```

### 2. "User account not found" Error

This means the user exists in Supabase Auth but not in the `users` table.

**Solution:**
Link the user using the SQL above.

### 3. "You do not have permission" Error

**Possible Causes:**
- User role is not `station_officer` or `data_operator`

**Solution:**
Check and update role:
```sql
SELECT role FROM users WHERE email = 'officer1@railpolice.in';
UPDATE users SET role = 'station_officer' WHERE email = 'officer1@railpolice.in';
```

### 4. Configuration Error (Red Alert Box)

**Possible Causes:**
- Missing environment variables
- Incorrect Supabase URL or key

**Solutions:**

1. Check `.env.local` exists in project root
2. Verify it contains:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```
3. Restart the dev server after adding env variables:
   ```bash
   npm run dev
   ```

### 5. "Session error" or Blank Page

**Possible Causes:**
- Supabase connection issue
- CORS issues
- Network problems

**Solutions:**

1. Check Supabase project is active
2. Verify URL format: `https://xxxxx.supabase.co` (not `https://xxxxx.supabase.co/`)
3. Check browser console for errors
4. Clear browser cache and cookies
5. Try incognito/private mode

### 6. Redirect Loop

**Possible Causes:**
- Middleware conflict
- Session not persisting

**Solutions:**

1. Clear browser cookies for localhost
2. Check browser console for errors
3. Verify Supabase Auth settings allow localhost

### 7. User Created but Can't Login

**Checklist:**

1. ✅ User exists in `auth.users` table
2. ✅ User exists in `users` table with matching `auth_id`
3. ✅ `users.is_active = true`
4. ✅ `users.role` is `station_officer` or `data_operator`
5. ✅ `users.police_station_id` is set (not NULL)
6. ✅ Password is correct

**Quick Fix SQL:**
```sql
-- Check everything at once
SELECT 
  u.id,
  u.email,
  u.role,
  u.is_active,
  u.police_station_id,
  u.is_first_login,
  au.id as auth_user_id,
  CASE 
    WHEN au.id IS NULL THEN '❌ Not in Auth'
    WHEN u.id IS NULL THEN '❌ Not in Users table'
    WHEN u.is_active = false THEN '❌ Account inactive'
    WHEN u.role NOT IN ('station_officer', 'data_operator') THEN '❌ Wrong role'
    WHEN u.police_station_id IS NULL THEN '❌ No police station'
    ELSE '✅ OK'
  END as status
FROM auth.users au
LEFT JOIN users u ON u.auth_id = au.id
WHERE au.email = 'officer1@railpolice.in';
```

## Step-by-Step Setup Verification

### Step 1: Verify Environment Variables
```bash
# In your terminal, check if variables are loaded
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### Step 2: Verify Database Setup
Run this in Supabase SQL Editor:
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'fir_records', 'accused_persons', 'bail_details');
```

### Step 3: Verify Test User
```sql
-- Complete user check
SELECT 
  'Auth User' as source,
  email,
  id as user_id
FROM auth.users 
WHERE email = 'officer1@railpolice.in'

UNION ALL

SELECT 
  'Users Table' as source,
  email,
  id::text as user_id
FROM users 
WHERE email = 'officer1@railpolice.in';
```

### Step 4: Test Connection
Open browser console on login page and run:
```javascript
// Check if Supabase is configured
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')
```

## Still Having Issues?

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for red error messages
   - Copy and check the error

2. **Check Network Tab:**
   - Open DevTools > Network
   - Try to login
   - Look for failed requests (red)
   - Check the response

3. **Check Supabase Logs:**
   - Go to Supabase Dashboard > Logs
   - Look for authentication errors

4. **Verify RLS Policies:**
   ```sql
   -- Check if RLS is enabled
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename = 'users';
   ```

## Quick Reset

If nothing works, reset the test user:

```sql
-- Delete from users table
DELETE FROM users WHERE email = 'officer1@railpolice.in';

-- Delete from auth (if needed)
-- Go to Supabase Dashboard > Authentication > Users > Delete User

-- Recreate user in Auth Dashboard
-- Then run:
INSERT INTO users (auth_id, employee_id, email, mobile, full_name, designation, role, police_station_id, railway_district_id, is_first_login)
SELECT id, 'EMP001', 'officer1@railpolice.in', '9876543210', 'Officer Rajesh Kumar', 'SHO', 'station_officer', 1, 1, true
FROM auth.users WHERE email = 'officer1@railpolice.in';
```

