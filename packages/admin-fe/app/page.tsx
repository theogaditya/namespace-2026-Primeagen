
import { LoginForm } from "@/components/login-form"
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
            <span className="ml-3 text-xl font-semibold text-gray-800">Admin Portal</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center mb-20">
          <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl px-4 sm:px-6 md:px-8 py-6">
            <LoginForm />
          </div>
      </main>
        {/* Footer */}
        <Footer7 />
    </div>
  )
}
