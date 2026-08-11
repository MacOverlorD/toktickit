import { render, screen } from '@testing-library/react'
import { beforeEach, vi } from 'vitest'
import App from '../../src/App'
import { getCategories } from '../../src/api/categories'

vi.mock('../../src/api/categories', () => ({
  getCategories: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getCategories).mockResolvedValue([])
})

describe('App', () => {
  it('shows the application name', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'TokTickIT' })).toBeInTheDocument()
  })
})
