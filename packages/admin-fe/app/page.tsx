
"use client"

import LoginPage from "@/components/login-page"
import AdminFeatureVault from "@/components/landing/AdminFeatureVault"
import { Footer7 } from "@/components/footer"
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm"
      >
        {/* full-width container that becomes edge-to-edge on small screens */}
        <div className="w-full px-0 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <img
              src="https://pub-6c77e16531784985b618e038085ecd96.r2.dev/logo.png"
              alt="SwarajDesk Logo"
              className="h-12 w-auto block"
            />
          </div>
        </div>
      </motion.header>

      {/* Main Content - uses the new LoginPage component */}
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex-1">
        <LoginPage />
        <motion.div initial={{ y: 12, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <AdminFeatureVault />
        </motion.div>
      </motion.main>

      {/* Footer */}
      <Footer7 />
    </div>
  )
}
