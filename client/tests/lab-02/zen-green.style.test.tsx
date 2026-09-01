import { Download } from 'lucide-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  AppButton,
  FeedbackState,
  IconButton,
  ReadOnlyField,
  TextField,
  TicketBadge,
} from '../../src/components/ui'
import {
  responsiveBreakpoints,
  zenGreenCssProperties,
  zenGreenTokens,
} from '../../src/styles/tokens'

const stylesheet = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')

describe('Zen Green style contract', () => {
  it('defines every approved semantic color token exactly', () => {
    expect(zenGreenTokens).toMatchObject({
      primary: '#006B3C',
      secondary: '#0B7A46',
      paleGreen: '#EAF6EF',
      page: '#F5F7F6',
      surface: '#FFFFFF',
      text: '#18211D',
      error: '#842029',
      warning: '#805B10',
      success: '#135C35',
    })
    expect(zenGreenCssProperties).toMatchObject({
      '--color-primary': '#006B3C',
      '--color-readonly': '#EEF2EF',
      '--color-focus': '#0B7A46',
    })
  })

  it('defines the approved responsive viewport boundaries without gaps', () => {
    expect(responsiveBreakpoints).toEqual({
      mobileMax: 767,
      tabletMin: 768,
      tabletMax: 991,
      desktopMin: 992,
    })
    expect(stylesheet).toContain('@media (max-width: 991px)')
    expect(stylesheet).toContain('@media (max-width: 767px)')
    expect(stylesheet).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-focus\)/s)
    expect(stylesheet).toMatch(/body\s*\{[^}]*overflow-x:\s*hidden/s)
    expect(stylesheet).toContain('--control-height: 44px;')
  })
})

describe('shared field conventions', () => {
  it('links required and field-level error presentation to an editable field', () => {
    render(
      <TextField
        id={'summary'}
        label={'Ticket Summary'}
        required
        error={'Summary must contain 5 to 120 characters.'}
      />,
    )

    const input = screen.getByLabelText(/Ticket Summary/)

    expect(input).toHaveClass('text-field', 'is-invalid')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'summary-error')
    expect(screen.getByText('Summary must contain 5 to 120 characters.')).toHaveClass(
      'field-error',
    )
    expect(screen.getByLabelText('required')).toHaveTextContent('*')
  })

  it('distinguishes read-only values in markup and styling', () => {
    render(<ReadOnlyField label={'Ticket Number'} value={'Assigned after submission'} />)

    const input = screen.getByLabelText(/Ticket Number/)

    expect(input).toHaveAttribute('readonly')
    expect(input).toHaveAttribute('aria-readonly', 'true')
    expect(input).toHaveClass('readonly-field')
    expect(screen.getByText('Read-only')).toBeInTheDocument()
  })
})

describe('shared action, badge, and feedback conventions', () => {
  it('exposes primary, secondary, tertiary, destructive, disabled, and busy buttons', () => {
    render(
      <>
        <AppButton>Submit</AppButton>
        <AppButton variant={'secondary'}>Cancel</AppButton>
        <AppButton variant={'tertiary'}>Clear</AppButton>
        <AppButton variant={'destructive'}>Remove</AppButton>
        <AppButton disabled>Disabled</AppButton>
        <AppButton busy busyLabel={'Creating ticket...'}>Submit</AppButton>
      </>,
    )

    expect(screen.getByRole('button', { name: 'Submit' })).toHaveClass(
      'app-button-primary',
    )
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass(
      'app-button-secondary',
    )
    expect(screen.getByRole('button', { name: 'Clear' })).toHaveClass(
      'app-button-tertiary',
    )
    expect(screen.getByRole('button', { name: 'Remove' })).toHaveClass(
      'app-button-destructive',
    )
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Creating ticket...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Creating ticket...' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it('provides a named icon control with a tooltip', () => {
    render(<IconButton label={'Download attachment'} icon={<Download />} />)

    expect(screen.getByRole('button', { name: 'Download attachment' })).toBeInTheDocument()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Download attachment')
  })

  it('uses text and icons as non-color status and priority indicators', () => {
    render(
      <>
        <TicketBadge kind={'status'} value={'NEW'} />
        <TicketBadge kind={'priority'} value={'URGENT'} />
      </>,
    )

    expect(screen.getByLabelText('Status: New')).toHaveTextContent('New')
    expect(screen.getByLabelText('Requested priority: Urgent')).toHaveTextContent(
      'Urgent',
    )
    expect(screen.getByLabelText('Status: New').querySelector('svg')).not.toBeNull()
    expect(screen.getByLabelText('Requested priority: Urgent').querySelector('svg')).not.toBeNull()
  })

  it.each([
    ['loading', 'Loading tickets'],
    ['empty', 'No tickets yet'],
    ['no-results', 'No matching tickets'],
    ['error', 'Tickets unavailable'],
    ['success', 'Ticket created'],
  ] as const)('renders the %s feedback presentation', (variant, title) => {
    render(
      <FeedbackState
        variant={variant}
        title={title}
        message={'State-specific supporting message.'}
      />,
    )

    expect(screen.getByRole(variant === 'error' ? 'alert' : 'status')).toHaveTextContent(
      title,
    )
  })
})
