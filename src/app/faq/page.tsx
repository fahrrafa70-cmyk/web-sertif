"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(item => item !== index)
        : [...prev, index]
    );
  };

  const faqs = [
    {
      question: "What is the E-Certificate Management Platform?",
      answer: "The E-Certificate Management Platform is a comprehensive solution for creating, managing, and verifying certificates for various programs including trainings, internships, MoUs, and industrial visits. It supports multiple languages and offers role-based access control."
    },
    {
      question: "What languages are supported?",
      answer: "Our platform currently supports English (default) and Indonesian languages, with seamless switching between them. We're continuously working to add more language support based on user demand."
    },
    {
      question: "What are the different access levels?",
      answer: "We offer three main access levels: Admin (full management access), Team (can add, view, and edit certificates but cannot delete), and Public (can search and view specific certificates via search or direct URL access)."
    },
    {
      question: "How do I create a certificate?",
      answer: "Creating certificates is simple: 1) Choose or create a template, 2) Select a category, 3) Add member information, 4) Generate the certificate as PDF, and 5) Send via email if needed. Our platform guides you through each step."
    },
    {
      question: "Can I import data from Excel?",
      answer: "Yes! Our platform supports Excel import for Templates, Categories, Members, and Certificates. This makes it easy to migrate existing data or bulk upload new information."
    },
    {
      question: "How does certificate verification work?",
      answer: "Each certificate gets a unique verification URL (https://sertifikat.ubig.co.id/cek/{certificate_number}) that allows public verification. Anyone can visit this URL to verify the authenticity of a certificate."
    },
    {
      question: "Can I send certificates via email?",
      answer: "Absolutely! You can send certificate PDFs by email either individually or in bulk using filters such as category or date range. Our email integration makes distribution efficient and automated."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, security is our top priority. We use Supabase for secure data management, implement role-based access control, and follow industry best practices for data protection and privacy."
    },
    {
      question: "What file formats are supported?",
      answer: "Our platform generates certificates as PDF files, which are universally compatible and professional. We also support Excel import/export for data management and CSV for bulk operations."
    },
    {
      question: "How do I get support?",
      answer: "You can reach our support team through the contact information provided on our website, or use the contact form. We also provide comprehensive documentation and video tutorials to help you get started."
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
              <HelpCircle className="w-16 h-16 mx-auto mb-6 text-blue-200" />
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                Frequently Asked Questions
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Find answers to common questions about our E-Certificate Management Platform. 
                Can't find what you're looking for? Contact us for personalized assistance.
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 pr-4">
                      {faq.question}
                    </h3>
                    {openItems.includes(index) ? (
                      <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                  
                  {openItems.includes(index) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Still Have Questions?
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Our support team is here to help. Contact us for personalized assistance 
                with any questions or concerns about our platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors duration-200">
                  Contact Support
                </button>
                <button className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-blue-600 hover:text-white transition-colors duration-200">
                  View Documentation
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
