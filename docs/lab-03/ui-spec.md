# Lab 3 UI Contract

Status: Proposed contract for Issue #33 review; not implemented.
Reuse [Lab 2 design tokens and components](../lab-02/ui-spec.md) without a new
visual system. Primary #006B3C, secondary #0B7A46, pale green #EAF6EF,
page #F5F7F6, surface white, text #18211D; retain semantic error/warning tokens.
Reuse AppShell, AppButton, TextField, SelectField, ReadOnlyField, TicketBadge,
FeedbackState and IconButton before introducing equivalent new components.

## 1. Routes and navigation

| Route | Screen / permitted role |
|---|---|
| /login | Anonymous login; authenticated users go to role home or password change |
| /change-password | Restricted session mandatory screen; also voluntary change for full sessions |
| /tickets | Requester My Tickets |
| /tickets/new | Requester Create Ticket |
| /tickets/:ticketNumber | Owned Requester Detail |
| /staff/tickets | IT Staff and Administrator queue; default home for both |
| /staff/tickets/:ticketNumber | IT Staff and Administrator Detail |
| /admin/users | Administrator User Management |

Remove /select-requester, selector and Change Requester. Legacy links redirect
to /login then the permitted home. AppShell shows current name/role, permitted
navigation, Change Password and Logout. Requester home is /tickets. Administrator
navigation shows Queue and Users; IT Staff never sees Users. A role-forbidden
route shows Forbidden with permitted-home action; it does not fetch protected
content. Every normal route first resolves /auth/me. Restricted sessions redirect
to /change-password with only logout available. 401 clears user-scoped caches and
sends to Login; 403 PASSWORD_CHANGE_REQUIRED sends to Change Password. Never
restore the old development ID. No arbitrary external return URL is accepted.

## 2. Screen contracts

| Screen / mode | Controls and behavior |
|---|---|
| Login / entry | Labeled email/password, show/hide password, submit. Busy disables repeat submission. Generic invalid/inactive credentials message: Cannot sign in with these credentials. Check your details or contact an Administrator. Show Retry-After feedback for 429. Successful login follows mustChangePassword then role home. |
| Change Password / edit | Current password, new password, confirmation, 15-128-character policy text, save. Validate matching/different/nonblank/max bytes; field feedback. Success rotates session and navigates home. Failed save retains new-password inputs only in mounted form memory. Clear sensitive fields on success/unmount. |
| My Tickets / view | Preserve Lab 2 controls and feedback, extend status choices to eight statuses. Authenticated requester identity is read-only. |
| Create Ticket / create | Preserve Lab 2 read-only generated fields, validation, idempotency and attachment handling. No requester-selection control. |
| Requester Detail / view | Preserve read-only Ticket/Attachment groups and owned attachment controls. Add public timeline and public composer. In eligible statuses show Problem Appears Resolved; confirm wording says IT Staff still performs formal resolution. Show submitted timestamp thereafter; no formal status selector and no Internal Notes DOM/query. |
| Staff Queue / view | Search, Category, Related System, Status, Requested Priority, IT Priority, Owner (including Unassigned), sort field/order, page size and pagination. Search applies on submit; filter/sort/page-size changes reset page to 1. Clear Filters resets all query defaults. Store query in URL, cancel/ignore stale responses. |
| Staff Detail / view + inline operation forms | Read-only request/classification/requester groups; Owner select with Claim for unassigned tickets, assign/reassign/unassign subject to rules; IT Priority select; allowed next-status select; explicit Save per operation. Show requested priority separately. Existing attachments read/download only. Show resolution indication. Public Comments and Internal Notes are separate labeled sections with distinct composers/buttons. |
| Users / list + create/edit panel | List Name, Email, Role, Status, Edit; name/email search and single optional role filter. Add User opens named panel with name/email/single role/status/initial password. Edit loads safe account/version into same panel; password reset is a distinct action with confirmation. No delete, history, bulk or mandatory pagination. |

Queue desktop columns: Ticket Number, Summary with Category, Created, Requested
Priority, IT Priority, Status, Owner and Open action. Updated remains available
as a sort option and in detail rather than widening the table. Mobile/tablet cards
show the same essential values with labels, readable wrapping and one detail link.
Missing owner displays Unassigned; owner-required status without owner additionally
shows Needs assignment. Name/email edits never alter immutable author identities.

## 3. Confirmations and feedback

Resolve/Close/Cancel/Reopen confirmations name the ticket and target status;
only confirmation sends confirmed=true. Cancel dismisses without mutation.
Requester resolution indication explains it is only a signal. User deactivation,
role changes and initial-password resets explain access/session consequences;
owner-unassignment consequence is included when relevant. Never offer user deletion.

All screens have explicit loading, safe error and retry states. Lists distinguish
no data from no matching results and provide Add/Create or Clear Filters as
appropriate. Mutation success is announced inline without losing context.
Validation appears beside fields; focus moves to first invalid control. 404
shows Not found; 403 shows Forbidden. 409 prompts Reload latest, preserves
recoverable draft text and does not automatically resubmit. On reload, show fresh
version/allowed actions before the user retries. Errors never expose raw API traces.

Comment content is plain text with preserved line breaks, never innerHTML or
rendered Markdown. Label composers Public: visible to Requester and Internal:
visible only to IT Staff and Administrator. A composer does not switch visibility
with a toggle, reducing accidental public posting. Disable duplicate submits,
preserve draft on failure, and reload the timeline after uncertain response delivery.

## 4. Responsive and accessibility rules

Desktop >=992px: full nav, constrained 1200px content, paired fields where readable.
Tablet 768-991px: compact navigation, queue cards and predominantly single-column
forms. Mobile <768px: accessible menu, single-column forms and stacked actions.
Support width 320px; evidence viewports are 1440x900, 820x1180 and 390x844, plus
320px overflow check. Wrap long names/titles/text, use min-width:0 in flexible
layouts, and never require horizontal page scrolling to reach actions.

Retain 16px body/14px metadata minimum, 44px control targets, semantic heading
order and table headers. Every input has a programmatic label. Use keyboard-operable
controls, visible focus, aria-current navigation, accessible dialog focus management
and return focus to the invoking action. Feedback uses role=status/alert as
appropriate. Status/role/priority badges include text, not color alone. Meet
WCAG AA text contrast under the inherited palette. Distinguish read-only fields
without making them look editable. Do not announce every keystroke as an error.

## 5. Visual inspection checklist and evidence

For each major screen, inspect role navigation, badges, editable/read-only style,
field validation, focus, text wrapping, clipping, overlap and horizontal overflow.
Record viewport, route, role, scenario and capture path; inspect actual images.
Capture authentication, staff-queue, staff-ticket-detail and user-management
folders under artifacts/lab-03/screenshots/, plus Requester regression evidence.
Test IDs: UI-01-07, STYLE-01, VIS-01 and corresponding E2E cases in tests.md.
Do not claim screenshots or visual checks exist until executed in Issue 8.
