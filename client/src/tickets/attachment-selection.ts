export const MAX_ATTACHMENT_COUNT = 5
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024

const allowedTypes: Record<string, readonly string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
}

export function attachmentKey(file: File) {
  return [file.name, file.size, file.lastModified].join(':')
}

export function validateAttachment(file: File) {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return 'File exceeds the 5 MiB size limit.'
  }
  if (file.size === 0) return 'Empty files are not supported.'

  const extension = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    : ''
  const extensions = allowedTypes[file.type]
  if (!extensions || !extensions.includes(extension)) {
    return 'Use JPEG, PNG, WEBP, or PDF with a matching file extension.'
  }
  return null
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KiB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MiB'
}
