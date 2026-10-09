# Release dependency security assessment

Status: compatible patch remediation completed; Prisma-tooling advisory remains disclosed for peer assessment. No claim of a zero-advisory dependency tree is made.

During Issue #62, the fresh lockfile install reported new advisories that were not represented by the earlier functional-test evidence. Scoped updates retain the existing major versions and Prisma 6.19.3 schema/client contract.

- Server: patch updates for `proxy-addr` (critical IP-spoofing advisory), `multer` (aborted-upload disk-write advisory), `qs`, `source-map-js`, and Vitest 4.1.11.
- Client: Vitest 4.1.11, `source-map-js` and `undici` patches. Post-update client audit reports zero advisories.
- Root test dependencies: audit reports zero advisories.
- Remaining server tree: three high-severity package entries (`deepmerge-ts`, `@prisma/config`, `prisma`) describe one underlying recursive-object stack-exhaustion advisory. `npm explain deepmerge-ts` identifies `prisma -> @prisma/config -> deepmerge-ts@7.1.5`; Prisma is a development dependency, also retained via the client's optional Prisma peer. This is why `npm audit --omit=dev` may still list it; it must not be described as an audit-clean production tree.

The app does not import the configuration merger or accept arbitrary Prisma configuration from HTTP clients. This limits the identified app exposure, but does not eliminate the tooling advisory. Use only the repository's trusted Prisma config; do not merge untrusted cyclic objects into it. Downgrading Prisma to the audit suggestion (6.12.0) or overriding its pinned merger with a major release is not a safe automatic patch. The reviewer must assess this residual risk explicitly; a separate validated Prisma upgrade is preferable to a forced downgrade.

Primary advisory sources:

- [proxy-addr GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h): patched at 2.0.8. The app has no custom `trust proxy` configuration, but patching the dependency avoids relying solely on configuration assumptions.
- [deepmerge-ts GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx): recursive-object stack exhaustion; patched in major version 8.

The host's npm 10.9.3 initially crashed in optional Vitest peer resolution (`edgesOut`). Pinning the compatible Vitest patch, resolving once with legacy peers, then regenerating the lockfile with normal resolution avoids persisting an incomplete legacy-peer lockfile. A candidate run then exposed a missing top-level Vite peer needed by `@vitest/mocker`; Vite 8 is now an explicit server **development/test** dependency, not server application code. Ordinary `npm ci` is the required reproducibility check. Test and build results for these exact lockfiles are recorded separately; the prior PR #70 results are not used to approve updated dependencies.
