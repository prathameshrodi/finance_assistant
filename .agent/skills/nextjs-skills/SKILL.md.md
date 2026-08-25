# Next.js / React Guidelines

Toolchain: **ESLint** (`next/core-web-vitals` config) + **Prettier**
(format), **Jest** + **React Testing Library** (tests + coverage).

## Formatting & linting

```bash
npx eslint . --fix
npx prettier --write .
```

- If the project was scaffolded with `create-next-app`, ESLint with
  `next/core-web-vitals` is already configured — use it rather than
  inventing a separate config. If Prettier isn't set up, add a minimal
  `.prettierrc` rather than leaving formatting inconsistent.
- Enable (or don't disable) `no-unused-vars`, `no-console` (allow
  `console.warn`/`console.error` if the project has no logger yet, but flag
  that as a gap — see Logging below), and `react-hooks/exhaustive-deps` —
  that last one catches real bugs, not just style issues; don't silence it
  with a blanket `eslint-disable`.

## Cleanup, beyond what the linter catches

- Unused imports and props ESLint will catch; unused *exports* (a component
  or util nothing imports anymore) it usually won't — grep for the export
  name before deleting, but don't leave known-dead exports in place.
- Commented-out JSX/logic — delete it.
- Leftover `console.log` / `debugger` statements.
- State that's set but never read, or effects that duplicate what a derived
  value could compute directly (`useEffect` + `setState` mirroring a prop is
  usually better as a plain computed value).
- Redundant wrapper components that just forward props with no added
  behavior.

## Logging

`console.log` is fine for a five-minute local debug session, but it should
not survive into the diff. What to use instead depends on where the code
runs:

**Server-side (API routes, Server Components, Server Actions, middleware):**
use a real logger rather than raw `console.*` — it gives you levels and
structured output that a hosting platform's log viewer can filter on.

```ts
// lib/logger.ts — minimal leveled logger if the project has none yet
type Level = "debug" | "info" | "warn" | "error";

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  const entry = { level, message, timestamp: new Date().toISOString(), ...meta };
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(JSON.stringify(entry));
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
};
```

If the project already depends on a structured logger (pino, winston, a
platform SDK), use that instead of introducing a second one.

```ts
export async function POST(req: Request) {
  const body = await req.json();
  logger.info("order.create.received", { orderId: body.id });
  try {
    const order = await createOrder(body);
    return Response.json(order);
  } catch (err) {
    logger.error("order.create.failed", { orderId: body.id, error: String(err) });
    return Response.json({ error: "failed to create order" }, { status: 500 });
  }
}
```

**Client-side (Client Components):** keep it minimal — a browser console is
already a debugging tool the user can open, so heavy client logging has
less value and more privacy risk. `console.error` for genuine unexpected
failures (e.g., inside an error boundary) is reasonable; don't add
`console.log` for routine render/state changes.

- Never log auth tokens, cookies, full request/response bodies, or form
  values that might contain user PII.

## Tests

Use Jest (or the project's existing runner — check `package.json` before
adding a second one) with React Testing Library.

```bash
npx jest --coverage
```

Add a coverage floor in `jest.config.js` so it's enforced automatically,
not just checked by eye:

```js
module.exports = {
  // ...existing config
  coverageThreshold: {
    global: {
      lines: 95,
      statements: 95,
      functions: 95,
      branches: 90,
    },
  },
};
```

(Branch coverage is set slightly below the others here because JSX
conditional rendering often creates branches that are impractical to fully
enumerate — adjust to 95 if the project's component logic is
branch-heavy and testable.)

- Test behavior, not implementation: query by role/text the way a user
  would (`getByRole`, `getByText`), not by CSS class or internal state.
- Cover loading, error, and empty states for any component that fetches
  data — not just the happy path with data present.
- For API routes / Server Actions, test the error branch explicitly (bad
  input, downstream failure) — this is usually where coverage gaps hide.
- Mock `fetch`/network calls (`jest.mock`, `msw`) so tests are deterministic
  and don't hit real services.
- Prefer a small number of tests per component that each assert something
  meaningful over many trivial snapshot tests — a snapshot test that just
  re-approves whatever the component currently renders doesn't catch
  regressions and inflates coverage without value.
