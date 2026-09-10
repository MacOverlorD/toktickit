# Lab 3 UI Specification

Status: Draft screen inventory for Issue #33.
Reuse [Lab 2 UI conventions](../lab-02/ui-spec.md), client/src/styles.css,
client/src/styles/tokens.ts and existing components/ui and layout/AppShell.

| Screen | Modes and required controls |
|---|---|
| Login | Email/password, validation, busy, safe invalid/inactive failure |
| Mandatory Change Password | Rules, new password and confirmation, validation, save, successful role destination |
| Authenticated shell | Current name/role, role-specific destinations, logout, permitted password actions |
| Requester create/list/detail | Preserve Lab 2 workflows; remove selector; add public comments and resolution indication to detail |
| Staff Queue | Search/filter/sort/page; ownership/status/priorities; open detail; desktop table and smaller-screen list |
| Staff Detail | Read-only request groups, operational owner/IT Priority/status controls, attachments, distinct Public Comments/Internal Notes |
| User Management | List/search, optional role filter, create/edit account, role/status, new initial password and account safety feedback |

## Shared requirements

All applicable screens provide loading/saving, validation, success, empty/no-results,
forbidden, not-found, conflict and safe API-failure feedback. Preserve recoverable
input. Use text as well as badges/color, field-adjacent validation, visible keyboard
focus, semantic labels and accessible status announcements. Keep read-only fields
distinct from editable fields and internal communication distinct from public.

## Work remaining before approval

- Final route map and role redirects, including first-login restricted navigation.
- Detailed controls/fields, queue columns/filter selections and confirmation behavior.
- Screen-specific failures, focus movement and retry behavior.
- Explicit desktop/tablet/mobile viewport and layout rules inherited from Lab 2.
- Test IDs and visual checklist per screen, with evidence under artifacts/lab-03/screenshots/.
