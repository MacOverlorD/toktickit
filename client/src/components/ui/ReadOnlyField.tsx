import { LockKeyhole } from 'lucide-react'
import { useId } from 'react'

interface ReadOnlyFieldProps {
  id?: string
  label: string
  value: string
}

function ReadOnlyField({ id, label, value }: ReadOnlyFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <div className={'field-group'}>
      <label className={'field-label readonly-label'} htmlFor={fieldId}>
        {label}
        <span className={'readonly-indicator'}>
          <LockKeyhole aria-hidden={'true'} />
          Read-only
        </span>
      </label>
      <input
        className={'text-field readonly-field'}
        id={fieldId}
        value={value}
        readOnly
        aria-readonly={'true'}
      />
    </div>
  )
}

export default ReadOnlyField
