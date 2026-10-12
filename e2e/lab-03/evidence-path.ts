export function lab3EvidencePath(relativePath: string) {
  const root = process.env.PROMOTE_E2E_EVIDENCE === '1'
    ? 'artifacts/lab-03'
    : 'artifacts/lab-03/test-results/visual-captures'
  return `${root}/${relativePath}`
}
