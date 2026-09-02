import { useId, type SelectHTMLAttributes } from 'react'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  error?: string
}

function SelectField({
  id,
  label,
  hint,
  error,
  required,
  className = '',
  children,
  'aria-describedby': ariaDescribedBy,
  ...selectProps
}: SelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(' ')

  return (
    <div className={'field-group'}>
      <label className={'field-label'} htmlFor={fieldId}>
        {label}
        {required && (
          <span className={'required-marker'} aria-label={'required'}>*</span>
        )}
      </label>
      <select
        {...selectProps}
        id={fieldId}
        className={`select-field${error ? ' is-invalid' : ''} ${className}`.trim()}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
      >
        {children}
      </select>
      {hint && <p className={'field-hint'} id={hintId}>{hint}</p>}
      {error && <p className={'field-error'} id={errorId}>{error}</p>}
    </div>
  )
}

export default SelectField
