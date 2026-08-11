import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CategoryList from '../../src/components/CategoryList'

describe('category list', () => {
  it('shows a loading state while categories are requested', () => {
    render(<CategoryList categories={[]} state="loading" onRetry={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading request categories...',
    )
  })

  it('renders the categories returned by the API', async () => {
    render(
      <CategoryList
        categories={[
          { id: 41, name: 'Identity Services' },
          { id: 73, name: 'Device Support' },
        ]}
        state="success"
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('Identity Services')).toBeInTheDocument()
    expect(screen.getByText('Device Support')).toBeInTheDocument()
    expect(screen.getByLabelText('Category ID 41')).toHaveTextContent('41')
    expect(screen.getByText('2 categories')).toBeInTheDocument()
    expect(screen.getByLabelText('IT request categories')).toHaveTextContent(
      'Identity Services',
    )
  })

  it('shows an error and requests a retry', () => {
    const onRetry = vi.fn()
    render(<CategoryList categories={[]} state="error" onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to load request categories from the API.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })
})
