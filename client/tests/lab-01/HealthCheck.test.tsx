import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('system health check', () => {
  it('shows a loading state while the request is pending', () => {
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
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/health')
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
})
