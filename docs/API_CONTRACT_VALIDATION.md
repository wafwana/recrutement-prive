# API contract validation

This document records the authorization and HTTP contracts that must be exercised against route handlers and, where possible, the deployed environment.

| Route | Unauthenticated | Wrong role / membership | Valid actor and expected success |
|---|---:|---:|---|
| `GET/PUT /api/admin/settings` | 403 | 403 without `PLATFORM_SETTINGS` permission | OWNER or authorized ADMIN: GET 200, PUT 200 |
| `GET/POST /api/entreprise/jobs` | 403 | 403 outside the user's company membership | authorized ENTREPRISE: GET 200, POST 201 |
| `GET/PUT /api/candidat/profil` | 403 | 403 for any role other than CANDIDAT | CANDIDAT: GET 200, PUT 200 |
| `GET /api/entreprise/applications` | 403 | 403 outside the user's company scope | authorized ENTREPRISE: GET 200; only applications already presented to that company are returned |
| `GET/PATCH /api/entreprise/applications/[applicationId]` | 403 | 403 outside company scope or before presentation | authorized ENTREPRISE: GET 200, PATCH 200 |
| `GET/POST/PATCH /api/messages` | 401 | 403 for a non-participant or forbidden direct contact | authenticated participant: GET 200, POST 201, PATCH 200 |
| `GET /api/sourcing/candidate-history` | 403 | 403 without `SOURCING` permission for non-OWNER staff | OWNER or authorized sourcing staff: GET 200 |
| `POST /api/sourcing/candidate-actions` | 403 | 403 without `SOURCING` permission | OWNER or authorized sourcing staff: POST 200 |
| `POST /api/consultant/presentations` | 403 | ADMIN and CONSULTANT: 403, even with legacy presentation permissions | OWNER only: POST 201 when the presentation is created |

## Interpretation

- A `401` means the route requires an authenticated session; a `403` means the session is absent or the actor is not authorized according to that route's contract.
- A `404`, `409`, `429` or `5xx` response may be a valid business or operational result and must not be misclassified as an authorization failure.
- The enterprise application list is GET-only. Candidate status changes use the `[applicationId]` PATCH route and are available only after OWNER presentation.
- Candidate presentation is an OWNER decision. The legacy consultant endpoint is retained for compatibility but rejects ADMIN and CONSULTANT.

The existing PostgreSQL fixtures validate persistence and isolation. This matrix remains separate because a complete production acceptance must exercise the actual route handlers or a deployed browser/API environment with valid identities and company memberships.

Do not mark final production acceptance complete solely from Prisma migration, typecheck, tests or build success. Record the actor role, company scope, request, expected response and observed response for each deployed scenario.
