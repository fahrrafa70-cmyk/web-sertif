"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCertificateByXID, getCertificateByPublicId } from "@/lib/supabase/certificates";

export default function RedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [error, setError] = useState(false);

  useEffect(() => {
    async function lookupAndRedirect() {
      if (!id) {
        setError(true);
        return;
      }

      try {
        // Auto-detect format: UUID (36 chars with dashes) or XID (16-20 chars)
        const isUUID = id.includes('-') && id.length === 36;
        
        const cert = isUUID 
          ? await getCertificateByPublicId(id)   // Old format: UUID
          : await getCertificateByXID(id);       // Compact format: XID
        
        if (cert && cert.certificate_no) {
          // Redirect to new /cek/ URL with certificate number
          router.replace(`/cek/${cert.certificate_no}`);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Redirect lookup error:", err);
        setError(true);
      }
    }

    lookupAndRedirect();
  }, [id, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Certificate Not Found</h1>
          <p className="text-gray-600 mb-4">The certificate you are looking for could not be found.</p>
          <button 
            onClick={() => router.push('/search')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Search Certificates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
