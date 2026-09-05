import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FeedbackState, {
  type FeedbackVariant,
} from '../../src/components/ui/FeedbackState'

const nonErrorVariants: FeedbackVariant[] = [
  'loading',
  'empty',
  'no-results',
  'success',
]

describe('shared feedback state semantics', () => {
  it.each(nonErrorVariants)('announces %s feedback politely', (variant) => {
    render(
      <FeedbackState
        variant={variant}
        title={variant + ' title'}
        message={variant + ' message'}
      />,
    )

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('heading', { name: variant + ' title' }))
      .toBeInTheDocument()
    expect(screen.getByText(variant + ' message')).toBeInTheDocument()
  })

  it('announces errors assertively and renders a recovery action', () => {
    render(
      <FeedbackState
        variant={'error'}
        title={'Tickets unavailable'}
        message={'Try again.'}
        action={<button type={'button'}>Retry</button>}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('marks only the loading icon as animated and decorative', () => {
    const { container } = render(
      <FeedbackState
        variant={'loading'}
        title={'Loading tickets'}
        message={'Please wait.'}
      />,
    )

    const icon = container.querySelector('svg')
    expect(icon).toHaveClass('is-spinning')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})
