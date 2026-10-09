---
name: ui-check
description: Check a UI change in the running app before calling it done. Type-checks, builds, then opens the affected pages in a real browser (Playwright MCP) at phone and desktop widths, in light and dark themes, and reports layout, console and accessibility problems. Use after any change to src/pages, src/components or index.css, or when the user asks to "check the UI", "look at the page" or "verify it renders".
---

# Checking a UI change

Code that type-checks can still look broken. Look at the page.

## 1. Static checks

```bash
npm run lint    # tsc --noEmit
npm run build   # vite build
```

Fix failures before opening a browser.

## 2. Run the app

`npm run dev` serves Express and Vite on http://localhost:3000 (`PORT` overrides
it). Start it in the background and wait for "Server running".

## 3. Look at it (Playwright MCP)

For each page the change touches (`src/pages/*.tsx` map to the app's routes):

- Widths **390px** and **1280px**. Take a screenshot of each and look at it.
- Light and dark themes, if the page has both.
- Read the browser console. Any error or React warning counts as a failure.
- Click through the changed interaction once: the form submits, the dialog
  opens and closes, the table sorts.

If the browser won't launch, run `browser_install` from the Playwright MCP.

## 4. What to flag

- Layout: horizontal scroll on a phone, overlapping or clipped text, misaligned
  columns, spacing that drifts from the neighbouring components.
- Consistency: one-off colours, font sizes or radii where a Tailwind token or
  an existing component already exists.
- Accessibility: missing labels on inputs or icon buttons, no visible focus
  ring, text contrast that is obviously low, keyboard-only use broken.
- States: empty, loading and error states for any data the change displays.
- Translations: new UI strings go through `src/translations.ts`, not hard-coded.

## 5. Report

List what was checked: pages, widths and themes. List each problem with a
screenshot reference. Say **PASS** only when every step ran and passed. A
skipped step is reported as skipped, not passed. Stop the dev server when done.
