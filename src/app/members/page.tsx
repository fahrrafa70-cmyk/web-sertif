"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { Member, createMember, getMembers, updateMember, deleteMember as deleteMemberService } from "@/lib/supabase/members";
import { Certificate, getCertificatesByMember } from "@/lib/supabase/certificates";
import { toast } from "sonner";

export default function MembersPage() {
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [membersData, setMembersData] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [adding, setAdding] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    phone: "",
    job: "",
    date_of_birth: "",
    address: "",
    city: "",
    notes: "",
  });

  // Viewer state for member's certificates
  const [viewerOpen, setViewerOpen] = useState<boolean>(false);
  const [viewerMember, setViewerMember] = useState<Member | null>(null);
  const [viewerCerts, setViewerCerts] = useState<Certificate[]>([]);
  const [viewerLoading, setViewerLoading] = useState<boolean>(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState<boolean>(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

  // Edit modal state
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    organization: "",
    phone: "",
    job: "",
    date_of_birth: "",
    address: "",
    city: "",
    notes: "",
  });

  async function openViewer(member: Member) {
    setViewerMember(member);
    setViewerOpen(true);
    try {
      setViewerLoading(true);
      const certs = await getCertificatesByMember(member.id);
      setViewerCerts(certs);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to load certificates");
    } finally {
      setViewerLoading(false);
    }
  }

  async function loadMembers() {
    try {
      setLoading(true);
      const data = await getMembers();
      setMembersData(data);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  // Load role from localStorage and initialize
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // Load role
        const raw = window.localStorage.getItem("ecert-role") || "";
        console.log("🔍 Checking role from localStorage:", raw);
        const normalized = raw.toLowerCase();
        const mapped = normalized === "admin" ? "Admin" : normalized === "team" ? "Team" : normalized === "public" ? "Public" : "Public";
        setRole(mapped);
        console.log("✅ Role set to:", mapped);
        
        // Load members if authorized
        if (mapped === "Admin" || mapped === "Team") {
          await loadMembers();
        } else {
          setLoading(false);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error("❌ Error initializing component:", error);
        setRole("Public");
        setLoading(false);
        setInitialized(true);
      }
    };
    
    initializeComponent();
  }, []);

  function openEdit(member: Member) {
    setEditingMember(member);
    setEditForm({
      name: member.name || "",
      email: member.email || "",
      organization: member.organization || "",
      phone: member.phone || "",
      job: member.job || "",
      date_of_birth: member.date_of_birth || "",
      address: member.address || "",
      city: member.city || "",
      notes: member.notes || "",
    });
    setEditOpen(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    if (!editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      setEditSaving(true);
      const updated = await updateMember(editingMember.id, {
        name: editForm.name,
        email: editForm.email || undefined,
        organization: editForm.organization || undefined,
        phone: editForm.phone || undefined,
        job: editForm.job || undefined,
        date_of_birth: editForm.date_of_birth || undefined,
        address: editForm.address || undefined,
        city: editForm.city || undefined,
        notes: editForm.notes || undefined,
      });
      // Update local list
      setMembersData((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success("Member updated");
      setEditOpen(false);
      setEditingMember(null);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to update member");
    } finally {
      setEditSaving(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      setAdding(true);
      const added = await createMember({
        name: form.name,
        email: form.email || undefined,
        organization: form.organization || undefined,
        phone: form.phone || undefined,
        job: form.job || undefined,
        date_of_birth: form.date_of_birth || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Member added successfully");
      setShowForm(false);
      setForm({ name: "", email: "", organization: "", phone: "", job: "", date_of_birth: "", address: "", city: "", notes: "" });
      // optimistic update
      setMembersData((prev) => [added, ...prev]);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setAdding(false);
    }
  }

  // Delete member function (only for Admin)
  async function deleteMember(id: string) {
    if (role !== "Admin") {
      toast.error("You don't have permission to delete members");
      return;
    }
    
    const member = membersData.find(m => m.id === id);
    if (!member) return;
    
    const confirmed = confirm(`Are you sure you want to delete member "${member.name}"? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
      setDeleting(id);
      // Call the actual delete function from members service
      await deleteMemberService(id);
      
      // Remove from local state after successful deletion
      setMembersData(prev => prev.filter(m => m.id !== id));
      toast.success(`Member "${member.name}" deleted successfully`);
    } catch (error) {
      console.error("Failed to delete member:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete member");
    } finally {
      setDeleting(null);
    }
  }

  const members = useMemo(() => membersData, [membersData]);
  const canDelete = role === "Admin";

  // Show loading while initializing
  if (!initialized) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Loading...
              </h1>
              <p className="text-gray-500">
                Please wait while we load the members page.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Redirect if not authorized
  if (role === "Public") {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Access Denied
              </h1>
              <p className="text-gray-500">
                You don't have permission to access this page.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
              {(role === "Admin" || role === "Team") && (
                <Button onClick={() => setShowForm((s) => !s)} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  {showForm ? "Close" : "Add Member"}
                </Button>
              )}
            </div>

            {showForm && (role === "Admin" || role === "Team") && (
              <motion.form onSubmit={onSubmit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-xl">
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Full Name</label>
                  <Input value={form.name} placeholder="e.g. John Doe" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Email</label>
                  <Input type="email" value={form.email} placeholder="name@example.com" onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Organization</label>
                  <Input value={form.organization} placeholder="Optional" onChange={(e) => setForm({ ...form, organization: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Phone</label>
                  <Input value={form.phone} placeholder="Optional" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Job</label>
                  <Input value={form.job} placeholder="Optional" onChange={(e) => setForm({ ...form, job: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Date of Birth</label>
                  <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-gray-700">Address</label>
                  <Input value={form.address} placeholder="Optional" onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">City</label>
                  <Input value={form.city} placeholder="Optional" onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <label className="text-sm text-gray-700">Notes</label>
                  <Input value={form.notes} placeholder="Optional" onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={adding} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    {adding ? "Adding..." : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 md:col-span-2 lg:col-span-3">Members are recipients (not app users). Use this form to add participants.</p>
              </motion.form>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.organization || "—"}</TableCell>
                      <TableCell>{m.email || "—"}</TableCell>
                      <TableCell>{m.phone || "—"}</TableCell>
                      <TableCell>{m.job || "—"}</TableCell>
                      <TableCell>{m.city || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => openViewer(m)}>View Certificates</Button>
                          {(role === "Admin" || role === "Team") && (
                            <Button variant="outline" className="border-gray-300" onClick={() => openEdit(m)}>Edit</Button>
                          )}
                          {canDelete && (
                            <Button 
                              className="bg-gradient-to-r from-red-500 to-red-600 text-white" 
                              onClick={() => deleteMember(m.id)}
                              disabled={deleting === m.id}
                            >
                              {deleting === m.id ? "Deleting..." : "Delete"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading members...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl text-gray-400">👥</span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-600 mb-2">No members found</h3>
                          <p className="text-gray-500 mb-4">Get started by adding your first member.</p>
                          {(role === "Admin" || role === "Team") && (
                            <button
                              onClick={() => setShowForm(true)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Add Member
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </motion.div>

            {viewerOpen && (
              <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center" onClick={() => setViewerOpen(false)}>
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Certificates — {viewerMember?.name}</h3>
                    <Button variant="outline" onClick={() => setViewerOpen(false)}>Close</Button>
                  </div>
                  {viewerLoading ? (
                    <p className="text-gray-500">Loading...</p>
                  ) : viewerCerts.length === 0 ? (
                    <p className="text-gray-500">No certificates found for this member.</p>
                  ) : (
                    <div className="space-y-2">
                      {viewerCerts.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{c.certificate_no}</div>
                            <div className="text-sm text-gray-500">{c.category || "—"} · Issued {new Date(c.issue_date).toLocaleDateString()}</div>
                          </div>
                          <Button variant="outline" onClick={() => { if (c.certificate_image_url) { setImagePreviewUrl(c.certificate_image_url); setImagePreviewOpen(true); } }}>Preview</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {editOpen && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Edit Member</h3>
                    <Button variant="outline" onClick={() => setEditOpen(false)}>Close</Button>
                  </div>
                  <form onSubmit={submitEdit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">Full Name</label>
                      <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">Email</label>
                      <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">Organization</label>
                      <Input value={editForm.organization} onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">Phone</label>
                      <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">Job</label>
                      <Input value={editForm.job} onChange={(e) => setEditForm({ ...editForm, job: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">Date of Birth</label>
                      <Input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm text-gray-700">Address</label>
                      <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700">City</label>
                      <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                      <label className="text-sm text-gray-700">Notes</label>
                      <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" disabled={editSaving} className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                        {editSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {imagePreviewOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setImagePreviewOpen(false)}>
                <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="text-sm text-gray-600">Certificate Image Preview</div>
                    <Button variant="outline" onClick={() => setImagePreviewOpen(false)}>Close</Button>
                  </div>
                  <div className="p-4 bg-gray-50">
                    {imagePreviewUrl ? (
                      <img src={imagePreviewUrl} alt="Certificate" className="w-full h-auto rounded-lg border" />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500 border rounded-lg bg-white">No image</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


