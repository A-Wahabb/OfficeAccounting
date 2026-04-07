import { ContactForm } from "@/modules/contact";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Production-ready Next.js 14 stack
        </h1>
        <p className="max-w-2xl text-neutral-600 dark:text-neutral-400">
          App Router, TypeScript, Supabase, Zod, React Hook Form, TanStack Query,
          ESLint, and Prettier — with server actions, API routes, and auth
          middleware.
        </p>
      </section>
      <ContactForm />
    </div>
  );
}
