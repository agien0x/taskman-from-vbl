import { Header } from './Header'
import { Footer } from './Footer'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Контент приложения */}
      </main>
      <Footer />
    </div>
  )
}