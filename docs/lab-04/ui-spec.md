# Lab 4 UI Specification

Status: approved in PR #63 and normative for implementation.

## 1. Shared design behavior

Lab 4 extends the existing Zen Green application shell and tokens rather than creating a second visual system. Navigation shows exactly one role-appropriate dashboard destination and preserves active-page indication, current user/role, logout, and mandatory password-change behavior.

All controls have programmatic labels, visible keyboard focus, logical tab order, non-color status meaning, and at least 44px practical touch targets where space permits. Success and error messages use an accessible live region without moving focus unexpectedly; validation moves focus to the first invalid field.

## 2. Ticket Detail: Actions Taken

The Actions section appears after the Ticket summary and before or alongside communication history according to available width. It contains:

- a heading and Action count;
- operational “Add action” control for Staff/Admin only;
- deterministic Action cards/timeline entries showing work time, status, description, result, creator, assignee (operational view), actual performer, follow-up information, and attachment notes;
- role-safe Requester projection with no edit/assignment controls;
- operational controls allowed by the current Action state and current version.

Create/edit uses labeled date-time, description, result, assignee, follow-up checkbox, conditional follow-up note, and attachment-notes controls. Creator is the signed-in user and read-only; performer displays Not completed until completion and is then the completing user. Completion states that the signed-in user will be recorded as performer. Result becomes required for completion. Terminal records are visibly read-only under D-04.

Required modes: loading, empty, view, create, edit, assigning, starting, completing, cancelling, submitting, validation error, success, stale conflict, forbidden, missing, and safe unexpected failure. Draft values survive recoverable failure. Submit controls disable while pending and repeated activation uses the same idempotency key.

## 3. Ticket workflow controls

Ticket Detail presents only transitions currently permitted by role/state, with confirmation for destructive or terminal changes. Resolution explains the Action prerequisite before submission. A 409 gate failure keeps the page usable, announces the reason, and links/focuses the Actions section. The backend remains authoritative even when a control is hidden.

## 4. Requester Dashboard

Route: `/dashboard`. Requester navigation label: “Dashboard”. Content order:

1. concise welcome/context;
2. metric cards for open, waiting for you, and resolved in the last 7 days;
3. attention list;
4. recently updated Tickets.

Every meaningful metric/list entry links to My Tickets with supported filters or to owned Ticket Detail. Empty accounts show zeros plus a Create Ticket action. Cross-owner or role-forbidden direct routes render the existing safe access behavior.

## 5. Operational Dashboard

Route: `/staff/dashboard`. Content order:

1. unassigned and owned-by-me metric cards;
2. status and IT-priority summaries;
3. separate Assigned to me and Completed by me in the last 7 days figures plus the assigned-Action list;
4. recent/urgent work list;
5. optional Administrator account summary.

Drill-down links preserve metric meaning through Staff Queue filters or Ticket Detail. Dense data uses stacked cards on narrow widths rather than a mega-grid.

## 6. Responsive behavior

- Desktop >= 992px: balanced multi-column summary, readable bounded content width.
- Tablet 768-991px: two-column metrics and stacked detail panels where needed.
- Mobile < 768px: single-column reading order, full-width primary actions, compact metadata wrapping.
- 320px audit: no page-level horizontal scroll, clipped controls, overlapping badges, or inaccessible dialogs.

Tables, if retained, must have a card/list alternative or internal overflow with clear context. Dialogs fit the viewport and return focus to the invoking control. Long unbroken text wraps safely.

## 7. Evidence checklist

Capture desktop, tablet, mobile, and 320px examples for Actions empty/populated/edit/conflict, resolution gate, Requester dashboard zero/nonzero, operational dashboard zero/nonzero, and forbidden/safe-failure states. Screenshots support—but do not replace—automated semantic, keyboard, authorization, and responsive checks.
