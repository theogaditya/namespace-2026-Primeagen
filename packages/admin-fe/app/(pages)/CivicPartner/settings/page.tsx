"use client"

import { CivicPartnerLayout } from "../_layout"
import { useCivicPartnerAuth } from "@/hooks/useCivicPartnerAuth"

export default function CivicPartnerSettingsPage() {
  const { partner, logout } = useCivicPartnerAuth()

  if (!partner) return null

  return (
    <CivicPartnerLayout>
      <div className="p-8 max-w-3xl space-y-8">
        <h2
          className="text-3xl font-extrabold text-[#003358] tracking-tight"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Settings
        </h2>

        {/* Organization Info */}
        <section
          className="bg-white p-8 rounded-xl"
          style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)", border: "1px solid rgba(193,199,208,0.1)" }}
        >
          <h3 className="text-lg font-bold text-[#003358] mb-6" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Organisation Profile
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-[#727780] uppercase tracking-wider mb-1">Organisation Name</p>
              <p className="text-sm font-semibold text-[#003358]">{partner.orgName}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#727780] uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm font-semibold text-[#003358]">{partner.officialEmail}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#727780] uppercase tracking-wider mb-1">Type</p>
              <p className="text-sm font-semibold text-[#003358]">{partner.orgType?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#727780] uppercase tracking-wider mb-1">State</p>
              <p className="text-sm font-semibold text-[#003358]">{partner.state}</p>
            </div>
            {partner.district && (
              <div>
                <p className="text-xs font-bold text-[#727780] uppercase tracking-wider mb-1">District</p>
                <p className="text-sm font-semibold text-[#003358]">{partner.district}</p>
              </div>
            )}
            {partner.registrationNo && (
              <div>
                <p className="text-xs font-bold text-[#727780] uppercase tracking-wider mb-1">Registration No.</p>
                <p className="text-sm font-semibold text-[#003358]">{partner.registrationNo}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-[#727780] uppercase tracking-wider mb-1">Verification</p>
              <p className="text-sm font-semibold">
                {partner.isVerified ? (
                  <span className="text-[#006b5e] flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      verified
                    </span>
                    Verified
                  </span>
                ) : (
                  <span className="text-[#ffb95f]">Pending Verification</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#727780] uppercase tracking-wider mb-1">Account Since</p>
              <p className="text-sm font-semibold text-[#003358]">
                {new Date(partner.dateOfCreation).toLocaleDateString()}
              </p>
            </div>
          </div>
        </section>

        {/* Session */}
        <section
          className="bg-white p-8 rounded-xl"
          style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)", border: "1px solid rgba(193,199,208,0.1)" }}
        >
          <h3 className="text-lg font-bold text-[#003358] mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Session
          </h3>
          <button
            onClick={logout}
            className="px-6 py-3 rounded-xl bg-[#ffdad6] text-[#93000a] font-bold text-sm hover:bg-[#ba1a1a] hover:text-white transition-all"
          >
            Logout
          </button>
        </section>
      </div>
    </CivicPartnerLayout>
  )
}
