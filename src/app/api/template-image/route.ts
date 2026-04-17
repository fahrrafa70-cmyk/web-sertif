import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * GET /api/template-image?path=<storage-path>&bucket=<bucket>
 *
 * Server-side proxy that streams Supabase storage files using the service
 * role key so private buckets can serve images to the browser without
 * triggering ERR_BLOCKED_BY_ORB.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const path = searchParams.get("path");
  const bucket = searchParams.get("bucket") ?? "templates";

  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .download(path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "File not found" },
      { status: 404 },
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  const contentType = data.type || "image/jpeg";

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
