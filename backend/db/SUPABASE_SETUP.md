# Supabase Setup Guide for Reflectra

This guide will help you set up Supabase as the database backend for Reflectra.

## Prerequisites

- A Supabase account (sign up at [https://supabase.com](https://supabase.com))
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details:
   - **Name**: Reflectra (or any name you prefer)
   - **Database Password**: Choose a strong password
   - **Region**: Select the region closest to you
4. Click "Create new project" and wait for it to initialize (usually takes 1-2 minutes)

## Step 2: Run the Database Migration

1. In your Supabase dashboard, go to the **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `backend/db/supabase-migrations/001_initial_schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the migration
6. You should see a success message indicating that all tables were created

## Step 3: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** (left sidebar)
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL**: This is your `SUPABASE_URL`
   - **anon/public key**: This is your `SUPABASE_KEY`

## Step 4: Configure Environment Variables

1. Open `backend/.env`
2. Replace the placeholder values with your actual Supabase credentials:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-public-key-here
```

## Step 5: Verify the Setup

1. Start your backend server:
```bash
cd backend
npm run dev
```

2. Check the console output. You should see:
```
Database connection established successfully
```

3. Test the API endpoints:
```bash
# Get all categories (should return the 8 default categories)
curl http://localhost:3000/api/categories

# Create a test session
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","title":"Test","duration":60000,"timestamp":1234567890000}'
```

## Database Schema

The migration creates 4 main tables:

### 1. categories
Stores wellness categories for classifying browsing sessions
- Default categories: Focused Work, Learning, Research, Social Connection, Relaxation, Mindless Scroll, Communication, Uncategorized

### 2. sessions
Stores individual browsing sessions with URL, title, duration, and timestamp
- Foreign key relationship to categories

### 3. wellness_scores
Stores daily wellness score calculations
- Tracks focus time, learning time, rest time, social time, and mindless time

### 4. reflections
Stores AI-generated reflection chat history
- Stores user queries, AI responses, and context data

## Row Level Security (RLS)

By default, Supabase enables Row Level Security. For development, you can disable it:

1. Go to **Authentication** > **Policies** in your Supabase dashboard
2. For each table, you can either:
   - **Option A**: Disable RLS (simpler for development, less secure)
   - **Option B**: Create policies that allow all operations (more secure)

### Option A: Disable RLS (Development Only)

Run this SQL in the SQL Editor:
```sql
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE reflections DISABLE ROW LEVEL SECURITY;
```

### Option B: Create Permissive Policies (Recommended)

Run this SQL in the SQL Editor:
```sql
-- Categories policies
CREATE POLICY "Enable all operations for categories" ON categories
  FOR ALL USING (true) WITH CHECK (true);

-- Sessions policies
CREATE POLICY "Enable all operations for sessions" ON sessions
  FOR ALL USING (true) WITH CHECK (true);

-- Wellness scores policies
CREATE POLICY "Enable all operations for wellness_scores" ON wellness_scores
  FOR ALL USING (true) WITH CHECK (true);

-- Reflections policies
CREATE POLICY "Enable all operations for reflections" ON reflections
  FOR ALL USING (true) WITH CHECK (true);
```

## Troubleshooting

### Error: "Missing Supabase credentials"
- Make sure you've added `SUPABASE_URL` and `SUPABASE_KEY` to your `.env` file
- Restart your server after updating the `.env` file

### Error: "relation does not exist"
- You need to run the migration SQL file in the Supabase SQL Editor
- Check that all tables were created successfully

### Error: "new row violates row level security policy"
- You need to either disable RLS or create policies (see above)

### Connection Issues
- Verify your `SUPABASE_URL` is correct
- Make sure you're using the `anon/public` key, not the `service_role` key
- Check that your Supabase project is running (not paused)

## Migration from SQLite

If you have existing data in the SQLite database (`backend/data/mindtime.db`), you can:

1. **Manual Export/Import**: Use a tool like [DB Browser for SQLite](https://sqlitebrowser.org/) to export your data as CSV, then import into Supabase
2. **Fresh Start**: Simply start fresh with the new Supabase database

The old SQLite database file is no longer used by the application, but it's kept as a backup.

## Next Steps

Once your database is set up:
- The backend will automatically connect to Supabase on startup
- All API endpoints will work with the cloud database
- Data will be synchronized across all devices accessing the same Supabase project
- You can view and query your data directly in the Supabase dashboard

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview)
