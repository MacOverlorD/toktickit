# Lab 2 Zen Green UI Specification

Status: Approved for implementation by the student on 2026-09-01  
Related contracts: [specification.md](./specification.md),
[api-spec.md](./api-spec.md)

## 1. Design Intent

TokTickIT is a work-focused service desk. The interface is quiet, compact,
predictable, and optimized for repeated ticket entry and scanning. It shall not
use marketing heroes, decorative illustration, nested cards, oversized type,
or color as the only state indicator.

## 2. Design Tokens

### Color

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#006B3C` | Header, primary action, strongest emphasis |
| `--color-secondary` | `#0B7A46` | Active navigation, links, focus accents, hover |
| `--color-pale-green` | `#EAF6EF` | Selection, success background, subtle emphasis |
| `--color-page` | `#F5F7F6` | Page background |
| `--color-surface` | `#FFFFFF` | Forms, table surfaces, dialogs |
| `--color-text` | `#18211D` | Primary text |
| `--color-text-muted` | `#54635B` | Secondary text and metadata |
| `--color-border` | `#CDD6D1` | Neutral borders and dividers |
| `--color-readonly` | `#EEF2EF` | Read-only field background |
| `--color-error` | `#842029` | Error text/border |
| `--color-error-bg` | `#FBEAEC` | Error callout background |
| `--color-warning` | `#805B10` | Warning text/icon |
| `--color-warning-bg` | `#FFF4D6` | Warning callout background |
| `--color-success` | `#135C35` | Success text/icon |
| `--color-success-bg` | `#EAF6EF` | Success callout background |
| `--color-focus` | `#0B7A46` | Focus outline |

All text/background pairs must meet WCAG AA contrast for their rendered size.
Bootstrap semantic colors are overridden where necessary to use these tokens.

### Typography

- Font stack: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Body: 16 px, line-height 1.5. Small metadata: 14 px minimum.
- Page heading: 30 px desktop, 26 px tablet/mobile; section heading: 22 px;
  compact panel/card heading: 18 px. Font size does not scale with viewport width.
- Use weight 700 for page headings, 600 for labels/actions, 400 for body.
- Letter spacing is `0`; do not use all-uppercase paragraphs.

### Spacing, shape, and depth

- Spacing scale: 4, 8, 12, 16, 24, 32, and 48 px.
- Control height: minimum 44 px; icon-only target: 44 by 44 px.
- Surface radius: 6 px; controls: 4 px; badges: 4 px; no pill controls except
  compact status tags when required by Bootstrap semantics.
- Surface border: 1 px neutral. Shadows are restrained and used only where
  elevation is functional, such as a dialog.
- Content maximum width: 1200 px; Create Ticket content maximum: 960 px.

## 3. Application Shell and Navigation

- Header shows the full `TokTickIT` identity as the strongest first-viewport
  product signal.
- Desktop/tablet navigation exposes My Tickets and Create Ticket with icon plus
  text, visible active state, and `aria-current="page"`.
- The current Development Requester name is visible in the shell with a Change
  Requester action. Supporting text labels this context `Lab 2 testing user`.
- Mobile uses a conventional menu button with an accessible name and Lucide icon
  when the icon library is introduced. The expanded menu is keyboard operable,
  traps no focus, and closes after navigation.
- Ticket routes without valid requester context redirect to `/select-requester`.
- Changing requester asks for confirmation only when an unsaved Create Ticket
  draft exists, then clears requester-owned view state and returns to My Tickets.

Routes:

| Screen | Route |
|---|---|
| Development Requester Selection | `/select-requester` |
| My Tickets | `/tickets` |
| Create Ticket | `/tickets/new` |
| Requester Ticket Detail | `/tickets/:ticketNumber` |

## 4. Shared Component Rules

### Fields

- Labels appear above fields and remain visible; placeholders never replace labels.
- Required editable labels include a visible `*` plus screen-reader text
  `required`. Optional fields are explicitly marked Optional when ambiguity exists.
- Editable fields are white with neutral border. Read-only fields use
  `--color-readonly`, a read-only icon or text hint, and cannot receive editable
  styling. Disabled controls use reduced emphasis but remain legible.
- Focus uses a 2 px `--color-focus` outline with at least 2 px offset.
- Invalid controls use error border and `aria-invalid="true"`; one concise message
  appears immediately below and is linked with `aria-describedby`.
- Server field errors map to the same controls. A top summary is added only when
  multiple fields fail and links to each invalid control.

### Buttons and commands

| Kind | Appearance and behavior |
|---|---|
| Primary | Solid primary green; one principal action per region |
| Secondary | White surface, primary border/text |
| Tertiary | Text/icon action with no decorative container |
| Destructive | Dark red; reserved for confirmed attachment removal |
| Disabled | Native disabled behavior, readable muted styling |
| Busy | Stable dimensions, spinner/icon plus progress verb, disabled |

Use familiar Lucide icons for search, filter, sort, menu, download, preview,
remove, and navigation. Icon-only actions require a tooltip and accessible name.
Button text does not change width enough to shift neighboring layout in busy state.

### Feedback and state presentations

- Loading: skeleton or spinner with `role="status"` and specific text.
- Error: concise safe message, error icon/text, and Retry where meaningful.
- Success: icon/title/body and next action; not color alone.
- Empty: explains there are no requester-owned tickets and offers Create Ticket.
- No results: explains filters found no match and offers Clear Filters.
- Not found: reveals no ownership detail and offers Back to My Tickets.
- Toasts may supplement but never replace persistent critical feedback.

### Badges

- Status `NEW`: pale green background, dark green text, visible label `New`.
- Priorities use both text and an icon/marker: Low neutral, Medium blue-green,
  High amber, Urgent dark red. Avoid treating requested priority as IT Priority.

## 5. Development Requester Selection

Required content:

- TokTickIT title and concise statement: `Select a Development Requester for
  Lab 2 testing. This is not a secure login.`
- Development Requester select control populated from the active-requester API.
- Continue primary action disabled until a valid option is selected.
- Loading state while requester data loads.
- Empty state when no active requester exists; Continue remains unavailable.
- Safe failure state with Retry.

Inactive users never appear. Restoring a valid session selection preselects that
requester; stale/inactive restoration clears storage and leaves the user on this
screen. Continue validates context before routing to My Tickets.

## 6. Create Ticket

### Fields and order

1. Ticket Number: read-only, `Assigned after submission` before creation.
2. Ticket Date: read-only, `Assigned by server after submission` before creation.
3. Requester: read-only selected name/email.
4. Category: required select from active reference data.
5. Related System: required select from active reference data.
6. Ticket Summary: required text, character count, 5-120 after trim.
7. Requested Priority: required segmented radio group or select with four values.
8. Description: required textarea, character count, 10-5,000 after trim.
9. Attachments: optional picker/queue with allowed formats, 5 MiB/file, five
   active/file limit stated beside the control.

Desktop may use two columns only for short paired fields; Summary, Description,
Attachments, feedback, and actions span full width. Mobile is one column.

### Attachment selection before submit

- Selected files show name, formatted size, type, validation state, and a Remove
  from selection icon action.
- Invalid files remain visible with their reason but are never uploaded.
- Duplicate selection is identified by name, size, and last-modified timestamp;
  the second selection is ignored with a message.
- Ticket is submitted first. Valid queued files then upload sequentially with
  Pending, Uploading, Uploaded, or Failed plus Retry.

### Screen states

| State | Required presentation |
|---|---|
| Initial | Empty editable fields, derived fields read-only, Submit enabled only when reference data is ready |
| Loading | Reference selects unavailable with specific loading message |
| Validation failure | Field messages and focus on first invalid field |
| Submitting | Stable `Creating ticket...` button; form controls protected from changes |
| Ticket success | Official number/date/status from API; link to detail/My Tickets |
| Upload partial failure | Ticket success remains; failed file and Retry are visible |
| API/network failure | Safe persistent error; editable values and selected files remain |

## 7. My Tickets

### Controls

- Search input with Search icon, label, 100-character boundary, and explicit
  submit or 300 ms debounced request. Clear Search is independently available.
- Filters: Category, Related System, Status, Requested Priority.
- Sort control exposes approved field plus direction. Mobile uses one labeled
  control group rather than relying on table-header interaction.
- Clear Filters resets search and all filters, returns page to 1, and preserves
  default sort. Any search/filter/sort/page-size change returns page to 1.
- Page size supports 10, 20, 50. Pagination states current page, total pages,
  total items, and disables invalid Previous/Next actions.

### Desktop table

Columns: Ticket Number, Created, Summary, Category, Related System, Requested
Priority, Status, Attachments, and Open action. Headers do not wrap incoherently;
Summary truncates visually with accessible full text. The whole row is not the
only link; Ticket Number and Open action are keyboard-accessible.

### Mobile representation

Each ticket is one flat repeated card/item with Ticket Number and Summary first,
then Created, Category/System, priority/status badges, attachment count, and Open.
Cards are not nested inside a parent card. Filters collapse into a labeled panel
without hiding active-filter indicators.

Loading retains stable control dimensions. An empty owner list and a filtered
no-results list follow the distinct shared states. API failure preserves controls
and provides Retry.

## 8. Requester Ticket Detail

- Header shows Ticket Number, New badge, Requested Priority, creation date, and
  Back to My Tickets.
- Information is grouped into Request, Classification, Requester, and Attachments
  using unframed sections/dividers or one flat detail surface, not nested cards.
- Ticket Number, Ticket Date, Requester, Category, Related System, Summary,
  Requested Priority, Description, and Current Status are read-only.
- Long Description wraps safely and preserves meaningful line breaks.
- Loading, safe not-found, and API failure states replace the detail content.

Changing requester while detail is open clears the old detail and navigates to
the new requester's My Tickets rather than briefly exposing prior data.

## 9. Attachment Section and Removal Dialog

Each metadata row/item shows original filename, formatted size, type, uploaded
date, and state. Active items expose Preview, Download, and Remove. Uploading
items show stable progress state. Invalid/failed selections show reason and Retry
where valid. Removed items show Removed, removal date, and reason; they expose no
Preview/Download action.

Add Attachment uses the same validation presentation as Create Ticket. The
control is disabled when five active attachments exist and explains the limit.

Removal uses an accessible modal dialog with:

- filename and irreversible-for-user explanation;
- required reason textarea, 5-250 character count;
- Cancel secondary and Remove Attachment destructive actions;
- focus initially on the dialog heading/reason, focus trapped while open, Escape
  cancels when not submitting, and focus returns to the triggering control;
- busy state `Removing...`; API failure leaves reason available for retry.

## 10. Responsive Behavior

| Range | Rules |
|---|---|
| Desktop `>= 992px` | Full header navigation, constrained content, optional paired form fields, My Tickets table |
| Tablet `768-991px` | Compact header/nav, mostly one-column form, table only if every required column fits without page overflow; otherwise cards |
| Mobile `< 768px` | Menu navigation, one-column fields, stacked/full-width primary actions, ticket cards, compact metadata, no page overflow |

- The application supports at least 320 px CSS viewport width.
- Fixed-format controls use stable min/max dimensions and grid constraints.
- Long Ticket Numbers, filenames, emails, and unbroken text use safe wrapping or
  middle/end truncation with accessible full value.
- Dialogs fit within viewport height and scroll internally when required.
- Keyboard focus and validation messages are never hidden behind sticky UI.

## 11. Accessibility Contract

- Use landmarks, one `h1` per screen, ordered headings, native labels, buttons,
  links, table elements, and dialog semantics.
- All actions are keyboard reachable in logical order. No click-only divs.
- Visible focus is never removed. Focus moves to the first invalid field after a
  failed submit and to the screen heading after route navigation.
- Loading/success use polite live regions; blocking failures use `role="alert"`.
- Icons are decorative when text exists; icon-only buttons have names/tooltips.
- Status, priority, invalidity, active navigation, and attachment state use text
  or symbols in addition to color.
- Inputs use suitable autocomplete attributes, but no password/login fields exist.
- Automated accessibility assertions supplement, not replace, keyboard review.

## 12. Visual Inspection Checklist

Complete this table during Issue 09 and link screenshot evidence in `tests.md`.

| Check | Desktop | Tablet | Mobile |
|---|---|---|---|
| Zen Green colors and hierarchy match tokens | Pass | Pass | Pass |
| Editable/read-only fields are distinct | Pass | Pass | Pass |
| Errors sit immediately below their field | Pass | Pass | Pass |
| Primary/secondary/destructive/busy actions are clear | Pass | Pass | Pass |
| No clipped labels, values, badges, or filenames | Pass | Pass | Pass |
| No incoherent overlap or layout shift | Pass | Pass | Pass |
| No unintended horizontal page overflow | Pass | Pass | Pass |
| Focus indicators and non-color states are visible | Pass | Pass | Pass |
| Empty, no-results, failure, and success states are legible | Pass | Pass | Pass |

## 13. Required Screenshot Paths

```text
artifacts/lab-02/screenshots/
  requester-selection/
    desktop-loading.png
    desktop-selection.png
    desktop-failure.png
  create-ticket/
    desktop-initial.png
    desktop-validation.png
    desktop-submitting.png
    desktop-success.png
    desktop-api-failure.png
    desktop-invalid-attachment.png
  my-tickets/
    desktop-list.png
    tablet-list.png
    mobile-list.png
    no-results.png
    empty.png
  ticket-detail/
    desktop-detail.png
    tablet-detail.png
    mobile-detail.png
    attachment-removed.png
```

Screenshots must contain test data only, remain readable without extreme zoom,
and be captured from the final integrated behavior. Generated runtime artifacts
are not substitutes for automated assertions.
