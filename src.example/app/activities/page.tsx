import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Calendar, Users, Award, Clock } from "lucide-react";

export default function ActivitiesPage() {
  const activities = [
    {
      id: 1,
      title: "Workshop Penulisan Serta Penerbitan Buku Ajar Dan Referensi",
      organization: "ALAUDDIN",
      date: "December 15, 2024",
      participants: 150,
      status: "Completed",
      image: "📚"
    },
    {
      id: 2,
      title: "Bimbingan Belajar",
      organization: "Educational Center",
      date: "December 20, 2024",
      participants: 200,
      status: "Ongoing",
      image: "🎓"
    },
    {
      id: 3,
      title: "Penyelenggaraan Peringatan Hari Ulang Tahun (HUT) RI ke 80",
      organization: "Government Institution",
      date: "August 17, 2024",
      participants: 500,
      status: "Completed",
      image: "🇮🇩"
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
              <Calendar className="w-16 h-16 mx-auto mb-6 text-blue-200" />
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                Latest Activities
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Discover our recent seminars, trainings, and certificate programs. 
                Join thousands of participants in professional development activities.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Activities Grid */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Recent Activities
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full"></div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
                >
                  {/* Activity Image */}
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                    <div className="text-6xl">{activity.image}</div>
                  </div>

                  {/* Activity Content */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                        {activity.organization}
                      </span>
                      <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                        activity.status === 'Completed' 
                          ? 'text-green-600 bg-green-100' 
                          : 'text-orange-600 bg-orange-100'
                      }`}>
                        {activity.status}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                      {activity.title}
                    </h3>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="text-sm">{activity.date}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="text-sm">{activity.participants} participants</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors duration-200">
                        Share
                      </button>
                      <button className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors duration-200">
                        e-Certificate
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
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
                Activity Statistics
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Our platform has successfully managed numerous activities across various organizations.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: <Users className="w-8 h-8" />, number: "6,372", label: "Total Participants", gradient: "from-teal-500 to-teal-600" },
                { icon: <Calendar className="w-8 h-8" />, number: "77", label: "Activities Completed", gradient: "from-pink-500 to-pink-600" },
                { icon: <Award className="w-8 h-8" />, number: "610", label: "Institutions Served", gradient: "from-purple-500 to-purple-600" },
                { icon: <Clock className="w-8 h-8" />, number: "98%", label: "On-Time Completion", gradient: "from-orange-500 to-orange-600" }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-8 text-white text-center shadow-lg hover:shadow-xl transition-shadow duration-300`}
                >
                  <div className="flex justify-center mb-4">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold mb-2">{stat.number}</div>
                  <div className="text-sm opacity-90">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6">
                Ready to Join Our Next Activity?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Stay updated with our latest seminars, trainings, and certificate programs. 
                Don't miss out on professional development opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors duration-200">
                  View All Activities
                </button>
                <button className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200">
                  Subscribe to Updates
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
