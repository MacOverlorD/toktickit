import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App'

beforeEach(() => {
  window.history.replaceState({}, '', '/tickets')
})

afterEach(() => {
  window.history.replaceState({}, '', '/')
})

describe('application shell accessibility', () => {
  it('provides landmarks, skip navigation, identity, and active-page state', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    )
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    expect(screen.getByLabelText('TokTickIT home')).toBeInTheDocument()
    expect(screen.getByText('Lab 2 testing user')).toBeInTheDocument()
    expect(screen.getByText('Not selected')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My Tickets' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('heading', { name: 'My Tickets' })).toBeInTheDocument()
  })

  it('opens the mobile menu and closes it after route navigation', async () => {
    render(<App />)

    const menuButton = screen.getByRole('button', { name: 'Open navigation' })
    const navigationContent = document.getElementById('primary-navigation')

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(menuButton).toHaveAttribute('aria-controls', 'primary-navigation')
    expect(navigationContent).not.toHaveClass('is-open')

    fireEvent.click(menuButton)

    expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(navigationContent).toHaveClass('is-open')

    fireEvent.click(screen.getByRole('link', { name: 'Create Ticket' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    })
    expect(navigationContent).not.toHaveClass('is-open')
    expect(screen.getByRole('heading', { name: 'Create Ticket' })).toBeInTheDocument()
  })

  it('navigates with semantic links and updates the active page', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Create Ticket' }))

    expect(screen.getByRole('heading', { name: 'Create Ticket' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Ticket' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})
