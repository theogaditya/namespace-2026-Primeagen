
import LoginPage from "@/components/login-page"
import { Footer7 } from "@/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
        {/* full-width container that becomes edge-to-edge on small screens */}
        <div className="w-full px-0 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <img
              src="https://swarajdesk.adityahota.online/logo.png"
              alt="SwarajDesk Logo"
              className="h-16 w-auto block"
            />
          </div>
        </div>
      </header>

      {/* Main Content - uses the new LoginPage component */}
      <main className="flex-1">
        <LoginPage />
      </main>

      {/* Footer */}
      <Footer7 />
    </div>
  )
}
