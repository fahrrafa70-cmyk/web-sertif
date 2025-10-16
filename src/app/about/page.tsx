import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Info, HelpCircle, Users, Award, Shield, Mail } from "lucide-react";

export default function AboutPage() {
  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Multi-User Management",
      description: "Support for Admin, Team, and Public access levels with role-based permissions for secure certificate management."
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Professional Certificates",
      description: "Create beautiful, verifiable certificates with customizable templates, layouts, and professional designs."
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure Verification",
      description: "Public verification system with unique URLs for each certificate, ensuring authenticity and security."
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: "Email Integration",
      description: "Send certificates via email individually or in bulk with advanced filtering options and automation."
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
                About E-Certificate
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Learn more about our multilingual E-Certificate Management Platform 
                and how we're revolutionizing certificate management worldwide.
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
                  Our Mission
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  We are committed to providing organizations worldwide with a comprehensive, 
                  secure, and user-friendly platform for creating, managing, and verifying 
                  certificates for various programs including trainings, internships, MoUs, 
                  and industrial visits.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  Our platform supports multiple languages (English and Indonesian) and offers 
                  role-based access control to ensure that every organization can manage 
                  their certificates efficiently and securely.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Built with modern technology stack including Next.js, Shadcn UI, Tailwind CSS, 
                  and Supabase, we ensure scalability, security, and seamless user experience 
                  across all devices and platforms.
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
                    <div className="text-3xl font-bold text-blue-600 mb-2">6,372+</div>
                    <div className="text-gray-600">Participants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">77+</div>
                    <div className="text-gray-600">Activities</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">610+</div>
                    <div className="text-gray-600">Institutions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">98%</div>
                    <div className="text-gray-600">Satisfaction</div>
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
                Platform Features
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Discover the powerful features that make our E-Certificate Management Platform 
                the preferred choice for organizations worldwide.
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
                Ready to Get Started?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Join thousands of organizations already using our platform to manage 
                their certificates efficiently and professionally.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors duration-200">
                  Contact Us
                </button>
                <button className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200">
                  Learn More
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
