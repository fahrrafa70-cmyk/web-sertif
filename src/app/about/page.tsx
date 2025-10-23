"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
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
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Info className="w-16 h-16 mx-auto mb-6 text-blue-200" />
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                {t('about.title')}
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                {t('about.description1')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* About Content */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  {t('about.title')}
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  {t('about.description1')}
                </p>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  {t('about.description2')}
                </p>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {t('about.description2')}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8"
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Key Statistics</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {statsLoading ? "—" : `${stats.certificates.toLocaleString()}`}
                    </div>
                    <div className="text-gray-600">Certificates Issued</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {statsLoading ? "—" : `${stats.templates.toLocaleString()}`}
                    </div>
                    <div className="text-gray-600">Templates Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {statsLoading ? "—" : `${stats.members.toLocaleString()}`}
                    </div>
                    <div className="text-gray-600">Registered Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {statsLoading ? "—" : `${stats.categories.toLocaleString()}`}
                    </div>
                    <div className="text-gray-600">Certificate Categories</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {t('about.title')}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t('about.description1')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6">
                {t('hero.getStarted')}
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                {t('about.description1')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors duration-200">
                  {t('nav.contact')}
                </button>
                <button className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200">
                  {t('hero.learnMore')}
                </button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
