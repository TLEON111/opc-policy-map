# OPC Policy Map Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable map-to-policy-panel demo for six Chinese regions.

**Architecture:** A server-rendered Next.js shell hosts one client-side explorer. The explorer fetches a local Route Handler; ECharts owns map rendering while pure TypeScript modules own policy filtering and aggregation.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Apache ECharts, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-03-map-mock-panel-design.md`

## Global Constraints

- Mock policies must live outside React components and be labelled `DEMO DATA`.
- The browser data path must be `GET /api/policies?province=<name>`.
- The GeoJSON source must remain replaceable without changing policy components.
- External policy links must use `target="_blank"` and `rel="noopener noreferrer"`.
- Desktop uses a map-and-panel layout; narrow screens stack the map above the panel.

---

### Task 1: Project shell and policy query contract

**Files:**
- Create: `package.json`, TypeScript/Next/Tailwind/Vitest configuration
- Create: `types/policy.ts`, `data/mock-policies.ts`, `lib/policies.ts`
- Test: `lib/policies.test.ts`

**Interfaces:**
- Produces: `Policy`, `ProvinceSummary`, `getPolicies(filters)`, `getProvinceSummary(name)`

- [ ] Write tests asserting literal results for 重庆 filtering, unknown provinces, and category totals.
- [ ] Run `npm test -- lib/policies.test.ts` and confirm failure because the modules do not exist.
- [ ] Add the smallest typed Mock dataset and pure query helpers that satisfy the assertions.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Route Handler contract

**Files:**
- Create: `app/api/policies/route.ts`
- Test: `app/api/policies/route.test.ts`

**Interfaces:**
- Consumes: `getPolicies({ province?: string })`
- Produces: `GET(request): Promise<NextResponse<PoliciesResponse>>`

- [ ] Write tests that request 重庆 and an unknown province, asserting HTTP 200, `meta.total`, and returned province values.
- [ ] Run the focused route test and confirm failure because the handler is absent.
- [ ] Implement the Route Handler by parsing `searchParams` and calling the pure query helper.
- [ ] Re-run both policy tests and confirm they pass.

### Task 3: Interactive explorer and policy panel

**Files:**
- Create: `components/PolicyExplorer.tsx`, `components/PolicyDrawer.tsx`, `components/PolicyCard.tsx`
- Test: `components/PolicyExplorer.test.tsx`

**Interfaces:**
- Consumes: `fetch('/api/policies?province=' + encodeURIComponent(name))`, `Policy[]`
- Produces: province selection UI with loading, error, empty, and populated states

- [ ] Write component tests with complete API fixtures for initial 重庆 rendering, a province selection update, empty state, and secure source links.
- [ ] Run the focused test and confirm failure because the components are absent.
- [ ] Implement the smallest accessible components and explicit request-state transitions.
- [ ] Re-run the component test and confirm it passes.

### Task 4: ECharts map and responsive page

**Files:**
- Create: `components/ChinaMap.tsx`, `public/maps/china-provinces.geojson`
- Create: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`
- Modify: `components/PolicyExplorer.tsx`

**Interfaces:**
- Consumes: `ProvinceSummary[]`, selected province name
- Produces: `onProvinceSelect(name: string)` from ECharts click events

- [ ] Add a component test that selects a province through the map component boundary and expects the policy request to change.
- [ ] Run it and confirm failure because the map boundary is not connected.
- [ ] Load and register the local GeoJSON once, initialize ECharts once per mount, update options without recreation, and dispose on unmount.
- [ ] Compose the page shell and responsive styles with accessible status and selection cues.
- [ ] Re-run all tests and confirm they pass.

### Task 5: Final verification

**Files:**
- Modify only files implicated by real verification failures.

- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
- [ ] Start the production server and verify `/` and `/api/policies?province=重庆` return HTTP 200.
- [ ] Check the rendered page at desktop and 390px widths for overflow, readable hierarchy, map interaction, and panel state changes.
- [ ] Record the exact results and any remaining compliance limitation in the handoff.

