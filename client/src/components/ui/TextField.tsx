import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

function TextField({
  id,
  label,
  hint,
  error,
  required,
  className = '',
  'aria-describedby': ariaDescribedBy,
  ...inputProps
}: TextFieldProps) {
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
      <input
        {...inputProps}
        id={fieldId}
        className={`text-field${error ? ' is-invalid' : ''} ${className}`.trim()}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
      />
      {hint && <p className={'field-hint'} id={hintId}>{hint}</p>}
      {error && <p className={'field-error'} id={errorId}>{error}</p>}
    </div>
  )
}

export default TextField
