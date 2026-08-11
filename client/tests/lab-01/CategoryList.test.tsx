import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCategories } from '../../src/api/categories'
import CategoryList from '../../src/components/CategoryList'

vi.mock('../../src/api/categories', () => ({
  getCategories: vi.fn(),
}))

const getCategoriesMock = vi.mocked(getCategories)

beforeEach(() => {
  getCategoriesMock.mockReset()
})

describe('category list', () => {
  it('shows a loading state while categories are requested', () => {
    getCategoriesMock.mockReturnValue(
      new Promise(() => {
        // Keep the request pending to verify the loading state.
      }),
    )

    render(<CategoryList />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading request categories...',
    )
  })

  it('renders the categories returned by the API', async () => {
    getCategoriesMock.mockResolvedValue([
      { id: 41, name: 'Identity Services' },
      { id: 73, name: 'Device Support' },
    ])

    render(<CategoryList />)

    expect(await screen.findByText('Identity Services')).toBeInTheDocument()
    expect(screen.getByText('Device Support')).toBeInTheDocument()
    expect(screen.getByLabelText('Category ID 41')).toHaveTextContent('41')
    expect(screen.getByText('2 categories')).toBeInTheDocument()
    expect(screen.getByLabelText('IT request categories')).toHaveTextContent(
      'Identity Services',
    )
    expect(getCategoriesMock).toHaveBeenCalledTimes(1)
  })

  it('shows an error and retries the category request', async () => {
    getCategoriesMock
      .mockRejectedValueOnce(new TypeError('Network error'))
      .mockResolvedValueOnce([{ id: 4, name: 'Network' }])

    render(<CategoryList />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load request categories from the API.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Network')).toBeInTheDocument()
    expect(getCategoriesMock).toHaveBeenCalledTimes(2)
  })
})
