# Deployment Guide

## Platform

**Vercel** (zero-config for Next.js 16).

## Branches

| Branch | Vercel Environment | URL |
|--------|-------------------|-----|
| `main` | Production | `https://sewakhoj.com` |
| `staging` | Preview | auto-assigned `*.vercel.app` URL |

## CI Pipeline

Every push/PR to `main` or `staging` triggers `.github/workflows/ci.yml`:

```
Lint → Unit Tests (106) → Build
```

The build step requires these **GitHub Secrets** (set in repo → Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

The `NEXT_PUBLIC_APP_URL` can be set as a **Repository Variable** (`vars`) or defaults to `http://localhost:3000` at build time; Vercel overrides it at runtime.

## Staging Setup

### 1. Supabase — staging project

- Create a separate Supabase project for staging
- Run migrations: `node apply-migrations.js` (with staging credentials)
- Deploy edge functions:

```sh
supabase functions deploy esewa-token-inquiry --project-ref <staging-ref>
supabase functions deploy esewa-status-check --project-ref <staging-ref>
supabase functions deploy khalti-verify --project-ref <staging-ref>
supabase functions deploy send-push --project-ref <staging-ref>
supabase functions deploy approve-tasker --project-ref <staging-ref>
```

### 2. Vercel — branch config

In Vercel project → Settings → Git:
- **Production Branch**: `main`
- Preview deployments enabled for `staging` (included by default)

### 3. Vercel — environment variables

Add staging credentials under **Preview** environment variables (separate from Production):

```
NEXT_PUBLIC_SUPABASE_URL     = <staging-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY = <staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY    = <staging-service-role-key>
NEXT_PUBLIC_APP_URL          = https://<staging-vercel-url>
```

## Smoke Tests

After deploying to staging, verify the running app is healthy:

```sh
SMOKE_TEST_URL=https://<staging-vercel-url> \
  SMOKE_TEST_EMAIL=smoke@sewakhoj.com \
  SMOKE_TEST_PASSWORD=<password> \
  npm run test:smoke
```

The smoke suite runs 10 tests (~3 min):

| # | Test | Checks |
|---|------|--------|
| 1 | Homepage loads | Hero section, text visible |
| 2 | Login page | Email/password inputs, sign-in button |
| 3 | Services catalog | Service cards rendered |
| 4 | Browse page | Search or filter controls |
| 5 | Tasker profile | Navigate from browse, profile renders |
| 6 | Static pages | About, Contact, FAQ all render |
| 7 | Login succeeds | Smoke user authenticates, redirects |
| 8 | Dashboard loads | Authenticated user sees dashboard |
| 9 | Admin sidebar | Admin layout renders (skips if not staff) |
| 10 | No page errors | Zero uncaught errors on 7 critical pages |

### Smoke test user — staging setup

The smoke test needs a dedicated user in your staging Supabase:

1. Create user via Supabase Auth dashboard (email/password, confirmed email)
2. Insert a staff role for admin test coverage:

```sql
INSERT INTO staff_roles (user_id, role)
VALUES ('<user-uuid>', 'admin');
```

Set credentials in GitHub Secrets (for CI) or pass via env vars:

| Variable | Description |
|----------|-------------|
| `SMOKE_TEST_EMAIL` | Smoke test user email |
| `SMOKE_TEST_PASSWORD` | Smoke test user password |

## Production Release

### Versioning

Current version: `0.1.0`. Follow semver:

| Bump | When | Example |
|------|------|---------|
| **patch** | Bug fixes, small tweaks | `0.1.0` → `0.1.1` |
| **minor** | New features, non-breaking | `0.1.0` → `0.2.0` |
| **major** | Breaking changes, launch | `0.1.0` → `1.0.0` |

### Release Cycle

```
feature PRs ──► staging ──► PR ──► main ──► Vercel ──► sewakhoj.com
                 ▲            ▲            ▲
              smoke test    CI runs    smoke test + tag
```

| Step | Action |
|------|--------|
| 1 | Merge feature/PR work into `staging` |
| 2 | Bump `version` in `package.json` |
| 3 | Smoke test staging: `npm run test:smoke` (with staging URL) |
| 4 | Open PR: `staging` → `main` |
| 5 | CI runs unit tests (106) + build |
| 6 | Merge PR into `main` |
| 7 | Vercel auto-deploys `main` → production |
| 8 | Smoke test production: `SMOKE_TEST_URL=https://sewakhoj.com npm run test:smoke` |
| 9 | Tag release: `git tag v0.x.y && git push origin v0.x.y` |

### Hotfix (urgent production fix)

```
main ──► hotfix/x ──► PR ──► main ──► Vercel deploy
                            │
                            └── cherry-pick ──► staging
```

| Step | Action |
|------|--------|
| 1 | `git checkout -b hotfix/<desc> main` |
| 2 | Fix, commit, push |
| 3 | Open PR: `hotfix/<desc>` → `main` |
| 4 | CI runs, merge PR |
| 5 | Vercel auto-deploys |
| 6 | `git checkout staging && git cherry-pick <sha>` — keep staging in sync |

### Rollback

If a production deploy breaks:

- **Vercel Dashboard** → Deployments → ⋮ → Promote to Production (previous working deploy)
- Or git revert: `git revert HEAD && git push origin main` → Vercel deploys the revert

## One-Time Setup

- [ ] Create `staging` branch: `git checkout -b staging main && git push -u origin staging`
- [ ] Staging Supabase project created, migrations applied
- [ ] Edge functions deployed to staging Supabase
- [ ] Edge functions deployed to production Supabase
- [ ] Smoke test user created in staging Supabase + staff_roles
- [ ] Vercel: Production Branch = `main`, Preview includes `staging`
- [ ] Vercel: Preview env vars configured (staging Supabase credentials)
- [ ] GitHub Secrets populated (CI): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Per-Release Checklist

- [ ] `staging` up to date with all feature PRs merged
- [ ] `package.json` version bumped
- [ ] Smoke tests pass against staging
- [ ] PR `staging` → `main` opened
- [ ] CI green (unit tests + build)
- [ ] PR merged to `main`
- [ ] Vercel deploy succeeded (check dashboard)
- [ ] Smoke tests pass against `sewakhoj.com`
- [ ] Git tag pushed: `git tag v0.x.y && git push origin v0.x.y`
