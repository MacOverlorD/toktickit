import { useState } from 'react'
import { getHealth } from './api/health'

type SystemState = 'idle' | 'loading' | 'online' | 'offline'

function App() {
  const [systemState, setSystemState] = useState<SystemState>('idle')

  async function handleSystemCheck() {
    setSystemState('loading')

    try {
      await getHealth()
      setSystemState('online')
    } catch {
      setSystemState('offline')
    }
  }

  return (
    <main className="app-shell">
      <div className="container app-container">
        <header className="app-header">
          <p className="text-uppercase fw-semibold text-success mb-2">CPE334 Lab 1</p>
          <h1 className="display-5 fw-bold mb-1">TokTickIT</h1>
          <p className="lead text-secondary mb-0">IT Service Desk</p>
        </header>

        <section className="system-check" aria-labelledby="system-check-title">
          <div className="system-check-heading">
            <div>
              <h2 id="system-check-title" className="h4 mb-1">
                System check
              </h2>
              <p className="text-secondary mb-0">
                Verify that the TokTickIT API is available.
              </p>
            </div>

            <button
              className="btn btn-success check-button"
              type="button"
              disabled={systemState === 'loading'}
              onClick={handleSystemCheck}
            >
              {systemState === 'loading' ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    aria-hidden="true"
                  />
                  Checking...
                </>
              ) : (
                'Check System'
              )}
            </button>
          </div>

          {systemState === 'loading' && (
            <div className="status-panel status-loading" role="status" aria-live="polite">
              <p className="mb-0">Loading system status...</p>
            </div>
          )}

          {systemState === 'online' && (
            <div className="status-panel status-online" role="status" aria-live="polite">
              <p className="status-label mb-1">System Status</p>
              <p className="status-value mb-1">Online</p>
              <p className="mb-0">Connected to TokTickIT API.</p>
            </div>
          )}

          {systemState === 'offline' && (
            <div className="status-panel status-offline" role="alert">
              <p className="status-label mb-1">System Status</p>
              <p className="status-value mb-1">Offline</p>
              <p className="mb-0">Unable to connect to TokTickIT API.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
