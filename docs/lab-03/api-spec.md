# Lab 3 REST API Contract

Status: Ready for Issue #33 PR review; application implementation is outside this PR.
Base URL: http://localhost:3000/api. Normative references:
[specification](./specification.md), [Lab 2 DTOs](../lab-02/api-spec.md).

## 1. Common conventions

JSON except existing multipart uploads and attachment content. Unknown JSON
fields, malformed IDs/enums and invalid queries return 400. Positive integer IDs
fit PostgreSQL Int. Ticket Numbers retain Lab 2 normalization and format.
Timestamps are ISO 8601 UTC. Authentication is checked before resource lookup;
Requester ownership scopes lookup before fields/conflicts are returned.

Errors preserve `{error:{code,message,fieldErrors?}}`; fieldErrors maps names to
messages and is only included for field-addressable validation. No passwords,
password hashes, session IDs, file paths, SQL or stack traces appear in JSON/logs.
The opaque session token appears only in its Set-Cookie transport, as required.
The separate CSRF token is deliberately returned in AuthResponse.
Sensitive JSON uses Cache-Control: no-store. Parse JSON bodies with a 64 KiB
limit; oversized JSON returns safe 413 PAYLOAD_TOO_LARGE. Existing attachment
byte/type/count limits and download headers remain unchanged.

| Status/code | Contract |
|---|---|
| 400 VALIDATION_ERROR / INVALID_QUERY | Malformed or invalid input; safe field errors where applicable |
| 401 INVALID_CREDENTIALS | Same message for unknown email, inactive user, unprovisioned user and wrong password |
| 401 UNAUTHENTICATED | No valid session, idle/absolute expiry, revoked or inactive account |
| 403 PASSWORD_CHANGE_REQUIRED | Valid restricted session attempting normal application API |
| 403 FORBIDDEN / CSRF_INVALID | Wrong role or failed origin/token checks |
| 404 RESOURCE_NOT_FOUND | Missing/cross-owner Ticket or Attachment, with identical body for both |
| 404 ROUTE_NOT_FOUND | Removed Development Requester endpoint or unsupported route |
| 409 INELIGIBLE_OWNER | Assignment target is missing, inactive or not an operational role |
| 409 STALE_RESOURCE / INVALID_TRANSITION / OWNER_REQUIRED | Stale version, forbidden edge or absent eligible owner |
| 409 EMAIL_CONFLICT / ACCOUNT_CONFLICT / ADMIN_REQUIRED | Duplicate email, exhausted transaction retries, self-deactivation or last-Administrator violation |
| 415 UNSUPPORTED_MEDIA_TYPE | JSON endpoint receives non-JSON request content |
| 410, 413, 415 | Existing removed-content, attachment-size and file-type contracts |
| 429 TOO_MANY_ATTEMPTS | Login throttled; include integer Retry-After seconds |
| 500 INTERNAL_ERROR | Generic safe unexpected failure |

## 2. Authentication, credentials and CSRF (FR-01/02; AC-01-05)

Password choice: 15-128 Unicode code points, at most 512 UTF-8 bytes; preserve
spaces/case/Unicode exactly, do not trim or normalize. Reject unpaired UTF-16
surrogates; count Unicode code points consistently on client and server. Require matching
confirmation and a different password from the current one for a password
change. No mandatory character-class rules. Reject blank-only strings. Initial
passwords use the same policy. Login checks shape/maximum without exposing
password rules or account existence in credential failures.

Hash with Argon2id using memoryCost 19456 KiB, timeCost 2, parallelism 1,
16-byte random salt and 32-byte hash. Store the library's encoded parameter/salt/
hash string. Rehash on successful login if parameters later increase. An unknown
or unprovisioned account uses dummy hash verification to reduce timing differences.
See [security decision sources](./decisions.md#security-design-references).

Generate a fresh 32-byte cryptographic random session token, base64url encoded;
store only SHA-256(token) in Session.tokenHash. Set `toktickit.sid` cookie with
HttpOnly, SameSite=Lax, Path=/ and no Domain. Secure=true for HTTPS; the explicit
local HTTP development/test environment may set Secure=false. Use a browser-session cookie without Max-Age or Expires at creation; server
timeouts remain authoritative even when a browser restores session cookies.
No browser localStorage/sessionStorage credentials or role authority. Client fetch uses
credentials=include. Normal session has 8-hour absolute expiry and 30-minute
idle timeout; password-change-only session has 15-minute absolute expiry and
cannot access business APIs. Expired rows may be cleaned by local maintenance;
every request checks expiry regardless of cleanup.

Every protected request loads current User active/role/password-change state.
State-changing database transactions revalidate actor permission/active state
and target eligibility inside a serialized transaction. If an account change
commits first, a later business mutation must reject; a business mutation
serialized before the account change may finish. Acquire multiple User locks
in ascending ID order before Ticket locks; retries re-read all state.
Login verifies the hash outside the transaction, then rechecks the same User
version/hash/active state before inserting the session. A changed snapshot
returns the generic credential failure and creates no session. Password change
rechecks current-session existence and the verified User version/hash inside
the transaction before replacing the hash; a competing reset/change returns
401 if the session was revoked, otherwise 409 STALE_RESOURCE. Only one competing
change may succeed. This prevents an old verified credential from creating a
new session after a reset.
Successful login rotates the session cookie and deletes any previous session
represented by that cookie. Password change deletes all user sessions and
creates one fresh unrestricted session. Administrator password reset, role
change or deactivation revokes every session for that target atomically with
the update. Current-user name/email changes are reflected on next retrieval.
Logout deletes the current session and expires the cookie with identical scope.

Allow CORS credentials only for the configured CLIENT_URL (5173 development,
5174 isolated E2E). All mutating browser requests require that exact Origin;
missing/null/untrusted Origin is 403. Login accepts only application/json and
passes this origin check. Authenticated mutations additionally require
X-CSRF-Token matching the session's separate random 32-byte hex csrfToken;
compare in constant time. GET /auth/me returns csrfToken for the current
session; it is kept in client memory, not a URL. Login/change-password return
the rotated token. Allow Content-Type, Idempotency-Key and X-CSRF-Token in CORS;
remove X-Development-Requester-Id. SameSite alone is not the CSRF defense.
Tests set the real allowed Origin and session token; they do not bypass middleware.

Login rate limits: 10 failed attempts per canonical email and 100 attempts per
IP in a rolling 15-minute window. The next attempt after the limit is 429 until
that window has room. Unknown emails share identical behavior. Successful login
clears the email failure bucket, not the IP bucket. A bounded in-memory store
is acceptable for this single-process local lab, capped at 10,000 keys with
expiry cleanup; at capacity reject new buckets with 429 instead of evicting
active limits. Restart clears counters; document this local-lab limitation.
No permanent account lock or Administrator unlocking workflow is introduced.

### Safe DTOs

- UserSummary: `{id,name,email,role,isActive,mustChangePassword,version}`.
- AuthResponse: `{user:UserSummary,csrfToken,expiresAt}` (absolute expiry).
- Account response additionally includes `createdAt,updatedAt`; never passwordHash.

| Method/path | Request | Success |
|---|---|---|
| POST /auth/login | `{email,password}` | 200 AuthResponse and cookie; mustChangePassword determines restricted route |
| GET /auth/me | No query/body | 200 AuthResponse; restricted sessions allowed |
| POST /auth/logout | Empty body | 204 and expired cookie; valid sessions require CSRF. Missing/expired session is idempotent 204 after Origin check |
| POST /auth/change-password | `{currentPassword,newPassword,confirmPassword}` | 200 rotated AuthResponse/cookie; restricted or normal sessions allowed; wrong current password is 400 VALIDATION_ERROR |

Unauthenticated health is allowed. Category/Related System retrieval requires a
full active session in Lab 3 (all roles). The root service description remains
public. Unsupported routes disclose no account/ticket data.

## 3. Requester and attachments (FR-03; AC-05/06)

`GET/POST /tickets`, `GET /tickets/:ticketNumber`, and all existing attachment
list/upload/content/delete routes retain Lab 2 request and success DTOs, status
codes, validation, UUID Idempotency-Key behavior and soft-removal policy. The
only identity source is the session User with REQUESTER role; development
headers have no authority and the development selector endpoint is removed.
Unknown requesterId body/query fields are rejected. My Tickets status filter
now accepts all eight statuses; requested-priority filtering is unchanged.
Detail adds `{version,resolutionIndicatedAt}` and continues to exclude Internal
Notes and session/account internals. Public Comments use a separate endpoint.

Staff/Administrator use `GET /staff/tickets/:ticketNumber/attachments` and
`GET /staff/tickets/:ticketNumber/attachments/:attachmentId/content` for all
tickets. These reuse Lab 2 safe metadata and content DTOs/headers/removed-content
behavior. They do not gain upload/delete permissions on Requester routes.

## 4. Staff queue and detail (FR-04/05; AC-07/08)

IT_STAFF and ADMINISTRATOR only; full active session required.

GET /staff/tickets accepts optional scalar query parameters:

| Query | Validation / default |
|---|---|
| search | Trimmed 1-100 code points; case-insensitive ticketNumber, summary, description or requester name |
| categoryId, relatedSystemId | Positive database Int |
| status | One of eight exact enum values |
| requestedPriority, itPriority | LOW, MEDIUM, HIGH or URGENT |
| ownerId | Positive Int or literal unassigned; historical invalid owner IDs simply match nothing |
| sortBy | createdAt, updatedAt, ticketNumber, summary, itPriority; default updatedAt |
| sortOrder | asc or desc; default desc; ID tie-breaker in same direction |
| page, pageSize | page positive integer <= 1,000,000 default 1; pageSize 10/20/50 default 10 |

Reject unknown/repeated/empty-present queries. Priority ordering is numeric
LOW < MEDIUM < HIGH < URGENT. Conditions combine with AND except search's OR.
Beyond-last-page returns empty items with truthful counts, not 404.

Queue response:
`{items:QueueItem[],pagination:{page,pageSize,totalItems,totalPages,hasPreviousPage,hasNextPage},query,filterOptions:{categories,relatedSystems,owners}}`.
`totalPages=ceil(totalItems/pageSize)` (zero for empty), hasPreviousPage=page>1,
hasNextPage=page<totalPages. query contains normalized fields, null for omitted
filters, and effective sort values. Filter options include active or historical
referenced categories/systems. Owners contains active eligible users as
`{id,name,role}`; no account-management fields. Read count/items in a consistent
snapshot. QueueItem is `{ticketNumber,createdAt,updatedAt,summary,category:{id,name},requestedPriority,itPriority,status,owner:{id,name,role}|null,version}`.

GET /staff/ticket-owners returns `{items:[{id,name,role}]}` for active IT Staff
and Administrators sorted by name then id. It is independent of user management.

GET /staff/tickets/:ticketNumber returns the Lab 2 detail DTO plus
`{updatedAt,itPriority,owner,version,resolutionIndicatedAt,resolutionIndicatedBy:{id,name}|null}`.
Public/Private communication is retrieved separately. All public fields are
allowlisted; never serialize an entire Prisma User or Session relation.

## 5. Operations and communication (FR-05/06/07; AC-08-10)

Let T be /staff/tickets/:ticketNumber. All T mutations require IT_STAFF or
ADMINISTRATOR and a positive expectedVersion. On success return 200
`{ticketNumber,owner,itPriority,status,version,updatedAt,resolutionIndicatedAt}`.
Invalid state/eligibility is 409; invalid body is 400; missing ticket is 404.
A non-null ownerId that is missing, inactive or not IT Staff/Administrator is
409 INELIGIBLE_OWNER. Attempting prohibited unassignment is 409 OWNER_REQUIRED.
After authentication/role/resource checks, validate the body, then version, then
state/eligibility; the repeated-indication exception below is explicit.

| Endpoint | Body / rule |
|---|---|
| PATCH T/owner | `{ownerId:positiveInt\|null,expectedVersion}`. Claim sends current user ID; no separate implicit status change. |
| PATCH T/priority | `{itPriority,expectedVersion}`. Preserve Requested Priority. |
| PATCH T/status | `{status,expectedVersion,confirmed?:boolean}`. Exact matrix and owner/confirmation rules in BR-16-18. |
| POST /tickets/:ticketNumber/resolution-indication | `{expectedVersion}`. Owned Requester only; allowed statuses BR-19. Returns 200 `{ticketNumber,status,resolutionIndicatedAt,version}`; repeat already-indicated request returns current result without another write, after ownership/status checks and regardless of supplied old version. |

Version mismatch blocks writes; assigning an identical owner/priority is a
successful no-op only if the supplied version is current; preserve version and
updatedAt on these no-ops. First indication
checks version. Communications update version, so stale operation forms must
refresh instead of overwriting intervening changes.

GET/POST /tickets/:ticketNumber/comments permits owned Requesters and both
operational roles. GET/POST /tickets/:ticketNumber/notes permits only operational
roles and rejects Requesters before lookup. No PUT/PATCH/DELETE entry routes.

POST body `{content}` with trimmed 1-5000 Unicode code points. Returns 201
`{id,content,author:{id,name,role},createdAt}` using server user/time. GET returns
`{items:Entry[]}` ordered createdAt then id ascending. No query parameters;
communication pagination is out of scope for this local lab. Names/roles reflect
current User data, while authorId is immutable. Render content as plain text.
A failed save preserves the client draft; a duplicate click is disabled while
saving. If response delivery is uncertain, reload entries before offering retry
because this append endpoint does not promise idempotency.

## 6. User management (FR-08; AC-11-13)

ADMINISTRATOR only. All account validation and active-administrator invariants
are backend-enforced. No DELETE, bulk, history, import/export or invitations.

| Endpoint | Body/query | Success |
|---|---|---|
| GET /admin/users | Optional search (trim 1-100, name/email case-insensitive), role exact enum; reject other/repeated/empty values | 200 `{items:Account[]}` ordered name,id; unpaginated |
| POST /admin/users | `{name,email,role,isActive,initialPassword}`; all required | 201 Account; mustChangePassword=true |
| PATCH /admin/users/:id | `{name?,email?,role?,isActive?,expectedVersion}`; at least one editable field | 200 Account, version incremented |
| POST /admin/users/:id/initial-password | `{initialPassword,expectedVersion}` | 200 Account with mustChangePassword=true, version incremented; all target sessions revoked |

Missing user is 404. Name/email/role limits use BR-25 and the credential policy.
For this local lab, email accepts ASCII local parts consisting of letters,
digits and . _ % + -; local part is 1-64 characters and cannot start/end with
a dot or contain consecutive dots. Domain has at least two dot-separated labels,
each 1-63 letters/digits/hyphens and cannot start/end with a hyphen. Total email
length is <=254. Trim/lowercase before validation/uniqueness; no dot/plus rewriting.
Internationalized addresses and quoted local parts are outside this lab input
policy. Migration preflight must report existing incompatible emails for explicit
correction rather than silently changing them. Name/email/role JSON values are
strings; isActive is a JSON boolean; expectedVersion is a positive integer.
All unspecified nulls and coercions such as string booleans/versions are rejected.
An account PATCH increments version even if editable values equal stored values;
only actual role/activation transitions trigger associated revocation/unassignment.
User password change also increments User.version. Reset may use the same
lab-only initial password; the later user change must differ. Requiring one
role is an enum, never an array. Self-deactivation is blocked even with other
administrators; self-demotion is allowed only if another active Administrator
remains and ends the current session. UI navigates to Login after self-demotion
or self-reset. Demotion/deactivation triggers BR-21 owner handling atomically.

## 7. Requirement traceability

Sections 2-6 map to FR/AC in their headings. BR-01-15 govern identity, visibility,
seeds and account safety; BR-16-26 govern workflow/concurrency/validation.
[tests.md](./tests.md) specifies executable target paths and scenarios.

## 8. DTO types and baseline compatibility

All User/Entry/Attachment IDs and version fields are positive JSON integers.
name/email/content/summary/ticketNumber are strings; booleans are not strings;
roles, priorities and statuses use the exact uppercase schema enums. createdAt,
updatedAt, expiresAt and ticketDate are ISO UTC strings. Null is permitted only
where explicitly specified (owner, indication fields and inherited removedAt).
Entry is the POST communication response shape; Account is UserSummary plus
createdAt/updatedAt. Safe User role/name data reflects current account state,
not a historical role snapshot. Preserve immutable author and submitter IDs.

Requester GET /tickets retains the Lab 2 pagination/query/filterOptions envelope.
GET /categories and /related-systems retain Lab 2 active-only reference arrays;
queue filter reference items use `{id,name,isActive}`. Staff attachment listing
returns the existing bare `AttachmentMetadata[]` array (verified in
server/src/attachments/attachment-handlers.ts); upload/removal retain a single
AttachmentMetadata object. Content returns protected bytes rather than JSON. No undeclared
raw Prisma records may be used to fill a DTO.

The data issue owns schema migration, provisioning and shared password-hash
helper tests; the authentication issue reuses that helper. Mechanical Prisma
call-site/seed updates needed after renaming Requester to User belong in the data
issue and must keep existing Lab 2 tests working until authentication is integrated.
Do not weaken authorization tests to accommodate a staging increment. Final
Requester migration removes the temporary selector/header path completely.
