import { describe, expect, it, vi } from 'vitest'
import { removeE2EAttachmentFile } from '../../../e2e/lab-02/database.js'

describe('Lab 2 E2E attachment cleanup policy', () => {
  it('accepts a file that was already removed', async () => {
    const removeFile = vi.fn().mockRejectedValue(
      Object.assign(new Error('missing'), { code: 'ENOENT' }),
    )

    await expect(removeE2EAttachmentFile('safe-test-file.pdf', removeFile))
      .resolves.toBeUndefined()
  })

  it('surfaces filesystem failures other than a missing file', async () => {
    const failure = Object.assign(new Error('permission denied'), {
      code: 'EACCES',
    })
    const removeFile = vi.fn().mockRejectedValue(failure)

    await expect(removeE2EAttachmentFile('safe-test-file.pdf', removeFile))
      .rejects.toBe(failure)
  })

  it('rejects unsafe stored filenames before touching the filesystem', async () => {
    const removeFile = vi.fn()

    await expect(removeE2EAttachmentFile('../outside.pdf', removeFile))
      .rejects.toThrow('unsafe E2E attachment filename')
    expect(removeFile).not.toHaveBeenCalled()
  })
})
