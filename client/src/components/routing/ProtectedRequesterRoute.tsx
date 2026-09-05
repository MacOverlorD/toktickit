import { Navigate, Outlet } from 'react-router-dom'
import { useRequester } from '../../requesters/RequesterContext'
import { AppButton, FeedbackState } from '../ui'

function ProtectedRequesterRoute() {
  const { loadStatus, refreshRequesters, selectedRequester } = useRequester()

  if (loadStatus === 'loading') {
    return (
      <div className={'page-container'}>
        <FeedbackState
          variant={'loading'}
          title={'Verifying requester'}
          message={'Checking the Development Requester for this browser tab.'}
        />
      </div>
    )
  }

  if (loadStatus === 'error') {
    return (
      <div className={'page-container'}>
        <FeedbackState
          variant={'error'}
          title={'Requester verification unavailable'}
          message={'We could not verify the Development Requester. Please try again.'}
          action={
            <AppButton
              variant={'secondary'}
              onClick={() => void refreshRequesters().catch(() => undefined)}
            >
              Retry
            </AppButton>
          }
        />
      </div>
    )
  }

  if (!selectedRequester) {
    return <Navigate to={'/select-requester'} replace />
  }

  return <Outlet />
}

export default ProtectedRequesterRoute
