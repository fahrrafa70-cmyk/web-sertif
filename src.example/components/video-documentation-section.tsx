"use client";

import { motion } from "framer-motion";
import { Users, Calendar, Building } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

export default function VideoDocumentationSection() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ certificates: 0, templates: 0, members: 0 });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [{ count: certsCount }, { count: tmplCount }, { count: membCount }] = await Promise.all([
          supabaseClient.from("certificates").select("id", { count: "exact", head: true }),
          supabaseClient.from("templates").select("id", { count: "exact", head: true }),
          supabaseClient.from("members").select("id", { count: "exact", head: true }),
        ]);
        if (mounted) setCounts({ certificates: certsCount || 0, templates: tmplCount || 0, members: membCount || 0 });
      } catch (e) {
        console.error("Failed loading stats", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const stats = [
    {
      icon: <Users className="w-8 h-8" />,
      number: loading ? "—" : counts.certificates.toLocaleString(),
      label: t('analytics.totalCertificates'),
      gradient: "from-teal-500 to-teal-600"
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      number: loading ? "—" : counts.templates.toLocaleString(),
      label: t('analytics.totalTemplates'),
      gradient: "from-pink-500 to-pink-600"
    },
    {
      icon: <Building className="w-8 h-8" />,
      number: loading ? "—" : counts.members.toLocaleString(),
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
          {/* Left Column - Real Images */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl p-6 shadow-2xl">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow-md border border-gray-200 dark:border-gray-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/template/1760879828593-hylf7mf2w36.png" alt="Certificate image 1" className="w-full h-auto rounded-md border" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow-md border border-gray-200 dark:border-gray-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/template/1760848158433-h665mi1gvba.png" alt="Certificate image 2" className="w-full h-auto rounded-md border" />
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
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Key Features Highlighted</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
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
