"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Shield, Award, Users, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export default function HeroSection() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [certificateId, setCertificateId] = useState("");
  const router = useRouter();
  useEffect(() => setMounted(true), []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Enhanced Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800">
        {/* Animated Background Pattern */}
        {mounted && (
          <div className="absolute inset-0">
            {/* Floating Geometric Shapes */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-white/10 rounded-full"
                style={{
                  left: `${(i * 47) % 100}%`,
                  top: `${(i * 61) % 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, 15, 0],
                  opacity: [0.1, 0.6, 0.1],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 4 + ((i * 17) % 30) / 10,
                  repeat: Infinity,
                  delay: ((i * 23) % 30) / 10,
                  ease: "easeInOut"
                }}
              />
            ))}
            
            {/* Gradient Orbs */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl"
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        )}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto"
        >
          {/* Enhanced Main Title */}
          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="block bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                E-Certificate
              </span>
              <span className="block text-3xl sm:text-4xl lg:text-5xl text-blue-200 mt-2">
                {t('hero.subtitle')}
              </span>
            </h1>
          </motion.div>

          {/* Enhanced Subtitle */}
          <motion.p 
            variants={itemVariants}
            className="text-xl sm:text-2xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
          >
            {t('hero.description')}
          </motion.p>

          {/* Enhanced Certificate Search */}
          <motion.div
            variants={itemVariants}
            className="mx-auto max-w-2xl"
          >
            <form
              onSubmit={(e: React.FormEvent) => {
                e.preventDefault();
                const q = certificateId.trim();
                if (!q) return;
                router.push(`/certificates?cert=${encodeURIComponent(q)}`);
              }}
              className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20"
            >
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                <Input
                  value={certificateId}
                  onChange={(e) => setCertificateId(e.target.value)}
                  placeholder={t('hero.searchPlaceholder')}
                  className="h-14 pl-12 bg-transparent border-0 text-white placeholder:text-white/70 focus-visible:ring-0 text-lg"
                />
              </div>
              <Button
                type="submit"
                className="h-14 px-8 gradient-primary text-white rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
              >
                {t('hero.searchButton')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </form>
          </motion.div>

          {/* Feature Highlights */}
          <motion.div 
            variants={itemVariants}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          >
            {[
              { icon: Shield, text: "Secure Verification", color: "from-green-400 to-emerald-500" },
              { icon: Award, text: "Digital Certificates", color: "from-blue-400 to-cyan-500" },
              { icon: Users, text: "Multi-language Support", color: "from-purple-400 to-pink-500" }
            ].map((feature) => (
              <motion.div
                key={feature.text}
                className="flex items-center justify-center gap-3 text-white/90"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className={`p-3 rounded-xl bg-gradient-to-r ${feature.color} shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <span className="font-medium">{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Enhanced Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
          className="mt-20 max-w-6xl mx-auto"
        >
          <div className="relative">
            {/* Enhanced Laptop Frame */}
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-3xl p-6 shadow-2xl border border-gray-700">
              <div className="bg-white rounded-xl overflow-hidden shadow-xl">
                {/* Enhanced Browser Header */}
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-4 flex items-center space-x-3">
                  <div className="flex space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
                    <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-sm"></div>
                    <div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div>
                  </div>
                  <div className="flex-1 bg-white rounded-lg px-4 py-2 text-sm text-gray-600 shadow-sm border">
                    https://e-certificate.my.id
                  </div>
                </div>

                {/* Enhanced Dashboard Content */}
                <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.2 }}
                  >
                    {/* Enhanced Stats Cards */}
                    {[
                      { value: "12,847", label: "Certificates Issued", color: "from-teal-500 to-emerald-600", icon: Award },
                      { value: "156", label: "Templates", color: "from-pink-500 to-rose-600", icon: Shield },
                      { value: "89", label: "Organizations", color: "from-purple-500 to-violet-600", icon: Users },
                      { value: "99.8%", label: "Verification Rate", color: "from-orange-500 to-amber-600", icon: CheckCircle }
                    ].map((stat, index) => (
                      <motion.div
                        key={stat.label}
                        className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300`}
                        whileHover={{ scale: 1.05, y: -5 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 1.4 + index * 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <stat.icon className="w-8 h-8 opacity-90" />
                          <div className="text-right">
                            <div className="text-3xl font-bold">{stat.value}</div>
                            <div className="text-sm opacity-90">{stat.label}</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Enhanced Certificate Preview */}
                  <motion.div 
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border-2 border-dashed border-blue-200 shadow-lg"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 1.8 }}
                  >
                    <div className="text-center">
                      <motion.div 
                        className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg"
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <CheckCircle className="text-white text-3xl" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-3">Certificate Verified</h3>
                      <p className="text-gray-600 text-lg">Digital certificates with secure verification and blockchain technology</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Enhanced Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-8 h-12 border-2 border-white/60 rounded-full flex justify-center cursor-pointer hover:border-white/80 transition-colors"
        >
          <motion.div
            animate={{ y: [0, 16, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-1 h-4 bg-white/80 rounded-full mt-2"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
