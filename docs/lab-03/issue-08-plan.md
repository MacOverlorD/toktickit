# Issue #40 Integrated Verification Plan

Branch: `feature/3-08-integrated-verification` from `lab3-staging` merge `998cbeb`.

- Run the complete server, client, build and real PostgreSQL/Chromium suites.
- Preserve all feature-level tests and fix only failures reproduced on the integrated tree.
- Capture major authenticated and unauthenticated screens at 1440x900, 820x1180,
  390x844 and the 320x844 overflow boundary.
- Automate programmatic-label, keyboard-focus and page-overflow checks, then inspect
  the generated images for clipping, overlap, role leakage and Zen Green consistency.
- Record exact commands and results without claiming final-main release verification.

Status: implemented and verified; pending PR and peer review.
