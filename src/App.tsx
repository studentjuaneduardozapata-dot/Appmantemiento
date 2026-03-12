import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { SyncProvider } from '@/contexts/SyncContext'
import { AppRouter } from '@/app/AppRouter'
import { UpdatePrompt } from '@/components/shared/UpdatePrompt'

export default function App() {
  return (
    <BrowserRouter>
      <SyncProvider>
        <AppRouter />
        <Toaster position="top-center" richColors closeButton />
        <UpdatePrompt />
      </SyncProvider>
    </BrowserRouter>
  )
}
