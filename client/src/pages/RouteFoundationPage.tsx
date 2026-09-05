interface RouteFoundationPageProps {
  title: string
  description: string
}

function RouteFoundationPage({ title, description }: RouteFoundationPageProps) {
  return (
    <div className={'page-container'}>
      <header className={'page-header'}>
        <h1>{title}</h1>
        <p className={'page-description'}>{description}</p>
      </header>
    </div>
  )
}

export default RouteFoundationPage
