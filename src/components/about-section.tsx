"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Mail, Users, Award, Shield } from "lucide-react";

export default function AboutSection() {
  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Multi-User Management",
      description: "Support for Admin, Team, and Public access levels with role-based permissions."
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Professional Certificates",
      description: "Create beautiful, verifiable certificates with customizable templates and layouts."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure Verification",
      description: "Public verification system with unique URLs for each certificate."
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email Integration",
      description: "Send certificates via email individually or in bulk with filtering options."
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
                About E-Certificate
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                Our multilingual E-Certificate Management Platform revolutionizes how organizations 
                create, manage, and verify certificates for various programs including trainings, 
                internships, MoUs, and industrial visits.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                Built with modern technology stack including Next.js, Shadcn UI, Tailwind CSS, 
                and Supabase, our platform ensures scalability, security, and seamless user experience 
                across multiple languages.
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
                Contact Us
                <Mail className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Column - Certificate Sample */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 shadow-2xl">
              {/* Certificate Design */}
              <div className="bg-white rounded-xl p-8 shadow-lg relative overflow-hidden">
                {/* Decorative Corners */}
                <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-br-2xl"></div>
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-400 to-orange-500 rounded-bl-2xl"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-tr-2xl"></div>
                <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-yellow-400 to-orange-500 rounded-tl-2xl"></div>

                {/* Certificate Content */}
                <div className="relative z-10 text-center">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">CERTIFICATE</h3>
                    <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto rounded-full"></div>
                  </div>

                  <p className="text-gray-600 mb-4">This is to certify that</p>
                  <h4 className="text-xl font-bold text-gray-800 mb-4">John Doe</h4>
                  <p className="text-gray-600 mb-6">
                    has successfully completed the<br />
                    <span className="font-semibold">Professional Training Program</span>
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                    <div>
                      <p className="font-semibold">Date:</p>
                      <p>December 15, 2024</p>
                    </div>
                    <div>
                      <p className="font-semibold">Program ID:</p>
                      <p>EC-2024-001</p>
                    </div>
                  </div>

                  {/* QR Code Placeholder */}
                  <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <div className="w-12 h-12 bg-gray-300 rounded grid grid-cols-3 gap-1 p-1">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="bg-gray-600 rounded-sm"></div>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">Verify at: e-certificate.my.id/verify</p>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-lg"
            />
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
              className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full shadow-lg"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
