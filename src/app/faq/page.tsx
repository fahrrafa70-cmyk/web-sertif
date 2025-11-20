"use client";

import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/language-context";

export default function FAQPage() {
  const { t } = useLanguage();
  const [openItems, setOpenItems] = useState<number[]>([]);

  // Set document title robust untuk FAQ page
  useEffect(() => {
    const setTitle = () => {
      if (typeof document !== 'undefined') {
        document.title = "FAQ | Certify - Certificate Platform";
      }
    };
    
    // Set immediately
    setTitle();
    
    // Set with multiple delays to ensure override
    const timeouts = [
      setTimeout(setTitle, 50),
      setTimeout(setTitle, 200),
      setTimeout(setTitle, 500)
    ];
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(item => item !== index)
        : [...prev, index]
    );
  };

  const faqs = [
    {
      question: t('faq.q1'),
      answer: t('faq.a1')
    },
    {
      question: t('faq.q2'),
      answer: t('faq.a2')
    },
    {
      question: t('faq.q3'),
      answer: t('faq.a3')
    },
    {
      question: t('faq.q4'),
      answer: t('faq.a4')
    },
    {
      question: t('faq.q5'),
      answer: t('faq.a5')
    },
    {
      question: t('faq.q6'),
      answer: t('faq.a6')
    }
  ];

  return (
    <ModernLayout>
      {/* Hero Section */}
      <section className="gradient-hero text-white py-12 sm:py-16 md:py-20 w-full">
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <HelpCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 text-cyan-100" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
                {t('faq.title')}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-cyan-50 max-w-3xl mx-auto px-2 sm:px-0">
                {t('faq.subtitle')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gray-50 dark:bg-gray-900 w-full">
          <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-left flex items-start justify-between gap-2 sm:gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1 min-w-0 pr-2 leading-snug break-words">
                      {faq.question}
                    </h3>
                    {openItems.includes(index) ? (
                      <ChevronUp className="w-5 h-5 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <ChevronDown className="w-5 h-5 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                  
                  {openItems.includes(index) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-5 pt-1"
                    >
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
                        <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
    </ModernLayout>
  );
}
