"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MEMBERS = [
  { name: "Ayu Pratama", organization: "PT. Nusantara", email: "ayu@nusantara.co.id", phone: "+62 812-0000-0001", job: "Coordinator" },
  { name: "Budi Santoso", organization: "Universitas ABC", email: "budi@uabc.ac.id", phone: "+62 812-0000-0002", job: "Admin" },
];

export default function MembersPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Members</h1>
                <p className="text-gray-500 mt-1">Manage platform members</p>
              </div>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">Add Member</Button>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MEMBERS.map((m) => (
                    <TableRow key={m.email}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.organization}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>{m.phone}</TableCell>
                      <TableCell>{m.job}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" className="border-gray-300">Edit</Button>
                          <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">Delete</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


