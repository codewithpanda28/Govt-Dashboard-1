# Railway Police FIR System - Deployment Guide

## Prerequisites
- Supabase Account (Government Email)
- Vercel Account (for hosting)

## Step 1: Supabase Setup

1. Go to https://supabase.com
2. Create new project:
   - Project Name: Railway Police FIR System
   - Database Password: [Use strong password]
   - Region: Mumbai

3. Run SQL Script:
   - Go to SQL Editor
   - Paste content from `setup-database.sql`
   - Click "Run"

4. Enable Authentication:
   - Go to Authentication → Settings
   - Enable Email Auth
   - Disable Email Confirmations (for internal use)

5. Create Storage Bucket:
   - Go to Storage
   - Create bucket: "documents"
   - Set to "Public"

6. Get API Keys:
   - Go to Settings → API
   - Copy:
     * Project URL
     * Anon (public) key

## Step 2: Deploy Application

### Option A: Vercel (Recommended)

1. Go to https://vercel.com
2. Import Git repository
3. Add Environment Variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Deploy

### Option B: Self-Hosted Server

1. Install Node.js 18+
2. Clone repository
3. Run:
   ```bash
   npm install
   npm run build
   npm start