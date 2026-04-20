# free_stuff@jku — Static Frontend

Static frontend for free stuff discovery at JKU. Hosted on GitHub Pages + Supabase.

## Setup

### 1. Create Supabase Project
- Sign up at [supabase.com](https://supabase.com)
- Create a new project

### 2. Create Database Tables
In Supabase SQL editor, run:

```sql
create table entries (
  entryID bigserial primary key,
  entryType text not null,
  entryDescr text not null,
  entryDate timestamptz not null default now(),
  entryLocX numeric not null,
  entryLocY numeric not null,
  numOfRep integer default 0,
  reportStatus integer default 0
);

create table oldEntries (
  oldEntryID bigserial primary key,
  entryType text not null,
  entryDescr text not null,
  entryDate timestamptz not null,
  entryLocX numeric not null,
  entryLocY numeric not null,
  numOfRep integer default 0,
  reportStatus integer default 0
);
```

### 3. Configure Supabase Settings
- **Disable RLS** (Row Level Security) for now — or later add policies:
  ```sql
  alter table entries enable row level security;
  create policy "Enable read access for all users" on entries for select using (true);
  create policy "Enable insert access for all users" on entries for insert with check (true);
  create policy "Enable update access for all users" on entries for update using (true);
  ```

### 4. Get Credentials
- Project Settings → API → URL and `anon` Key
- Paste into `script.js`:
  ```js
  const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
  const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
  ```

### 5. Live Preview Locally
- Click **Go Live** in VS Code (already configured for `/docs`)
- Opens `http://localhost:5500`

### 6. Deploy to GitHub Pages
- Push to GitHub
- Settings → Pages → Source: Deploy from branch, `/docs` folder
- Site available at `https://username.github.io/repo-name`

## Files
- `index.html` — Map + markers, click to add entry
- `add.html` — Create new entry
- `detail.html` — View and report entry
- `list.html` — All current & old entries
- `about.html` — About page
- `script.js` — API client & page logic
- `styles.css` — Styling
