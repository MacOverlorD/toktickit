import '@testing-library/jest-dom/vitest'
import { beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(
      new Error('Unexpected network request in a client unit test.'),
    ),
  )
})
