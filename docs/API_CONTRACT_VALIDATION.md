# API contract validation

This document records the production API authorization scenarios that must be exercised against a deployed environment.

| Route | Unauthenticated | Wrong role / membership | Valid actor |
|---|---|---|---|
| `GET/PUT /api/admin/settings` | 403 | 403 for non-ADMIN | ADMIN: 200 |
| `GET/POST /api/entreprise/jobs` | 403 | 403 for non-ENTREPRISE or foreign company | authorized ENTREPRISE: 200/201 |
| `GET/POST/PATCH /api/messages` | 401 | 403 for non-participant conversation | authenticated participant: 200/201 |
| `GET /api/candidat/profil` | 401 | role guard must reject non-CANDIDAT | CANDIDAT: 200 |
| `GET/POST /api/entreprise/applications` | 403 | 403 outside company scope | authorized ENTREPRISE: 200/201 |

The existing PostgreSQL fixture validates persistence and isolation, but this matrix is intentionally separate because it requires exercising the actual route handlers or a deployed browser/API environment.

Do not mark the final production validation issue closed solely from `prisma migrate`, `typecheck`, or `build` success.
