# PACKAGES.md — Curated GitHub Package Recommendations (Next.js 15+ / React 19 / Tailwind v4)

This list is tailored to the spec’s **static-export, local-first** approach (client-only “app” routes, OPFS + WASM SQLite, no server runtime) and the default stack choices already called out in the spec (shadcn/ui, TanStack Query, Zustand, wa-sqlite, etc.).  
Relevant spec notes: Tailwind v4 + `tw-animate-css` + shadcn setup, wa-sqlite + OPFS, TanStack Query v5 + Zustand, and “no accounts in MVP” with optional local app lock.

---

## 1) UI component library (shadcn/ui, Radix, etc.)

### Option A — shadcn/ui (recommended for this spec)
- **Package/Repo:** `shadcn-ui/ui`
- **GitHub:** https://github.com/shadcn-ui/ui
- **Last update:** 2026-01-27
- **Stars:** 105,622
- **Bundle size:** N/A (components are generated into your repo; you control what ships)

**Pros**
- Perfect fit for Tailwind v4 + CSS-variable theming and “copy-paste primitives.”
- You only include what you use (no monolithic runtime UI lib).
- Large ecosystem / lots of Next.js examples.

**Cons**
- You “own” the generated code (upgrades are manual).
- You need some discipline in how you customize components.

**Recommendation**
- **Pick this as your baseline** because it matches your spec’s intended setup and keeps bundle/runtime minimal.

---

### Option B — Radix Primitives (headless, accessible UI building blocks)
- **Package/Repo:** `radix-ui/primitives`
- **GitHub:** https://github.com/radix-ui/primitives
- **Last update:** 2025-12-17
- **Stars:** 8,073
- **Bundle size:** Varies by component  
  - Example (Dialog): `@radix-ui/react-dialog` ≈ **33.2 kB min / 10.3 kB gzip**

**Pros**
- Accessibility-first primitives; widely adopted.
- Works great with Tailwind v4 (you supply styling).

**Cons**
- You’ll write/maintain styling + composition.
- Some components require careful focus/portal handling.

**Recommendation**
- Use Radix **through shadcn/ui** unless you want to build your own component system from scratch.

---

### Option C — Headless UI (Tailwind Labs)
- **Package/Repo:** `tailwindlabs/headlessui`
- **GitHub:** https://github.com/tailwindlabs/headlessui
- **Last update:** 2025-12-19
- **Stars:** 28,411
- **Bundle size:** Not reliably extractable via server-rendered size pages in this environment  
  - npm metadata suggests **~1.02 MB unpacked** for `@headlessui/react` (install size, not true shipped size)

**Pros**
- Built by Tailwind Labs; good fit for Tailwind-centric teams.
- Strong, accessible patterns for menus, dialogs, etc.

**Cons**
- Styling + some behavior still on you.
- Some parts historically lag behind React/Next edge-cases.

**Recommendation**
- If you don’t want shadcn’s “generated code” model, Headless UI is the next best Tailwind-aligned option.

---

## 2) Form handling

### Option A — React Hook Form (battle-tested)
- **Package/Repo:** `react-hook-form/react-hook-form`
- **GitHub:** https://github.com/react-hook-form/react-hook-form
- **Last update:** 2026-01-26
- **Stars:** 44,450
- **Bundle size:** **26.6 kB min / 9.4 kB gzip**

**Pros**
- Extremely widely used; lots of integrations (Zod, UI kits).
- Great performance for large forms.

**Cons**
- Some patterns feel imperative compared to “fully controlled” forms.
- You still need a schema/validation strategy.

**Recommendation**
- **Default choice**: it’s stable, fast, and has the biggest community.

---

### Option B — TanStack Form (modern “TanStack-style” forms)
- **Package/Repo:** `TanStack/form`
- **GitHub:** https://github.com/TanStack/form
- **Last update:** 2026-01-26 (recent releases)
- **Stars:** (not captured reliably from GitHub HTML in this run — verify on repo)
- **Bundle size:** `@tanstack/react-form` **61.2 kB min / 16.0 kB gzip**

**Pros**
- Excellent ergonomics if you already like TanStack Query/Table patterns.
- Type-first approach; good developer experience.

**Cons**
- Smaller ecosystem/community than RHF (as of now).
- Fewer “copy/paste” examples for some edge-cases.

**Recommendation**
- Consider if you want “one TanStack mental model” across data + forms, but RHF remains the safer default.

---

## 3) Authentication

> **Spec reality:** MVP is **“no accounts”** and optionally a **local app lock** (PIN/passphrase) using WebCrypto (verifier/encryption), because you ship as a **static export**.

### Option A — Auth.js / NextAuth
- **Package/Repo:** `nextauthjs/next-auth`
- **GitHub:** https://github.com/nextauthjs/next-auth
- **Last update:** 2025-10-26 (latest release observed)
- **Stars:** 28,000+
- **Bundle size:** `next-auth` **211.1 kB min / 59.1 kB gzip** (v4.x reported)

**Pros**
- Popular, OSS, extensible.
- Great when you introduce a hosted mode with route handlers and persistence.

**Cons**
- Doesn’t align with strict “no server runtime” static export MVP.
- v5/React 19/Next 15+ compatibility needs to be verified at implementation time.

**Recommendation**
- **Defer for MVP**. Keep on the shortlist for a hosted mode.

---

### Option B — Supabase Auth (via supabase-js)
- **Package/Repo:** `supabase/supabase-js`
- **GitHub:** https://github.com/supabase/supabase-js
- **Last update:** 2026-01-26 (recent release)
- **Stars:** 4,200+
- **Bundle size (proxy):** `@supabase/supabase-js@2.50.3` **114.3 kB min / 29.5 kB gzip**  
  (Use as an approximation; re-check for the exact version you ship.)

**Pros**
- Turnkey auth + DB + storage if/when you decide to host/sync.
- Strong docs and product ecosystem.

**Cons**
- Introduces a backend dependency (conflicts with “privacy-first, no server” MVP).
- Requires careful security model for a trading-data app.

**Recommendation**
- **Best hosted-mode option** if you want a single backend platform for auth + sync later.

---

## 4) Database ORM / query layer

> **Spec reality:** your “database” is **browser SQLite** (`wa-sqlite` + OPFS), and the spec already pushes a **library layer** (`lib/db/queries/*`) instead of Next.js API routes.

### Option A — Drizzle ORM (strong recommendation for local SQLite schemas)
- **Package/Repo:** `drizzle-team/drizzle-orm`
- **GitHub:** https://github.com/drizzle-team/drizzle-orm
- **Last update:** 2026-01-26
- **Stars:** 32,500+
- **Bundle size:** `drizzle-orm` **55.7 kB min / 12.2 kB gzip** (v0.45.1 reported)

**Pros**
- Type-safe schemas + migrations story.
- Very small runtime; zero dependencies (per project docs).
- Fits “query layer” architecture: generate SQL once, call typed queries from UI.

**Cons**
- Browser/WASM SQLite drivers are a bit more DIY than Node drivers.
- You’ll want strong discipline around migrations + versioning.

**Recommendation**
- **Top choice** for your spec because it’s lightweight and TypeScript-first.

---

### Option B — Kysely (type-safe SQL query builder)
- **Package/Repo:** `kysely-org/kysely`
- **GitHub:** https://github.com/kysely-org/kysely
- **Last update:** 2026-01-18 (release v0.28.10)
- **Stars:** 13,400+
- **Bundle size:** (not captured reliably from bundle-size sources in this run — verify via Bundlephobia)

**Pros**
- “Write SQL-like TypeScript,” excellent type inference.
- Explicit queries can map nicely to your `lib/db/queries/*` approach.

**Cons**
- You still need to decide schema/migrations approach (less “ORM-y”).
- Like Drizzle, you must pick/implement a WASM/OPFS-compatible driver.

**Recommendation**
- Pick if you want a **query-builder** more than an ORM.

---

### Option C — Prisma (great on the server; weak fit for browser SQLite MVP)
- **Package/Repo:** `prisma/prisma`
- **GitHub:** https://github.com/prisma/prisma
- **Last update:** 2026-01-27 (latest release noted)
- **Stars:** 45,100+
- **Bundle size:** Misleading in frontend contexts (`@prisma/client` can appear “tiny” because it’s generated/server-oriented)

**Pros**
- Best-in-class DX on the server.
- Strong ecosystem and tooling.

**Cons**
- Not aligned with in-browser SQLite/OPFS runtime.
- Adds significant build-time and conceptual weight for a client-only MVP.

**Recommendation**
- **Do not use for MVP**. Re-evaluate only if you move core data to a server DB.

---

## 5) State management (if needed beyond React Query)

> Spec already chooses **TanStack Query v5** + **Zustand** for UI state.

### Option A — Zustand
- **Package/Repo:** `pmndrs/zustand`
- **GitHub:** https://github.com/pmndrs/zustand
- **Last update:** 2026-01-11 (commit activity observed in January 2026)
- **Stars:** 30,000+ (approx; confirm on repo)
- **Bundle size:** (not captured in this run — verify via Bundlephobia)

**Pros**
- Very small API surface; easy to keep UI state separate from “server state” (TanStack Query).
- Good for your listed use-cases: upload progress, filters, prefs.

**Cons**
- Easy to overuse; keep stores narrowly scoped.

**Recommendation**
- **Stick with Zustand** exactly as the spec says.

---

## 6) Animation library

> Spec already includes `tw-animate-css` for Tailwind v4-friendly animations.

### Option A — Motion (Framer’s Motion)
- **Package/Repo:** (verify GitHub repo for stars; Motion publishes changelog at motion.dev)
- **Home/Docs:** https://motion.dev/
- **Last update:** 2026-01-23 (recent releases listed)
- **Stars:** (not captured in this run — verify)
- **Bundle size:** (not captured in this run — verify)

**Pros**
- Best-in-class React animation ergonomics.
- Great for micro-interactions and polished UX.

**Cons**
- Can add noticeable client bundle if used broadly.
- Overkill if you mostly need small transitions.

**Recommendation**
- Use `tw-animate-css` for most UI motion; bring Motion in selectively (e.g., page transitions, chart transitions).

---

## 7) Local-first libraries

> Core spec: **wa-sqlite + OPFS** (Chromium-only MVP) with exportable SQLite file.

### Option A — wa-sqlite (WASM SQLite in the browser)
- **Package/Repo:** (verify exact upstream repo you choose — multiple mirrors exist)
- **Last update / Stars / Bundle size:** (not captured in this run — verify)
- **Why it’s here:** it is *foundational* to your spec’s DB layer.

**Recommendation**
- Keep wa-sqlite as the core persistence engine as per the spec.

---

### Option B — RxDB (local-first database + sync)
- **Package/Repo:** `pubkey/rxdb`
- **GitHub:** https://github.com/pubkey/rxdb
- **Last update:** 2026-01-21 (v17 beta changelog)
- **Stars:** (not captured in this run — verify on repo)
- **Bundle size:** Typically heavier than “just SQLite” (verify)

**Pros**
- Strong local-first story with replication options.
- Reactive queries map well to UI.

**Cons**
- Bigger dependency footprint than your current “SQLite + query layer” approach.
- You may not need its abstraction for an MVP focused on analytics.

**Recommendation**
- Only adopt if you decide you need **built-in sync/replication** and are okay with extra complexity.

---

### Option C — Dexie (IndexedDB wrapper)
- **Package/Repo:** `dexie/Dexie.js`
- **GitHub:** https://github.com/dexie/Dexie.js
- **Last update:** 2025-10-13 (release activity observed)
- **Stars:** ~13,000 (Dexie site displays “13k”)
- **Bundle size:** (not captured in this run — verify)

**Pros**
- Very good IndexedDB DX, widely used.
- Great for offline-first stores without SQLite.

**Cons**
- Release activity observed slightly outside the “last 3 months” constraint.
- Different mental model than SQL; migration/versioning differs.

**Recommendation**
- Keep Dexie as a fallback if OPFS/SQLite constraints become painful, but **wa-sqlite remains the best match** to your spec.

---

## My “do this now” short list (based on spec alignment)

If you want the **highest-confidence, lowest-regret stack** for your spec:

1) **UI:** shadcn/ui + Radix (through shadcn)  
2) **Forms:** React Hook Form  
3) **DB layer:** Drizzle ORM (or Kysely if you want pure query-builder) over wa-sqlite  
4) **State:** TanStack Query + Zustand (as spec’d)  
5) **Animation:** `tw-animate-css` first, Motion only where it truly adds value  
6) **Auth:** no accounts + local app lock (MVP). Defer Auth.js/Supabase until hosted mode.

---

## Notes / Gaps to verify quickly

A few metrics (stars/bundle sizes) couldn’t be reliably extracted for every repo/package due to fetch restrictions on some pages and/or missing server-rendered bundle-size data. Before you finalize, run:
- `pnpm dlx @next/bundle-analyzer` (or `@next/bundle-analyzer`) for real app-level impact.
- Bundlephobia checks for any package marked “verify.”

