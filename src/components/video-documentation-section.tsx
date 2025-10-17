"use client";

import { motion } from "framer-motion";
import { Play, Users, Calendar, Building } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export default function VideoDocumentationSection() {
  const { t } = useLanguage();
  const stats = [
    {
      icon: <Users className="w-8 h-8" />,
      number: "12,847",
      label: t('analytics.totalCertificates'),
      gradient: "from-teal-500 to-teal-600"
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      number: "156",
      label: t('analytics.totalTemplates'),
      gradient: "from-pink-500 to-pink-600"
    },
    {
      icon: <Building className="w-8 h-8" />,
      number: "89",
      label: t('analytics.totalUsers'),
      gradient: "from-purple-500 to-purple-600"
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t('about.title')}
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full"></div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Video Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl p-8 shadow-2xl">
              {/* Video Frame */}
              <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
                {/* Video Placeholder */}
                <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative">
                  {/* Certificate Management Illustration Placeholder */}
                  <div className="text-center text-white">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <div className="text-6xl">📜</div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Certificate Management</h3>
                    <p className="text-blue-200">Digital Certificate Platform</p>
                  </div>

                  {/* Play Button Overlay */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors duration-300"
                  >
                    <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-2xl">
                      <Play className="w-8 h-8 text-blue-600 ml-1" />
                    </div>
                  </motion.button>
                </div>

                {/* Video Controls */}
                <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-600">E-Certificate Management Demo</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center">
                      <div className="w-3 h-3 bg-gray-600 rounded-sm"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Dots Pattern */}
              <div className="absolute -bottom-4 -left-4 w-24 h-24 opacity-20">
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Content and Stats */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                {t('about.title')}
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                {t('about.description1')}
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                {t('about.description2')}
              </p>
            </div>

            {/* Statistics */}
            <div className="space-y-6">
              <h4 className="text-xl font-semibold text-gray-900 mb-4">{t('analytics.title')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-6 text-white text-center shadow-lg hover:shadow-xl transition-shadow duration-300`}
                  >
                    <div className="flex justify-center mb-3">
                      {stat.icon}
                    </div>
                    <div className="text-2xl font-bold mb-1">{stat.number}</div>
                    <div className="text-sm opacity-90">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Key Features Highlighted</h4>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  {t('about.features.multiUser')}
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  {t('about.features.professional')}
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  {t('about.features.secure')}
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  {t('about.features.email')}
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Public verification system with unique URLs
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
