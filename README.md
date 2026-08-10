# rTriibe OS

One system for the whole desk: bulk CV extraction, teacher database, LSA placements
(directory, editable profiles, rate calculator, notes, payments), vacancies, pipeline,
schools, and tasks. Next.js + Supabase + Vercel.

Follow the steps below in order. No terminal needed.

---

## 1. Supabase (the database)

1. Go to **supabase.com** → sign in → **New project**. Name it `rtriibe-os`, set a database
   password (save it), pick a region near Dubai (`eu-central-1` or `ap-south-1`), create it.
2. When it's ready: left sidebar → **SQL Editor** → **New query**.
3. Open `supabase/schema.sql` from this project, copy everything, paste it in, click **Run**.
   You should see "Success. No rows returned." That built every table.
4. Left sidebar → **Storage** → **New bucket** → name it exactly `cvs` → tick **Public bucket** → Create.
5. Left sidebar → **Project Settings** → **API**. Copy two things:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key (a long string)

## 2. Import your existing vacancies + pipeline (optional, do it now or later)

In your OLD tracker project: **Table Editor** → open `vacancies` → **Export** → CSV. Same for `pipeline`.
In the NEW project: **Table Editor** → open the matching table → **Insert** → **Import data from CSV**
→ upload the file → map the columns → Import. Everything else starts empty and fills as you work.

## 3. GitHub (host the code)

1. Go to **github.com** → **New repository** → name it `rtriibe-os` → Create (leave it empty).
2. On the new repo page → **uploading an existing file**.
3. Drag in **all** the files and folders from this project (`pages`, `lib`, `styles`, `supabase`,
   `package.json`, `next.config.mjs`, `README.md`). **Do not** upload `node_modules`, `.next`, or `.env.local`.
4. **Commit changes**.

## 4. Vercel (put it online)

1. Go to **vercel.com** → **Add New… → Project** → import your `rtriibe-os` repo.
2. Before deploying, open **Environment Variables** and add these four (name on the left, value on the right):
   - `NEXT_PUBLIC_SUPABASE_URL` → your Project URL from step 1.5
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon public key from step 1.5
   - `NEXT_PUBLIC_APP_PASSWORD` → `rtriibe2025` (or your own)
   - `ANTHROPIC_API_KEY` → your Anthropic API key (the one your current extractor uses)
   > Double-check the URL goes in the URL field and the key in the key field — don't swap them.
3. Click **Deploy**. About a minute later you get a live link. Open it, enter the password, and you're in.

Every time you change the code on GitHub, Vercel redeploys automatically.

---

## Notes
- The app is protected by the shared password (`NEXT_PUBLIC_APP_PASSWORD`). Proper per-user
  logins can be added later.
- The CV extractor model is set in `pages/api/extract.js` (the `MODEL` line) — change it there if needed.
- Original-PDF downloads and the exact-CV text only exist for CVs extracted through this new
  system, so re-extract to populate them.
