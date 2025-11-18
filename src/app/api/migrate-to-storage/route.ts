import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generatePairedXIDFilenames } from '@/lib/utils/generate-xid';

interface CertificateRecord {
  id: string;
  certificate_no: string;
  certificate_image_url: string | null;
  score_image_url: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = false, limit = 10 } = await request.json().catch(() => ({ dryRun: false, limit: 10 }));

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase credentials not configured.' },
        { status: 500 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔄 Starting migration to Supabase Storage...', { dryRun, limit });

    // Fetch certificates with Data URLs
    // Note: Supabase doesn't support LIKE with or() easily, so we fetch all and filter in memory
    // For better performance with large datasets, consider using a database function
    const { data: allCertificates, error: fetchError } = await supabase
      .from('certificates')
      .select('id, certificate_no, certificate_image_url, score_image_url')
      .limit(limit * 5); // Fetch more to account for filtering

    if (fetchError) {
      console.error('❌ Error fetching certificates:', fetchError);
      return NextResponse.json(
        { success: false, error: `Failed to fetch certificates: ${fetchError.message}` },
        { status: 500 }
      );
    }

    // Filter certificates with Data URLs
    const certificates = (allCertificates as CertificateRecord[]).filter(
      cert => 
        (cert.certificate_image_url?.startsWith('data:image')) ||
        (cert.score_image_url?.startsWith('data:image'))
    ).slice(0, limit);

    if (!certificates || certificates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No certificates with Data URLs found to migrate.',
        migrated: 0,
        failed: 0,
        results: []
      });
    }

    console.log(`📊 Found ${certificates.length} certificates to migrate`);

    const results: Array<{
      id: string;
      certificate_no: string;
      certificate_image_url?: { before: string; after: string; status: string };
      score_image_url?: { before: string; after: string; status: string };
    }> = [];

    let migratedCount = 0;
    let failedCount = 0;

    // Process each certificate
    for (const cert of certificates as CertificateRecord[]) {
      const result: {
        id: string;
        certificate_no: string;
        certificate_image_url?: { before: string; after: string; status: string };
        score_image_url?: { before: string; after: string; status: string };
      } = {
        id: cert.id,
        certificate_no: cert.certificate_no,
      };

      // Generate paired XID filenames for certificate and score (same XID prefix)
      const { cert: certFileName, score: scoreFileName } = generatePairedXIDFilenames();

      // Migrate certificate_image_url
      if (cert.certificate_image_url?.startsWith('data:image')) {
        try {
          const fileName = certFileName;
          
          if (!dryRun) {
            const storageUrl = await uploadDataUrlToStorage(
              cert.certificate_image_url,
              fileName,
              'certificates',
              supabase as ReturnType<typeof createClient>
            );

            // Update database
            const { error: updateError } = await (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              supabase.from('certificates') as any
            )
              .update({ certificate_image_url: storageUrl })
              .eq('id', cert.id);

            if (updateError) {
              throw new Error(`Database update failed: ${updateError.message}`);
            }

            result.certificate_image_url = {
              before: cert.certificate_image_url.substring(0, 50) + '...',
              after: storageUrl,
              status: 'success'
            };
            migratedCount++;
          } else {
            result.certificate_image_url = {
              before: cert.certificate_image_url.substring(0, 50) + '...',
              after: `[DRY RUN] certificates/${fileName}`,
              status: 'dry-run'
            };
          }
        } catch (error) {
          result.certificate_image_url = {
            before: cert.certificate_image_url.substring(0, 50) + '...',
            after: '',
            status: `error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
          failedCount++;
        }
      }

      // Migrate score_image_url
      if (cert.score_image_url?.startsWith('data:image')) {
        try {
          const fileName = scoreFileName;
          
          if (!dryRun) {
            const storageUrl = await uploadDataUrlToStorage(
              cert.score_image_url,
              fileName,
              'certificates',
              supabase as ReturnType<typeof createClient>
            );

            // Update database
            const { error: updateError } = await (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              supabase.from('certificates') as any
            )
              .update({ score_image_url: storageUrl })
              .eq('id', cert.id);

            if (updateError) {
              throw new Error(`Database update failed: ${updateError.message}`);
            }

            result.score_image_url = {
              before: cert.score_image_url.substring(0, 50) + '...',
              after: storageUrl,
              status: 'success'
            };
            migratedCount++;
          } else {
            result.score_image_url = {
              before: cert.score_image_url.substring(0, 50) + '...',
              after: `[DRY RUN] certificates/${fileName}`,
              status: 'dry-run'
            };
          }
        } catch (error) {
          result.score_image_url = {
            before: cert.score_image_url.substring(0, 50) + '...',
            after: '',
            status: `error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
          failedCount++;
        }
      }

      results.push(result);
    }

    const message = dryRun
      ? `Dry run completed. ${certificates.length} certificates would be migrated.`
      : `Migration completed. ${migratedCount} images migrated, ${failedCount} failed.`;

    return NextResponse.json({
      success: true,
      message,
      dryRun,
      total: certificates.length,
      migrated: migratedCount,
      failed: failedCount,
      results
    });

  } catch (error: unknown) {
    console.error('💥 Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to upload Data URL to Supabase Storage
 */
async function uploadDataUrlToStorage(
  dataUrl: string,
  fileName: string,
  bucketName: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  // Extract base64 data
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  console.log(`📤 Uploading ${fileName} to storage...`, { size: buffer.length });

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, buffer, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/png',
    });

  if (error) {
    // Check if bucket doesn't exist
    if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
      throw new Error(`Storage bucket '${bucketName}' not found. Please create it in Supabase Dashboard.`);
    }
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL');
  }

  console.log(`✅ Uploaded ${fileName}: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

