import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { HEALTH_REQUEST_TIMEOUT_MS } from '../../src/api/health'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('system health check', () => {
  it('shows a loading state while the request is pending', () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>(() => {
          // The unresolved request keeps the component in its loading state.
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Check System' }))

    expect(screen.getByRole('status')).toHaveTextContent('Loading system status...')
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled()
  })

  it('shows Online after a valid health response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        service: 'TokTickIT API',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Check System' }))

    expect(await screen.findByText('Online')).toBeInTheDocument()
    expect(screen.getByText('Connected to TokTickIT API.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/health',
      expect.objectContaining({ signal: expect.anything() }),
    )
  })

  it('shows a useful error when the API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Check System' }))

    expect(await screen.findByText('Offline')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to connect to TokTickIT API.',
    )
  })

  it('shows a useful error when the API request times out', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn((_url: string, options?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The request timed out', 'AbortError'))
        })
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Check System' }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEALTH_REQUEST_TIMEOUT_MS)
    })

    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to connect to TokTickIT API.',
    )
  })
})
