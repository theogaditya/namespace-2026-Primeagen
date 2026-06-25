'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: [
      'By accessing or using the SwarajDesk platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.',
      'We reserve the right to modify these Terms at any time. Continued use of the Service after changes are posted constitutes your acceptance of the revised Terms.',
    ],
  },
  {
    title: '2. Eligibility',
    content: [
      'You must be at least 18 years of age, or the legal age of majority in your jurisdiction, to use SwarajDesk. By registering an account, you confirm that you meet this requirement.',
      'You agree to provide accurate, current, and complete information when creating your account and to update it promptly if it changes.',
    ],
  },
  {
    title: '3. Permitted Use',
    content: [
      'SwarajDesk is a civic grievance platform intended solely for filing, tracking, and resolving legitimate public service complaints with government bodies in India.',
      'You agree to use the Service only for lawful purposes and in a manner consistent with all applicable local, state, national, and international laws and regulations.',
    ],
  },
  {
    title: '4. Prohibited Conduct',
    content: [
      'You must not file false, misleading, or malicious complaints. Filing complaints you know to be fabricated wastes public resources and may result in account suspension and legal action.',
      'You must not upload abusive, obscene, harassing, or defamatory content. Our AI abuse-detection layer actively monitors submissions and will flag violations.',
      'You must not attempt to reverse-engineer, scrape, or exploit the platform\'s APIs without explicit written permission. Automated filing of complaints or bot-based interactions are strictly prohibited.',
      'You must not impersonate any government official, department, or other person, or provide false identity information.',
    ],
  },
  {
    title: '5. Complaint Accuracy & Responsibility',
    content: [
      'You are solely responsible for the accuracy, completeness, and truthfulness of any complaint you file. SwarajDesk is a conduit — we route your complaint, but we do not verify the factual basis of every submission before forwarding.',
      'Any complaint submitted through the platform is shared with the relevant government department or official. You consent to this sharing when you submit a complaint.',
    ],
  },
  {
    title: '6. Intellectual Property',
    content: [
      'The SwarajDesk platform, including its source code, design, branding, and AI models, is the intellectual property of the SwarajDesk project and its contributors.',
      'You retain ownership of any original content you submit (text, photos, videos). By submitting content, you grant SwarajDesk a non-exclusive, royalty-free licence to use, store, process, and display that content as necessary to operate the Service.',
    ],
  },
  {
    title: '7. Blockchain Records',
    content: [
      'Certain complaint metadata is recorded on a public or consortium blockchain as part of the platform\'s audit-trail feature. You acknowledge that blockchain records are immutable — once written, they cannot be amended or deleted.',
      'You consent to this immutable recording when you submit a complaint. Anonymised hashes (not personal identifiers) are what appear on-chain.',
    ],
  },
  {
    title: '8. Disclaimers & Limitation of Liability',
    content: [
      'SwarajDesk is provided on an "as is" and "as available" basis. We make no warranties, express or implied, regarding the availability, accuracy, or completeness of the Service.',
      'SwarajDesk is a technology platform; we are not a government body and cannot compel any department to resolve your complaint by any specific deadline. Resolution depends on the relevant government authority.',
      'To the maximum extent permitted by applicable law, SwarajDesk and its contributors shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.',
    ],
  },
  {
    title: '9. Termination',
    content: [
      'We reserve the right to suspend or terminate your account at our discretion, without notice, if we believe you have violated these Terms or if continued access poses a risk to the platform or other users.',
      'You may delete your account at any time. Deletion will anonymise your personal details in active records, but complaint metadata already recorded on-chain cannot be erased.',
    ],
  },
  {
    title: '10. Governing Law & Dispute Resolution',
    content: [
      'These Terms are governed by the laws of India. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in Jharkhand, India.',
    ],
  },
];

export default function TermsPage() {
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
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Terms of Service</h1>
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
          Please read these Terms of Service carefully before using the SwarajDesk platform.
          These Terms constitute a legally binding agreement between you and the SwarajDesk
          project. By creating an account or filing a complaint, you acknowledge and agree
          to these Terms in full.
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
          <h2 className="text-xl font-bold mb-3">Questions?</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            If you have any questions about these Terms, please contact us at{' '}
            <a href="mailto:legal@swarajdesk.in" className="text-violet-600 hover:underline">legal@swarajdesk.in</a>.
          </p>
        </motion.div>
      </section>
    </main>
  );
}
