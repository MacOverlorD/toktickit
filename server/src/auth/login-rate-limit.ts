import { ApiError } from '../errors/api-error.js'

const WINDOW_MS = 15 * 60 * 1000
const EMAIL_LIMIT = 10
const IP_LIMIT = 100
const MAX_BUCKETS = 10_000

interface Bucket {
  failures: number[]
}

function retryAfterSeconds(bucket: Bucket, now: number) {
  return Math.max(1, Math.ceil((bucket.failures[0] + WINDOW_MS - now) / 1000))
}

export class LoginRateLimiter {
  private readonly emailBuckets = new Map<string, Bucket>()
  private readonly ipBuckets = new Map<string, Bucket>()

  private prune(map: Map<string, Bucket>, key: string, now: number) {
    const bucket = map.get(key)
    if (!bucket) return null
    bucket.failures = bucket.failures.filter((time) => now - time < WINDOW_MS)
    if (bucket.failures.length === 0) {
      map.delete(key)
      return null
    }
    return bucket
  }

  private bucket(map: Map<string, Bucket>, key: string, now: number) {
    const existing = this.prune(map, key, now)
    if (existing) return existing
    if (this.emailBuckets.size + this.ipBuckets.size >= MAX_BUCKETS) {
      throw new ApiError(
        429,
        'TOO_MANY_ATTEMPTS',
        'Too many sign-in attempts. Try again later.',
      )
    }
    const created = { failures: [] }
    map.set(key, created)
    return created
  }

  check(email: string, ip: string, now = Date.now()) {
    const emailBucket = this.prune(this.emailBuckets, email, now)
    const ipBucket = this.prune(this.ipBuckets, ip, now)
    const blocked =
      emailBucket && emailBucket.failures.length >= EMAIL_LIMIT
        ? emailBucket
        : ipBucket && ipBucket.failures.length >= IP_LIMIT
          ? ipBucket
          : null

    if (blocked) {
      throw new ApiError(
        429,
        'TOO_MANY_ATTEMPTS',
        'Too many sign-in attempts. Try again later.',
        undefined,
        { retryAfterSeconds: retryAfterSeconds(blocked, now) },
      )
    }
  }

  recordFailure(email: string, ip: string, now = Date.now()) {
    // Recheck synchronously before recording so concurrent password checks
    // cannot all pass the earlier admission check.
    this.check(email, ip, now)
    this.bucket(this.emailBuckets, email, now).failures.push(now)
    this.bucket(this.ipBuckets, ip, now).failures.push(now)
  }

  clearEmail(email: string) {
    this.emailBuckets.delete(email)
  }

  reset() {
    this.emailBuckets.clear()
    this.ipBuckets.clear()
  }
}

export const loginRateLimiter = new LoginRateLimiter()
