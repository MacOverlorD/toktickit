import { useState } from 'react'
import { getCategories, type Category } from '../api/categories'
import { getHealth } from '../api/health'
import CategoryList from '../components/CategoryList'

type SystemState = 'idle' | 'loading' | 'online' | 'offline'

function SystemCheckPage() {
  const [systemState, setSystemState] = useState<SystemState>('idle')
  const [categories, setCategories] = useState<Category[]>([])

  async function handleSystemCheck() {
    setSystemState('loading')
    setCategories([])

    try {
      const [, categoryData] = await Promise.all([getHealth(), getCategories()])
      setCategories(categoryData)
      setSystemState('online')
    } catch {
      setSystemState('offline')
    }
  }

  return (
    <div className={'page-container page-container-narrow'}>
      <header className={'page-header'}>
        <p className={'page-kicker'}>IT Service Desk</p>
        <h1>TokTickIT</h1>
        <p className={'page-description'}>System foundation</p>
      </header>

      <section className={'system-check'} aria-labelledby={'system-check-title'}>
        <div className={'system-check-heading'}>
          <div>
            <h2 id={'system-check-title'}>System check</h2>
            <p className={'text-muted'}>Verify that the TokTickIT API is available.</p>
          </div>

          <button
            className={'app-button app-button-primary check-button'}
            type={'button'}
            disabled={systemState === 'loading'}
            onClick={handleSystemCheck}
          >
            {systemState === 'loading' ? (
              <>
                <span className={'spinner-border spinner-border-sm'} aria-hidden={'true'} />
                Checking...
              </>
            ) : (
              'Check System'
            )}
          </button>
        </div>

        {systemState === 'loading' && (
          <div className={'status-panel status-loading'} role={'status'} aria-live={'polite'}>
            <p>Loading system status...</p>
          </div>
        )}

        {systemState === 'online' && (
          <div className={'status-panel status-online'} role={'status'} aria-live={'polite'}>
            <p className={'status-label'}>System Status</p>
            <p className={'status-value'}>Online</p>
            <p>Connected to TokTickIT API.</p>
          </div>
        )}

        {systemState === 'offline' && (
          <div className={'status-panel status-offline'} role={'alert'}>
            <p className={'status-label'}>System Status</p>
            <p className={'status-value'}>Offline</p>
            <p>Unable to connect to TokTickIT API.</p>
          </div>
        )}
      </section>

      {systemState !== 'idle' && (
        <CategoryList
          categories={categories}
          state={
            systemState === 'online'
              ? 'success'
              : systemState === 'offline'
                ? 'error'
                : 'loading'
          }
          onRetry={handleSystemCheck}
        />
      )}
    </div>
  )
}

export default SystemCheckPage
