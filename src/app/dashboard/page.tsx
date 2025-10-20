"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, Users, Award, TrendingUp, Activity } from "lucide-react";

export default function DashboardPage() {
  const { t } = useLanguage();
  
  const stats = [
    { 
      label: t('templates.title'), 
      value: "12", 
      icon: FileText, 
      color: "from-blue-500 to-blue-600",
      change: "+2 this week"
    },
    { 
      label: t('certificates.title'), 
      value: "156", 
      icon: Award, 
      color: "from-green-500 to-green-600",
      change: "+12 this week"
    },
    { 
      label: t('categories.title'), 
      value: "8", 
      icon: BarChart3, 
      color: "from-purple-500 to-purple-600",
      change: "+1 this week"
    },
    { 
      label: "Members", 
      value: "89", 
      icon: Users, 
      color: "from-orange-500 to-orange-600",
      change: "+5 this week"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0, 0, 0.58, 1] as const // easeOut cubic bezier
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Header />
      <main className="pt-16">
        {/* Hero Section */}
        <motion.section 
          className="relative py-20 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-600/5"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl sm:text-5xl font-bold text-gradient mb-4">
                {t('dashboard.title')}
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                {t('dashboard.overview')}
              </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group">
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                          <div className="text-sm text-green-600 font-medium">{stat.change}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardTitle className="text-lg font-semibold text-gray-700">
                        {stat.label}
                      </CardTitle>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Quick Actions Section */}
        <motion.section 
          className="py-16 bg-white"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Access your most used features and manage your certificates efficiently
              </p>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {[
                {
                  title: "Create Certificate",
                  description: "Generate new certificates with custom templates",
                  icon: FileText,
                  color: "from-blue-500 to-indigo-600",
                  href: "/templates"
                },
                {
                  title: "View Analytics",
                  description: "Track certificate performance and insights",
                  icon: TrendingUp,
                  color: "from-green-500 to-emerald-600",
                  href: "/analytics"
                },
                {
                  title: "Manage Members",
                  description: "Add and organize team members",
                  icon: Users,
                  color: "from-purple-500 to-violet-600",
                  href: "/members"
                }
              ].map((action) => (
                <motion.div
                  key={action.title}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer">
                    <CardHeader className="text-center pb-4">
                      <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <action.icon className="w-8 h-8" />
                      </div>
                    </CardHeader>
                    <CardContent className="text-center">
                      <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                        {action.title}
                      </CardTitle>
                      <p className="text-gray-600">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Recent Activity Section */}
        <motion.section 
          className="py-16 bg-gradient-to-br from-gray-50 to-white"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Recent Activity</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Stay updated with the latest certificate activities and system events
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">No Recent Activity</h3>
                      <p className="text-gray-500">
                        Activity will appear here as you create and manage certificates
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}


