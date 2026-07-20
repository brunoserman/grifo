import AppShell from './components/AppShell'
import ReaderRoute from './routes/ReaderRoute'
import ShareRoute from './routes/ShareRoute'

// The list shell is always mounted, so its tab and search state survive while a
// reading view or the share landing is shown on top as an overlay route.
export default function App() {
  return (
    <>
      <AppShell />
      <ReaderRoute />
      <ShareRoute />
    </>
  )
}
