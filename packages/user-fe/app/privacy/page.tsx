'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const sections = [
  {
    title: '1. Information We Collect',
    content: [
      'When you register or file a complaint on SwarajDesk, we collect information you provide directly — such as your name, email address, phone number, and location data.',
      'When you upload media (photos, audio, video) as evidence for a complaint, those files are processed by our AI models and stored on IPFS (InterPlanetary File System) for tamper-proof permanence.',
      'We automatically collect certain technical information when you use our platform, including IP address, browser type, device identifiers, and usage patterns, which help us improve service reliability and performance.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    content: [
      'Your personal information is used solely to operate, maintain, and improve the SwarajDesk platform. This includes verifying your identity, routing your complaints to the appropriate government department, sending status updates, and enabling community features.',
      'Anonymised and aggregated complaint data may be used to generate public-facing heatmaps and analytics dashboards that help administrators identify systemic issues.',
      'We do not sell, rent, or trade your personal information to any third party for marketing purposes.',
    ],
  },
  {
    title: '3. Blockchain & Immutability',
    content: [
      'Complaint metadata (complaint ID, category, department, status transitions, and resolution timestamps) is recorded on-chain. Once written, this data cannot be modified or deleted — this is a core feature of the platform, not a limitation.',
      'Personal identifiers (name, phone, email) are never written directly to the blockchain. Only cryptographic hashes are stored on-chain, ensuring your privacy while maintaining auditability.',
    ],
  },
  {
    title: '4. Data Sharing with Government Bodies',
    content: [
      'To fulfil the purpose of civic grievance redressal, your complaint details (including your name and contact information) are shared with the relevant government department or official responsible for resolving your issue.',
      'We may disclose information to law enforcement or regulatory bodies when required by applicable Indian law, including the Information Technology Act, 2000.',
    ],
  },
  {
    title: '5. Data Retention',
    content: [
      'Your account data is retained for as long as your account is active, or as needed to provide services. You may request account deletion at any time.',
      'Complaint records and their on-chain hashes are retained indefinitely as they form part of the public accountability ledger. Deleting your account will anonymise your personal details but will not delete the complaint record.',
    ],
  },
  {
    title: '6. Security',
    content: [
      'We use industry-standard encryption (TLS in transit, AES-256 at rest) and follow OWASP security guidelines to protect your data.',
      'All authentication tokens are short-lived JWTs. Sensitive credentials (API keys, database passwords) are managed via secrets managers and never stored in plain text.',
    ],
  },
  {
    title: '7. Your Rights',
    content: [
      'You have the right to access, correct, or request deletion of your personal data. To exercise these rights, contact us at privacy@swarajdesk.in.',
      'You may opt out of non-essential communications (newsletters, feature updates) at any time using the unsubscribe link in any email we send.',
    ],
  },
  {
    title: '8. Changes to This Policy',
    content: [
      'We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page and notify active users via email.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-slate-950 text-white pt-20 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors mb-10">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <span className="bg-violet-600/30 text-violet-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-6 inline-block">
              Legal
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Privacy Policy</h1>
            <p className="text-slate-400 text-sm">Last updated: April 2, 2026</p>
          </motion.div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-12 px-6 max-w-3xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-gray-600 text-base leading-relaxed border-l-4 border-violet-500 pl-5 py-1"
        >
          SwarajDesk ("we", "our", or "us") is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, store, and share information
          about you when you use the SwarajDesk platform. By using our services, you
          agree to the collection and use of information in accordance with this policy.
        </motion.p>
      </section>

      {/* Sections */}
      <section className="pb-24 px-6 max-w-3xl mx-auto space-y-12">
        {sections.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 * i }}
          >
            <h2 className="text-xl font-bold mb-4">{s.title}</h2>
            <div className="space-y-3">
              {s.content.map((para, j) => (
                <p key={j} className="text-gray-600 text-sm leading-relaxed">{para}</p>
              ))}
            </div>
          </motion.div>
        ))}
      </section>

      {/* Contact */}
      <section className="py-16 px-6 bg-slate-50">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-xl font-bold mb-3">Contact Us</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            If you have any questions or concerns about this Privacy Policy, please contact
            our Data Protection Officer at{' '}
            <a href="mailto:privacy@swarajdesk.in" className="text-violet-600 hover:underline">privacy@swarajdesk.in</a>.
          </p>
        </motion.div>
      </section>
    </main>
  );
}
