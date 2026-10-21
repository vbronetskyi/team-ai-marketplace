---
name: next-app-router
description: Next.js App Router practices — server vs client components and where the boundary goes, data fetching and caching, route handlers, loading and error states, metadata, images and fonts, hydration mismatches. Use when writing or reviewing code under app/ in a Next.js 14+ project, adding a page or a route handler, or debugging a hydration or "use client" error.
---

# Next.js App Router

## Server and client components

- Components are **server components by default**. Add `"use client"` only to the leaf
  that needs state, effects, event handlers or browser APIs — not to a whole page.
- A client component cannot import a server component; pass the server part in as
  `children` or a prop instead.
- Props that cross the boundary must be serializable: no functions (except server
  actions), class instances, `Date` objects you expect to stay `Date`, or Maps.
- Secrets and server-only modules stay out of client bundles: mark such modules with
  `import "server-only"`.

## Data

- Fetch in server components, close to where the data is used; parallelize independent
  requests with `Promise.all` instead of awaiting them one after another.
- Be explicit about caching: `fetch(url, { cache: "no-store" })` for per-request data,
  `{ next: { revalidate: 60 } }` for data that may be a minute old, tags plus
  `revalidateTag` after a mutation.
- In a client component, fetch through the project's data layer (a query library or
  hooks), not with `useEffect` + `fetch` scattered across components.
- Mutations from forms: server actions validate their input like any public endpoint —
  they are one.

## Routes

- `app/<segment>/page.tsx` renders, `layout.tsx` wraps and keeps state across navigation,
  `loading.tsx` is the Suspense fallback, `error.tsx` (a client component) catches render
  errors of the segment, `not-found.tsx` handles `notFound()`.
- Route handlers (`app/api/<x>/route.ts`) export `GET`, `POST`…; validate the body, return
  `Response.json(...)` with a status, never leak stack traces.
- Dynamic params arrive as props (`params`); in recent versions they are a promise to
  await.

## Metadata, images, fonts

- Static `export const metadata` or `generateMetadata` per page; no `<head>` tags by hand.
- `next/image` with explicit `width`/`height` (or `fill` inside a sized parent) and a
  `sizes` attribute; remote hosts listed in `next.config`.
- `next/font` for fonts, so they are self-hosted and do not shift the layout.

## Hydration mismatches

The server HTML and the first client render differ. Usual causes: `Date.now()`,
`Math.random()`, `window`/`localStorage` read during render, locale-dependent formatting,
invalid HTML nesting (a `<div>` inside a `<p>`). Fix by computing the value in an effect,
passing it from the server, or rendering that part only on the client — not by
`suppressHydrationWarning` on a large subtree.

## Review checklist

- [ ] `"use client"` only where needed, at the leaves.
- [ ] No secret or server-only import reachable from a client component.
- [ ] Independent fetches run in parallel; caching is stated, not implied.
- [ ] Every page with async data has `loading` and `error` handling.
- [ ] Route handlers and server actions validate input and return explicit statuses.
