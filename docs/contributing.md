# Contributing Guide

Thank you for contributing to **SpeakMirror**! Follow these instructions to maintain codebase quality.

## 1. Local Development Setup

1. Clone the repository.
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Set up your local environment file:
   ```bash
   cp .env.example .env.local
   ```
   Add valid API keys for Supabase and Groq.
4. Run the development server:
   ```bash
   npm run dev
   ```

---

## 2. Coding Standards

We enforce strict typescript checking, lint rules, and code formatting:

- **TypeScript**: Always use strict typing. Avoid `any` or `unknown` casts. Update standard models in `src/types/index.ts`.
- **Formatting**: Run Prettier before committing:
   ```bash
   npx prettier --write .
   ```
- **Linting**: Fix all code smells and lint errors:
   ```bash
   npm run lint
   ```

---

## 3. Pre-Commit Hooks & Quality Gates

This project uses **Husky** and **lint-staged** to run tests and quality checks before staging commits:
- Prettier and ESLint run automatically on modified files when you execute `git commit`.
- The CI pipeline runs on every PR and blocks merges if unit tests or typescript checks fail.

---

## 4. Test Verification

Before pushing code changes:
1. Run all unit and integration tests:
   ```bash
   npm run test
   ```
2. Verify Next.js compiles correctly:
   ```bash
   npm run build
   ```
