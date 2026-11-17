import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './App'
import { AppProvider } from './state'
import { DownloadProgressWindow } from './components/DownloadProgressWindow'

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

createRoot(container).render(
  <AppProvider>
    {new URLSearchParams(location.search).get('mode') === 'progress'
      ? <DownloadProgressWindow taskId={new URLSearchParams(location.search).get('task') || ''} />
      : <App />}
  </AppProvider>
)
