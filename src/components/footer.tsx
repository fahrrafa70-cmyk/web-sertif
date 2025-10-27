"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useEffect, useMemo, useState } from "react";

export default function Footer() {
  const { t } = useLanguage();


  // Generate decorative bubbles only on client after mount to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const bubbles = useMemo(
    () =>
      mounted
        ? Array.from({ length: 15 }).map(() => ({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            duration: 4 + Math.random() * 2,
            delay: Math.random() * 3,
          }))
        : ([] as Array<{ left: string; top: string; duration: number; delay: number }>),
    [mounted]
  );

  return (
    <footer className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0">
        {bubbles.map((b, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{ left: b.left, top: b.top }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: b.duration, repeat: Infinity, delay: b.delay }}
          />
        ))}
      </div>

      {/* Wave Divider */}
      <div className="absolute top-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-16 fill-white"
        >
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"></path>
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-6 sm:pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{t('footer.contact')}</h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200 flex-shrink-0" />
                <span className="text-sm sm:text-base text-blue-100">{t('footer.phone')}</span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200 flex-shrink-0" />
                <span className="text-sm sm:text-base text-blue-100 break-all">{t('footer.email')}</span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200 flex-shrink-0" />
                <span className="text-sm sm:text-base text-blue-100">{t('footer.location')}</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm sm:text-base text-blue-100 hover:text-white transition-colors duration-200">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm sm:text-base text-blue-100 hover:text-white transition-colors duration-200">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm sm:text-base text-blue-100 hover:text-white transition-colors duration-200">
                  {t('nav.faq')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm sm:text-base text-blue-100 hover:text-white transition-colors duration-200">
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Legal */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-sm sm:text-base text-blue-100 hover:text-white transition-colors duration-200">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm sm:text-base text-blue-100 hover:text-white transition-colors duration-200">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm sm:text-base text-blue-100 hover:text-white transition-colors duration-200">
                  {t('footer.cookies')}
                </Link>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="border-t border-blue-400/30 pt-6 sm:pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
            {/* Copyright */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-blue-100 text-center md:text-left"
            >
              <p className="text-xs sm:text-sm mt-1">{t('footer.developedBy')} Fahri Raffa</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="w-full h-16 fill-blue-900"
        >
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"></path>
        </svg>
      </div>
    </footer>
  );
}
