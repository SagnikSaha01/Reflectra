# Reflectra Authentication Setup Guide

This guide will walk you through setting up Google authentication through Supabase for the Reflectra application.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Supabase Setup](#supabase-setup)
4. [Google OAuth Setup](#google-oauth-setup)
5. [Database Migration](#database-migration)
6. [Environment Configuration](#environment-configuration)
7. [Testing Authentication](#testing-authentication)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Reflectra now uses Supabase Auth for user authentication with Google OAuth support. This allows:
- Multiple users to use the extension
- Sessions tied to individual user accounts
- Secure authentication across the extension and dashboard
- User-specific data isolation

## Prerequisites

- Node.js 16+ installed
- A Supabase account (free tier works)
- A Google Cloud Console account (for OAuth)
- Chrome browser (for testing the extension)

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the details:
   - **Name**: Reflectra (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for setup to complete

### 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: This is your `SUPABASE_URL`
   - **Project API keys** → **anon public**: This is your `SUPABASE_KEY`

### 3. Enable Row Level Security (RLS)

RLS is automatically enabled by the migration script, but you can verify:

1. Go to **Authentication** → **Policies**
2. Ensure policies exist for `users`, `sessions`, `wellness_scores`, `reflections`, and `categories` tables

## Google OAuth Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Name it "Reflectra" (or your preferred name)

### 2. Enable Google+ API

1. In the Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google+ API" and enable it

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in the required fields:
   - **App name**: Reflectra
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. Add test users (your email) during development
6. Click "Save and Continue"

### 4. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: Reflectra Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3001`
     - Your production domain (if applicable)
   - **Authorized redirect URIs**:
     - `https://<your-project-ref>.supabase.co/auth/v1/callback`
     - `http://localhost:3001/auth/callback`
5. Click **Create**
6. Copy your **Client ID** and **Client Secret**

### 5. Configure Google Provider in Supabase

1. In your Supabase project, go to **Authentication** → **Providers**
2. Find **Google** and click to enable
3. Enter your **Client ID** and **Client Secret** from Google Cloud Console
4. Click **Save**

## Database Migration

### 1. Run the Migration

Run the migration SQL file in your Supabase project:

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `backend/db/supabase-migrations/001_initial_schema.sql`
5. Paste and click **Run**
6. Create another new query
7. Copy the contents of `backend/db/supabase-migrations/002_add_authentication.sql`
8. Paste and click **Run**

### 2. Verify Migration

Check that the following tables exist:

- `public.users`
- `public.categories` (with `user_id` and `is_global` columns)
- `public.sessions` (with `user_id` column)
- `public.wellness_scores` (with `user_id` column)
- `public.reflections` (with `user_id` column)

You can verify in **Database** → **Tables** in the Supabase dashboard.

## Environment Configuration

### 1. Backend Configuration

1. Navigate to `backend/` directory
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Update the `.env` file:
   ```env
   PORT=3000

   # Supabase Configuration
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_KEY=your-supabase-anon-key

   # Google OAuth
   GOOGLE_REDIRECT_URL=http://localhost:3001/auth/callback

   # OpenAI API
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_MODEL=gpt-4o-mini

   # Categorization Settings
   BATCH_CATEGORIZE_INTERVAL=15
   MIN_SESSIONS_FOR_CATEGORIZATION=10
   ```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Dashboard
cd ../dashboard
npm install

# Extension (no dependencies needed)
```

## Testing Authentication

### 1. Start the Backend

```bash
cd backend
npm start
```

The backend should start on `http://localhost:3000`

### 2. Start the Dashboard

```bash
cd dashboard
npm run dev
```

The dashboard should start on `http://localhost:3001`

### 3. Test Dashboard Login

1. Open `http://localhost:3001` in your browser
2. You should be redirected to `/login`
3. Try signing up with email/password or Google OAuth
4. After successful login, you should see the dashboard

### 4. Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. The Reflectra extension should appear

### 5. Test Extension Login

1. Click the Reflectra extension icon
2. Click "Sign in with Google"
3. Complete the OAuth flow
4. You should see your stats in the popup

### 6. Verify Data Isolation

1. Sign in as User A in the extension
2. Browse some websites
3. Check the dashboard - you should see User A's sessions
4. Sign out and sign in as User B
5. User B should NOT see User A's sessions

## Troubleshooting

### Common Issues

#### 1. "Failed to initiate Google login"

**Problem**: Google OAuth configuration is incorrect

**Solutions**:
- Verify your Google Cloud OAuth credentials
- Check that redirect URIs match exactly
- Ensure Google+ API is enabled
- Verify Supabase Google provider is enabled with correct credentials

#### 2. "No authorization code received"

**Problem**: OAuth redirect is failing

**Solutions**:
- Check that `GOOGLE_REDIRECT_URL` in `.env` matches your OAuth redirect URI
- Verify the URL in Supabase Auth settings
- Clear browser cache and try again

#### 3. "Invalid or expired token"

**Problem**: Session token issues

**Solutions**:
- Clear `chrome.storage.local` in the extension
- Clear `localStorage` in the dashboard (DevTools → Application → Local Storage)
- Sign out and sign in again

#### 4. "User not authenticated" in extension console

**Problem**: Extension is not sending auth token

**Solutions**:
- Reload the extension
- Check that you're signed in (click extension icon)
- Verify auth is saved in `chrome.storage.local`

#### 5. Database queries failing with "permission denied"

**Problem**: Row Level Security (RLS) policies not working

**Solutions**:
- Verify RLS policies were created by migration
- Check that `auth.uid()` is being set correctly
- Ensure you're sending the Authorization header with API requests

### Debug Mode

Enable debug logging:

**Backend**: Add to `.env`:
```env
DEBUG=true
NODE_ENV=development
```

**Extension**: Check console logs:
1. Right-click extension icon → "Inspect popup"
2. View Console for errors

**Dashboard**: Open DevTools → Console

### Getting Help

If you encounter issues:

1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review the [Google OAuth documentation](https://developers.google.com/identity/protocols/oauth2)
3. Open an issue in the Reflectra repository

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore` for a reason
2. **Use environment variables** for all sensitive data
3. **Rotate credentials** regularly in production
4. **Use HTTPS** in production (required for OAuth)
5. **Enable 2FA** on your Supabase and Google Cloud accounts
6. **Review RLS policies** to ensure data isolation
7. **Set up rate limiting** for API endpoints in production

## Production Deployment

When deploying to production:

1. Update OAuth redirect URIs to your production domain
2. Update `GOOGLE_REDIRECT_URL` to production URL
3. Use a service role key (not anon key) for backend if needed
4. Enable HTTPS
5. Set up proper CORS policies
6. Consider using Supabase Edge Functions for additional security
7. Monitor authentication logs in Supabase

---

## Next Steps

- Review the [Supabase Row Level Security documentation](https://supabase.com/docs/guides/auth/row-level-security)
- Set up email templates in Supabase for password resets
- Configure additional OAuth providers (GitHub, Apple, etc.)
- Implement refresh token rotation for enhanced security
- Add user profile management features

---

**Last updated**: January 2025
**Version**: 1.0.0
