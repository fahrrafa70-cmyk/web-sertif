"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CertItem = {
  number: string;
  recipient: string;
  category: string;
  issueDate: string;
  expiryDate: string;
};

const CERTS: CertItem[] = [
  { number: "EC-2025-0001", recipient: "Ayu Pratama", category: "Training", issueDate: "2025-01-12", expiryDate: "2027-01-12" },
  { number: "EC-2025-0002", recipient: "Budi Santoso", category: "Internship", issueDate: "2025-02-05", expiryDate: "2027-02-05" },
  { number: "EC-2025-0003", recipient: "Clara Wijaya", category: "MoU", issueDate: "2025-03-21", expiryDate: "—" },
];

export default function CertificatesPage() {
  const params = useSearchParams();
  const certQuery = (params?.get("cert") || "").toLowerCase();
  const filtered = certQuery
    ? CERTS.filter((c) => c.number.toLowerCase().includes(certQuery))
    : CERTS;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Certificates</h1>
                <p className="text-gray-500 mt-1">Manage certificates</p>
              </div>
              <div className="flex items-center gap-3">
                <Input placeholder="Search by number or name" className="w-64" />
                <Input placeholder="Filter by category" className="w-48" />
                <Input placeholder="Filter by date" className="w-40" type="date" />
              </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableCaption>Static data for demonstration</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate Number</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.number}>
                      <TableCell className="font-medium">{c.number}</TableCell>
                      <TableCell>{c.recipient}</TableCell>
                      <TableCell>{c.category}</TableCell>
                      <TableCell>{c.issueDate}</TableCell>
                      <TableCell>{c.expiryDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" className="border-gray-300">View</Button>
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


