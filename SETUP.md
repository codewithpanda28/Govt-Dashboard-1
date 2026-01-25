# Setup Guide - Railway Police Data Entry Portal

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the `supabase-setup.sql` script
3. Create a storage bucket:
   - Go to Storage > Create Bucket
   - Name: `documents`
   - Public: Yes
   - Allowed MIME types: `image/jpeg`, `image/png`, `application/pdf`
   - Max file size: 5MB

### 3. Configure Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get these values from:
- Supabase Dashboard > Settings > API
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key

### 4. Create Test User

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User" > "Create new user"
3. Email: `officer1@railpolice.in`
4. Password: `Officer@123`
5. Auto Confirm User: Yes
6. Click "Create User"

7. Go to SQL Editor and run:
```sql
INSERT INTO users (auth_id, employee_id, email, mobile, full_name, designation, role, police_station_id, railway_district_id, is_first_login)
SELECT id, 'EMP001', 'officer1@railpolice.in', '9876543210', 'Officer Rajesh Kumar', 'SHO', 'station_officer', 1, 1, true
FROM auth.users WHERE email = 'officer1@railpolice.in';
```

**Important:** Set `is_first_login = true` so user must change password on first login.

### 5. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 6. Login

- Email: `officer1@railpolice.in`
- Password: `Officer@123`

You'll be prompted to change your password on first login.

## Troubleshooting

### Login Issues

**Most Common Problem:** User exists in Auth but not in `users` table

**Quick Fix:**
1. Verify user exists: Go to Supabase Dashboard > Authentication > Users
2. Link the user by running the SQL above
3. Verify user is active: `SELECT * FROM users WHERE email = 'officer1@railpolice.in';`
4. Check `is_active = true` and `role` is `station_officer` or `data_operator`

**See TROUBLESHOOTING.md for detailed solutions**

### RLS Policy Errors

If you get permission errors, check:
1. RLS policies are enabled in Supabase
2. User's `auth_id` matches `auth.users.id`
3. User has `police_station_id` set

### Storage Upload Errors

1. Check bucket exists and is public
2. Verify MIME types are allowed
3. Check file size limits

### Authentication Issues

1. Verify user exists in `auth.users`
2. Check user is linked in `users` table
3. Verify role is `station_officer` or `data_operator`
4. Check `.env.local` has correct Supabase credentials
5. Restart dev server after changing `.env.local`

## Production Deployment

1. Build the project:
```bash
npm run build
```

2. Set environment variables in your hosting platform
3. Deploy to Vercel, Railway, or your preferred platform

## Support

For issues, check:
- Supabase logs in Dashboard
- Browser console for errors
- Network tab for API errors

#