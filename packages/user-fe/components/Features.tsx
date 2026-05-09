'use client';

import { motion, type Variants } from 'framer-motion';
import {
  Brain,
  Languages,
  Shield,
  Cloud,
  Sparkles,
  WifiOff,
  MessageSquareHeart,
  MapPin,
  Users,
} from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

const headerVariants: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 80,
      damping: 20,
    },
  },
};

const Features = () => {
  return (
    <section className='py-20 px-4 bg-gray-50'>
      <div className='max-w-6xl mx-auto'>
        {/* Section Header */}
        <motion.div
          className='text-center mb-16'
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true, margin: '-100px' }}
          variants={headerVariants}
        >
          <h2 className='text-4xl font-bold text-gray-900 mb-4'>
            What Makes Us Different
          </h2>
          <p className='text-gray-600 text-lg max-w-2xl mx-auto'>
            Empowering citizens with cutting-edge technology for seamless
            grievance redressal
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true, margin: '-50px' }}
          variants={containerVariants}
        >
          {/* Feature 1 - AI Detection (Large) */}
          <motion.div
            className='bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-lg transition-shadow row-span-2'
            variants={itemVariants}
            whileHover={{ y: -5 }}
          >
            <div className='h-full flex flex-col'>
              <div className='w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6'>
                <Brain className='w-7 h-7 text-purple-600' />
              </div>
              <h3 className='text-2xl font-semibold text-gray-900 mb-3'>
                AI-Powered Detection
              </h3>
              <p className='text-gray-600 mb-6'>
                Advanced machine learning algorithms automatically detect abuse
                and identify duplicate complaints, ensuring efficient processing
                and preventing system misuse.
              </p>
              <div className='mt-auto bg-purple-50 rounded-xl p-4'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm text-gray-600'>Detection Rate</span>
                  <span className='text-sm font-semibold text-purple-600'>
                    99.2%
                  </span>
                </div>
                <div className='w-full bg-purple-200 rounded-full h-2'>
                  <div
                    className='bg-purple-600 h-2 rounded-full'
                    style={{ width: '99.2%' }}
                  ></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature 2 - Multilingual Support */}
          <motion.div
            className='bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-shadow'
            variants={itemVariants}
            whileHover={{ y: -5 }}
          >
            <div className='flex items-start gap-4'>
              <div className='w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0'>
                <Languages className='w-6 h-6 text-blue-600' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  20+ Languages & Chatbot
                </h3>
                <p className='text-gray-600 text-sm'>
                  Inclusive support for regional languages with an intelligent
                  chatbot assistant for guided complaint submission.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Feature 3 - Blockchain Security */}
          <motion.div
            className='bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 shadow-sm hover:shadow-lg transition-shadow text-white'
            variants={itemVariants}
            whileHover={{ y: -5 }}
          >
            <div className='w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4'>
              <Shield className='w-6 h-6 text-white' />
            </div>
            <h3 className='text-lg font-semibold mb-2'>
              Blockchain-Backed Security
            </h3>
            <p className='text-gray-300 text-sm'>
              Immutable record-keeping ensures complete privacy and transparency
              with tamper-proof complaint trails.
            </p>
            <div className='mt-4 flex items-center gap-2'>
              <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></div>
              <span className='text-xs text-gray-400'>Secured & Encrypted</span>
            </div>
          </motion.div>

          {/* Feature 4 - Cloud Native */}
          <motion.div
            className='bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-shadow'
            variants={itemVariants}
            whileHover={{ y: -5 }}
          >
            <div className='flex items-start gap-4'>
              <div className='w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center shrink-0'>
                <Cloud className='w-6 h-6 text-cyan-600' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  Cloud-Native & Auto-Scaling
                </h3>
                <p className='text-gray-600 text-sm'>
                  Built on Kubernetes for unlimited scalability, handling
                  millions of complaints without downtime.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Feature 5 - AI Categorization (Large) */}
          <motion.div
            className='bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-lg transition-shadow row-span-2'
            variants={itemVariants}
            whileHover={{ y: -5 }}
          >
            <div className='h-full flex flex-col'>
              <div className='w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6'>
                <Sparkles className='w-7 h-7 text-amber-600' />
              </div>
              <h3 className='text-2xl font-semibold text-gray-900 mb-3'>
                AI Categorization
              </h3>
              <p className='text-gray-600 mb-6'>
                Smart categorization model automatically routes complaints to
                the right department for faster resolution times.
              </p>
              <div className='mt-auto space-y-3'>
                <div className='flex items-center justify-between p-3 bg-amber-50 rounded-lg'>
                  <span className='text-sm text-gray-700'>Roads & Transport</span>
                  <span className='text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full'>
                    Auto-routed
                  </span>
                </div>
                <div className='flex items-center justify-between p-3 bg-green-50 rounded-lg'>
                  <span className='text-sm text-gray-700'>Water Supply</span>
                  <span className='text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full'>
                    Auto-routed
                  </span>
                </div>
                <div className='flex items-center justify-between p-3 bg-blue-50 rounded-lg'>
                  <span className='text-sm text-gray-700'>Electricity</span>
                  <span className='text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full'>
                    Auto-routed
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature 6 - Offline First */}
          <motion.div
            className='bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-shadow'
            variants={itemVariants}
            whileHover={{ y: -5 }}
          >
            <div className='flex items-start gap-4'>
              <div className='w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0'>
                <WifiOff className='w-6 h-6 text-orange-600' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  Offline-First Submission
                </h3>
                <p className='text-gray-600 text-sm'>
                  Submit complaints even without internet. They sync
                  automatically when you're back online.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Feature 7 - Survey & Feedback */}
          <motion.div
            className='bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-shadow'
            variants={itemVariants}
            whileHover={{ y: -5 }}
          >
            <div className='flex items-start gap-4'>
              <div className='w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center shrink-0'>
                <MessageSquareHeart className='w-6 h-6 text-pink-600' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  Survey & Feedback Systems
                </h3>
                <p className='text-gray-600 text-sm'>
                  Built-in feedback collection ensures continuous improvement
                  and citizen satisfaction tracking.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Feature 8 - GeoLocation */}
          <motion.div
            className='bg-linear-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 border border-emerald-400 shadow-sm hover:shadow-lg transition-shadow text-white'
            variants={itemVariants}
            whileHover={{ y: -5 }}
          >
            <div className='w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4'>
              <MapPin className='w-6 h-6 text-white' />
            </div>
            <h3 className='text-lg font-semibold mb-2'>
              GeoLocation & Voice-to-Text
            </h3>
            <p className='text-emerald-100 text-sm'>
              Automatic location tagging with voice input and photo upload
              support for comprehensive complaint documentation.
            </p>
            <div className='mt-4 flex gap-2'>
              <span className='text-xs bg-white/20 px-2 py-1 rounded-full'>
                📍 Location
              </span>
              <span className='text-xs bg-white/20 px-2 py-1 rounded-full'>
                🎤 Voice
              </span>
              <span className='text-xs bg-white/20 px-2 py-1 rounded-full'>
                📷 Photos
              </span>
            </div>
          </motion.div>

          {/* Feature 9 - Community Feed */}
          <motion.div
            className='bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-shadow lg:col-span-1'
            variants={itemVariants}
            whileHover={{ y: -5 }}
          >
            <div className='w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4'>
              <Users className='w-6 h-6 text-indigo-600' />
            </div>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Community Feed
            </h3>
            <p className='text-gray-600 text-sm mb-4'>
              Upvote, share, and discover trending issues in your area. Build
              collective voice for faster action.
            </p>
            <div className='flex items-center gap-2'>
              <div className='flex -space-x-2'>
                <div className='w-8 h-8 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs'>
                  A
                </div>
                <div className='w-8 h-8 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs'>
                  R
                </div>
                <div className='w-8 h-8 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs'>
                  S
                </div>
              </div>
              <span className='text-xs text-gray-500'>+2.4k citizens</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
