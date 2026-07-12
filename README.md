# CodeNotebook

A Jupyter-style notebook in the browser that runs **Python, JavaScript, C++ and Java**.
Each notebook gets its own kernel, so variables persist from cell to cell.

- `python/backend` — Express API. Executes code in Docker containers, stores notebooks in Supabase.
- `python/frontend` — Next.js + MUI UI.

---

## Prerequisites

| | |
|---|---|
| Node.js | 20+ |
| Docker Desktop | running — every cell executes in a container |
| Supabase account | free tier is fine |

---

## 1. Create a Supabase project

1. Go to <https://supabase.com/dashboard> and click **New project**.
2. Give it a name, set a database password (you won't need it for this app), pick a region, and create it. It takes a minute or two to provision.

## 2. Get your API credentials

In the dashboard: **Project Settings → API keys**.

You need two values:

- **Project URL** — looks like `https://abcdefghijk.supabase.co`
- **Publishable / anon key** — either the new `sb_publishable_…` key or the legacy `anon public` JWT. Both work.

> The anon key is *designed* to be public — it ships in the frontend bundle. It is not a secret.
> What actually protects your data is row level security, which step 4 sets up. **Never** put the
> `service_role` / secret key in this project.

## 3. Fill in the environment files

**`python/backend/.env`** (copy from `.env.example`):

```ini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-publishable-or-anon-key
ALLOWED_ORIGINS=http://localhost:3000
PORT=5000
EXEC_TIMEOUT_MS=60000
```

**`python/frontend/.env.local`**:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

Both files use the *same* URL and key. The frontend uses them to sign users in; the backend uses
them to verify the resulting token and to talk to the database as that user.

## 4. Create the tables

Open **SQL Editor → New query** in the Supabase dashboard, paste the whole of
[`python/backend/schema.sql`](python/backend/schema.sql), and run it.

This creates the `notebooks` and `cells` tables and — importantly — enables **row level security**
with policies that restrict every row to the user who owns it. Without this step the app still runs,
but anyone holding the (public) anon key could read every user's notebooks.

The script is safe to re-run.

## 5. Turn off email confirmation (development only)

By default Supabase emails a confirmation link on sign-up, so a new account can't sign in until the
link is clicked. For local development that's just friction:

**Authentication → Sign In / Providers → Email → turn off "Confirm email".**

Leave it **on** for anything you actually deploy.

## 6. Pre-pull the container images

Skippable, but the first run of each language would otherwise stall for a few hundred MB of download
and look like a hang:

```bash
cd python/backend
npm run pull:images
```

## 7. Run it

```bash
# terminal 1
cd python/backend
npm install
npm run dev          # http://localhost:5000

# terminal 2
cd python/frontend
npm install
npm run dev          # http://localhost:3000
```

Open <http://localhost:3000>, create an account, and you should land on an empty notebook.

**Sanity check:** type `x = 21` in the first cell and press `Shift+Enter`, then `print(x * 2)` in the
next one. If it prints `42`, the kernel, the container, the API and the database round-trip are all
working.

---

## Troubleshooting

**`Cannot reach the server at http://localhost:5000`**
The backend isn't running, or `ALLOWED_ORIGINS` doesn't include `http://localhost:3000`.

**`Could not start the python kernel: … Is Docker running?`**
Docker Desktop isn't up. Start it and re-run the cell — no need to restart the backend.

**`getaddrinfo ENOTFOUND <ref>.supabase.co`**
The project in your `.env` doesn't exist any more (deleted, or the URL is wrong). Create a new one
and redo steps 2–4.

**Sign-up appears to work but sign-in says "Invalid login credentials"**
Email confirmation is on and the address hasn't been confirmed. See step 5.

**Cells run but nothing is saved between reloads**
The tables don't exist, or RLS is on with no policies. Re-run `schema.sql`.

---

## Keyboard shortcuts

Press **H** in the app for the full list. The essentials:

| | |
|---|---|
| `Shift+Enter` | run cell, select the next |
| `Ctrl+Enter` | run cell, stay |
| `Alt+Enter` | run cell, insert one below |
| `Esc` / `Enter` | leave / enter edit mode |
| `A` / `B` | insert cell above / below |
| `M` / `Y` | to markdown / to code |
| `D,D` | delete cell (`Z` undoes it) |
| `0,0` | restart kernel |

## Notes on execution

- **Python and JavaScript** keep a long-lived container per notebook, so state persists across cells.
  Python cells also accept `!shell commands` (e.g. `!pip install numpy`).
- **C++ and Java** compile and run fresh each time — they have no persistent state, same as running
  a file. The Java class may be named anything; the class name is read from your source.
- Containers are capped at 512 MB / 1 CPU, cells time out after 60s (`EXEC_TIMEOUT_MS`), and idle
  kernels are shut down after 30 minutes.
