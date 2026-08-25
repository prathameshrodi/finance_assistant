---
name: code-quality-guidelines
description: Coding standards for Python and Next.js work — formatting/linting, dead-code cleanup, proper logging (no stray print/console.log), and test coverage held to a 95% floor. Use this whenever writing, editing, reviewing, or refactoring Python (.py) or Next.js/React (.js/.jsx/.ts/.tsx) code, even if the user just says "write a function", "add an endpoint", "build this component", or "fix this bug" without explicitly asking for cleanup, formatting, logging, or tests — those are the default bar for any code this skill produces, not an opt-in extra.
---

# Code Quality Guidelines (Python & Next.js)

You're not just making the code work — you're leaving it in a state a reviewer
would approve without comment. That means: formatted correctly, free of dead
weight, observable through proper logging instead of stray prints, and backed
by tests that actually exercise the code (95%+ line coverage).

This skill covers the mindset and workflow that apply to both languages. For
language-specific commands, rule sets, and examples, read the matching
reference file before you start:

- **Python** → `references/python.md` (Ruff, Black, pytest + pytest-cov)
- **Next.js / React** → `references/nextjs.md` (ESLint, Prettier, Jest + RTL)

If a task touches both (e.g., a Next.js frontend calling a Python API), read
both files.

## Why this matters

Code that "works" but is unformatted, littered with leftover debug prints,
and untested is a liability the moment someone else (or future-you) has to
touch it. Each of the four pillars below exists for a concrete reason, not
because a linter said so:

- **Formatting** removes bikeshedding from code review and makes diffs
  readable — a diff full of whitespace noise hides the actual change.
- **Cleanup** (dead code, unused imports, commented-out blocks, redundant
  variables) keeps the reader's mental model of the codebase accurate. Code
  that exists but does nothing is worse than no code — it makes the next
  person wonder if it's actually load-bearing.
- **Logging** is what lets someone debug a production issue without
  reproducing it locally. `print`/`console.log` statements get forgotten,
  don't carry severity, and rarely survive a build. Structured logs at the
  right level do.
- **Test coverage** at 95% isn't a vanity number — it's a proxy for "the
  error paths, edge cases, and branches got exercised, not just the happy
  path." Chasing the number by testing trivial getters is missing the point;
  chasing it by testing what actually branches is the point.

## Workflow

Apply this every time you write or modify Python or Next.js code in this
project, not just when the user explicitly asks for a "cleanup" pass:

1. **Write the code** to solve the actual task first. Don't let process get
   in the way of a working solution.
2. **Clean it up.** Re-read your own diff. Remove unused imports/variables,
   dead branches, commented-out code, redundant intermediate variables, and
   any debug `print`/`console.log` calls. See the language reference for
   what a linter can catch automatically vs. what needs a human read-through.
3. **Format and lint.** Run the language's formatter and linter (commands in
   the reference file) and fix anything they flag. Don't hand-format when a
   tool exists to do it deterministically.
4. **Replace ad-hoc output with logging.** Any place you'd have reached for
   `print()` or `console.log()` to see what's happening, use the project's
   logger at an appropriate level instead (see reference file for levels and
   setup).
5. **Write or update tests** covering the change — success path, error
   paths, and edge cases (empty input, None/null, boundary values, thrown
   exceptions/rejections). Run the coverage tool and treat anything under
   95% as a signal you missed a branch, not a number to pad.
6. **Report the numbers.** After running tests, tell the user the resulting
   coverage percentage and call out any file that fell short of 95% and why
   (e.g., "the CLI entrypoint's `if __name__ == '__main__'` guard is
   excluded — that's standard, not a gap").

If the user's request is small (a one-line fix, a quick script) use
judgment — a 5-line utility script doesn't need a test suite, but a function
that will be imported and called from elsewhere does. When in doubt, apply
the full workflow; the cost of an unnecessary test is much lower than the
cost of a silent regression.

## Shared cleanup checklist

Before considering any change done, scan for these regardless of language:

- Unused imports, variables, and function parameters
- Commented-out code (delete it — version control already remembers it)
- Debug output (`print`, `console.log`, `debugger`, `pdb.set_trace()`)
- Dead branches (`if False:`, unreachable code after a `return`/`throw`)
- Duplicated logic that could be one function
- Overly broad `except:`/`catch` blocks that swallow errors silently
- TODO comments without an owner or ticket reference — either resolve them
  now or flag them explicitly to the user rather than leaving them silent

## What "95% coverage" means in practice

Coverage is a floor, not a target to game. A few rules of thumb:

- Cover branches, not just lines — an `if/else` with only the `if` tested
  can still show high line coverage while missing half the logic.
- Test what the function is *for*: given valid input, given invalid input,
  given the edge that breaks a naive implementation.
- It's fine to exclude genuinely untestable boilerplate (e.g., a `main()`
  entrypoint guard, a Next.js `generateMetadata` stub) — but say so
  explicitly rather than silently letting coverage drift.
- If you can't reach 95% without writing a test that just re-asserts a
  mock's return value, that's a sign the code under test may need
  restructuring (e.g., pulling logic out of a component into a testable
  function) — mention that to the user rather than padding the suite.
