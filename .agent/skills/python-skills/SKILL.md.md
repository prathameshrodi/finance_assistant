# Python Guidelines

Toolchain: **Ruff** (lint + import sort), **Black** (format), **pytest** +
**pytest-cov** (tests + coverage).

## Formatting & linting

Run both after writing or editing code, and fix everything they flag before
considering the change done:

```bash
ruff check --fix .
black .
```

- Ruff's default rule set plus `I` (isort), `UP` (pyupgrade), `B`
  (bugbear), and `SIM` (simplify) catches most of what matters: unused
  imports/variables, outdated syntax, common bug patterns, and needlessly
  complex code. If the project doesn't already have a `pyproject.toml`
  `[tool.ruff]` section enabling these, propose adding one rather than
  silently relying on defaults.
- Black is non-configurable by design — don't hand-format to differ from
  what it would produce; run it and move on.
- If Ruff or Black aren't installed in the environment, install them
  (`pip install ruff black --break-system-packages` in this sandbox) rather
  than skipping the step.

## Cleanup, beyond what the linter catches

Ruff will flag unused imports and variables automatically, but it won't
catch everything:

- Commented-out code blocks — delete them.
- Dead `if False:` / unreachable branches.
- Functions or classes that are no longer called anywhere in the project.
- Overly defensive `try/except Exception:` blocks that swallow real errors —
  narrow the exception type or re-raise after logging.
- Intermediate variables used exactly once that only add indirection
  (`result = compute(x); return result` → `return compute(x)`).

## Logging

Never leave `print()` in code that isn't a throwaway one-off script. Use the
standard `logging` module:

```python
import logging

logger = logging.getLogger(__name__)

def process_order(order_id: str) -> Order:
    logger.info("Processing order", extra={"order_id": order_id})
    try:
        order = fetch_order(order_id)
    except OrderNotFoundError:
        logger.warning("Order not found", extra={"order_id": order_id})
        raise
    except Exception:
        logger.exception("Unexpected error processing order %s", order_id)
        raise
    logger.debug("Order fetched: %r", order)
    return order
```

Guidelines:

- One module-level `logger = logging.getLogger(__name__)` per file — don't
  configure logging inside library code (that's the application's job via
  `logging.basicConfig` or `dictConfig` at the entrypoint).
- Pick the level deliberately: `DEBUG` for internals a developer would want
  when troubleshooting, `INFO` for normal lifecycle events worth an
  operator seeing, `WARNING` for recoverable problems, `ERROR`/`exception`
  for failures. Don't log everything at `INFO` — that's just `print` with
  extra steps.
- Use `logger.exception(...)` (not `logger.error`) inside an `except` block
  so the traceback is captured.
- Never log secrets, tokens, passwords, or full request bodies that might
  contain PII — log identifiers (an order ID, a user ID) instead of the
  full object when the object might be sensitive.
- Prefer `%s`-style lazy formatting (`logger.info("x=%s", x)`) over f-strings
  in log calls so the string isn't built when the level is disabled.

## Tests

Use `pytest`. Mirror the source layout under `tests/` (or colocate as
`test_<module>.py` if that's the project's existing convention — check
before introducing a new pattern).

```bash
pytest --cov=<package> --cov-report=term-missing --cov-fail-under=95
```

- `--cov-report=term-missing` shows exactly which lines were missed — use
  that output to find the gap, don't guess.
- Use `pytest.mark.parametrize` for testing the same logic across several
  inputs instead of copy-pasting near-identical test functions.
- Use fixtures for shared setup (a test client, a temp database, a sample
  object) rather than repeating construction logic in every test.
- Mock external calls (network, filesystem, time, randomness) with
  `unittest.mock` or `pytest-mock` — tests should be deterministic and not
  depend on network access.
- For every function with a `try/except`, write a test that actually
  triggers the exception path — that's usually where coverage gaps hide.
- Add a `pyproject.toml` `[tool.coverage.run]` `omit` entry for genuinely
  untestable files (e.g., `__main__.py`) rather than writing hollow tests
  just to hit the number.
