"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { Mail, Users, Award, Shield } from "lucide-react";
import Image from "next/image";

export default function AboutSection() {
  const { t } = useLanguage();
  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: t('about.features.multiUser'),
      description: t('about.features.multiUserDesc')
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: t('about.features.professional'),
      description: t('about.features.professionalDesc')
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: t('about.features.secure'),
      description: t('about.features.secureDesc')
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: t('about.features.email'),
      description: t('about.features.emailDesc')
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                {t('about.title')}
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                {t('about.description1')}
              </p>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                {t('about.description2')}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {t('nav.contact')}
                <Mail className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Column - Real Certificate Images */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-4 sm:p-6 shadow-2xl">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white rounded-xl p-2 shadow-md">
                  <div className="relative w-full">
                    <Image
                      src="/template/1760879828593-hylf7mf2w36.png"
                      alt="Certificate preview 1"
                      width={1200}
                      height={800}
                      className="w-full h-auto rounded-md border"
                    />
                  </div>
                </div>
                <div className="bg-white rounded-xl p-2 shadow-md">
                  <div className="relative w-full">
                    <Image
                      src="/template/1760848158433-h665mi1gvba.png"
                      alt="Certificate preview 2"
                      width={1200}
                      height={800}
                      className="w-full h-auto rounded-md border"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
