# Office Accounting

Next.js 14 (App Router) application with TypeScript, Tailwind CSS, Supabase, Zod, React Hook Form, TanStack Query, ESLint, and Prettier.

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your [Supabase project settings](https://supabase.com/dashboard/project/_/settings/api).

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command            | Description              |
| ------------------ | ------------------------ |
| `npm run dev`      | Development server       |
| `npm run build`    | Production build         |
| `npm run start`    | Start production server  |
| `npm run lint`     | ESLint                   |
| `npm run format`   | Prettier write           |
| `npm run format:check` | Prettier check       |

## Architecture

- **`app/`** — Routes: `(public)/`, `(protected)/`, `api/`, `auth/callback`, server actions under `app/actions/`
- **`components/`** — Shared UI (providers, navigation)
- **`modules/`** — Feature modules (e.g. `modules/contact`)
- **`lib/`** — Env validation, Supabase clients, constants
- **`services/`** — HTTP / external API helpers
- **`hooks/`** — React hooks and query key factories
- **`validators/`** — Zod schemas
- **`store/`** — Client UI state (e.g. sidebar)
- **`types/`** — Shared TypeScript types

Authentication: middleware refreshes the Supabase session and protects `/dashboard`. Configure OAuth redirect URL in Supabase to include `/auth/callback`.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase + Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
