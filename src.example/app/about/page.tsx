"use client";

import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { Info, Users, Award, Shield, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

export default function AboutPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    certificates: 0,
    templates: 0,
    members: 0,
    categories: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Load real statistics from database
  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const [certificatesResult, templatesResult, membersResult, categoriesResult] = await Promise.all([
          supabaseClient.from("certificates").select("id", { count: "exact", head: true }),
          supabaseClient.from("templates").select("id", { count: "exact", head: true }),
          supabaseClient.from("members").select("id", { count: "exact", head: true }),
          supabaseClient.from("certificates").select("category", { count: "exact" }).not("category", "is", null)
        ]);
        
        // Count unique categories
        const uniqueCategories = new Set();
        if (categoriesResult.data) {
          categoriesResult.data.forEach(item => {
            if (item.category) uniqueCategories.add(item.category);
          });
        }
        
        setStats({
          certificates: certificatesResult.count || 0,
          templates: templatesResult.count || 0,
          members: membersResult.count || 0,
          categories: uniqueCategories.size || 0
        });
      } catch (error) {
        console.error("Failed to load statistics:", error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    loadStats();
  }, []);
  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: t('about.features.multiUser'),
      description: t('about.features.multiUserDesc')
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: t('about.features.professional'),
      description: t('about.features.professionalDesc')
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: t('about.features.secure'),
      description: t('about.features.secureDesc')
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: t('about.features.email'),
      description: t('about.features.emailDesc')
    }
  ];

  return (
    <ModernLayout>
      {/* Hero Section */}
      <section className="gradient-hero text-white py-12 sm:py-16 md:py-20 w-full">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Info className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 text-cyan-100" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
                {t('about.title')}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-cyan-50 max-w-3xl mx-auto px-2 sm:px-0">
                {t('about.description1')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* About Content */}
        <section className="py-12 sm:py-16 md:py-20 bg-gray-50 dark:bg-gray-900 w-full">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
                  {t('about.ourMission')}
                </h2>
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4 sm:mb-6">
                  {t('about.description2')}
                </p>
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t('about.description3')}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">{t('analytics.keyStatistics')}</h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1 sm:mb-2">
                      {statsLoading ? "—" : `${stats.certificates.toLocaleString()}`}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{t('analytics.certificatesIssued')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1 sm:mb-2">
                      {statsLoading ? "—" : `${stats.templates.toLocaleString()}`}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{t('analytics.templatesAvailable')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1 sm:mb-2">
                      {statsLoading ? "—" : `${stats.members.toLocaleString()}`}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{t('analytics.registeredMembers')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1 sm:mb-2">
                      {statsLoading ? "—" : `${stats.categories.toLocaleString()}`}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{t('analytics.certificateCategories')}</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 sm:py-16 md:py-20 bg-gray-50 dark:bg-gray-900 w-full">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12 md:mb-16"
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                {t('about.keyFeatures')}
              </h2>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-2 sm:px-0">
                {t('about.featuresDescription')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 shadow-md sm:shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 gradient-primary rounded-lg flex items-center justify-center text-white">
                      {feature.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
    </ModernLayout>
  );
}
