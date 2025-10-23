-- ============================================================================
-- PROPOSAL: Add Score Data Support for Dual-Mode Templates
-- ============================================================================
-- 
-- REASONING:
-- For dual-mode templates (Certificate + Score), we need to store score-specific
-- insert data separately from certificate data. This includes:
-- - Aspek Non Teknis (6 fixed items with valtemplues)
-- - Aspek Teknis (6 items with custom labels and values)
-- - Additional fields (Nilai/Prestasi, Keterangan, Date, Signature)
--
-- APPROACH:
-- Add a JSONB column 'score_data' to the existing 'certificates' table.
-- This approach:
-- ✅ Maintains backward compatibility (NULL for single-mode certificates)
-- ✅ Flexible structure for score data
-- ✅ No need for additional tables or complex joins
-- ✅ Easy to query and update
-- ✅ Supports future extensions
--
-- ALTERNATIVE CONSIDERED:
-- Creating a separate 'certificate_scores' table with foreign key to certificates.
-- Rejected because:
-- ❌ Adds complexity with joins
-- ❌ Overkill for this use case
-- ❌ Score data is tightly coupled to certificate
--
-- ============================================================================

-- Add score_data column to certificates table
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS score_data JSONB;

-- Add score_image_url column for generated score sheet image
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS score_image_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN certificates.score_data IS 'Score/Nilai data for dual-mode templates (JSONB format)';
COMMENT ON COLUMN certificates.score_image_url IS 'URL to generated score sheet image (for dual-mode templates)';

-- ============================================================================
-- SCORE DATA STRUCTURE (JSONB Format)
-- ============================================================================
--
-- {
--   "aspek_non_teknis": [
--     {"no": 1, "aspek": "Disiplin", "nilai": 85},
--     {"no": 2, "aspek": "Kreativitas", "nilai": 90},
--     {"no": 3, "aspek": "Inisiatif", "nilai": 88},
--     {"no": 4, "aspek": "Kerjasama", "nilai": 92},
--     {"no": 5, "aspek": "Tanggung Jawab", "nilai": 87},
--     {"no": 6, "aspek": "Kejujuran", "nilai": 95}
--   ],
--   "aspek_teknis": [
--     {"no": 1, "standar_kompetensi": "Pemrograman Web", "nilai": 88},
--     {"no": 2, "standar_kompetensi": "Database Design", "nilai": 90},
--     {"no": 3, "standar_kompetensi": "UI/UX Design", "nilai": 85},
--     {"no": 4, "standar_kompetensi": "API Development", "nilai": 92},
--     {"no": 5, "standar_kompetensi": "Testing", "nilai": 87},
--     {"no": 6, "standar_kompetensi": "Deployment", "nilai": 89}
--   ],
--   "nilai_prestasi": "88.5 (BAIK)",
--   "keterangan": "Peserta menunjukkan performa yang baik",
--   "date": "2025-01-23",
--   "pembina": {
--     "jabatan": "Pembina Magang",
--     "nama": "Dr. John Doe",
--     "signature_url": "/signatures/john_doe.png"
--   }
-- }
--
-- ============================================================================

-- Create index for faster queries on certificates with score data
CREATE INDEX IF NOT EXISTS idx_certificates_score_data 
ON certificates USING GIN (score_data) 
WHERE score_data IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'certificates'
AND column_name IN ('score_data', 'score_image_url')
ORDER BY ordinal_position;

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- Get certificates with score data (dual-mode)
-- SELECT id, name, certificate_no, score_data 
-- FROM certificates 
-- WHERE score_data IS NOT NULL;

-- Get average score for aspek non teknis
-- SELECT 
--   certificate_no,
--   name,
--   (
--     SELECT AVG((value->>'nilai')::numeric)
--     FROM jsonb_array_elements(score_data->'aspek_non_teknis') AS value
--   ) as avg_non_teknis
-- FROM certificates
-- WHERE score_data IS NOT NULL;

-- Search by specific aspek value
-- SELECT id, name, certificate_no
-- FROM certificates
-- WHERE score_data @> '{"aspek_non_teknis": [{"aspek": "Disiplin", "nilai": 85}]}';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- ALTER TABLE certificates DROP COLUMN IF EXISTS score_data;
-- ALTER TABLE certificates DROP COLUMN IF EXISTS score_image_url;
-- DROP INDEX IF EXISTS idx_certificates_score_data;
