-- Create certificates table for storing generated certificates
-- This table stores all certificate data including text layers and template relationships

CREATE TABLE IF NOT EXISTS certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    certificate_no VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    issue_date DATE NOT NULL,
    expired_date DATE,
    qr_code TEXT,
    category VARCHAR(100),
    
    -- Template relationship
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    
    -- Certificate image/rendered output
    certificate_image_url TEXT,
    
    -- Text layers data (stored as JSON for flexibility)
    text_layers JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_no ON certificates(certificate_no);
CREATE INDEX IF NOT EXISTS idx_certificates_template_id ON certificates(template_id);
CREATE INDEX IF NOT EXISTS idx_certificates_created_at ON certificates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_category ON certificates(category);
CREATE INDEX IF NOT EXISTS idx_certificates_name ON certificates(name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_certificates_updated_at 
    BEFORE UPDATE ON certificates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read all certificates
CREATE POLICY "Allow authenticated users to read certificates" ON certificates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert certificates
CREATE POLICY "Allow authenticated users to insert certificates" ON certificates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update certificates
CREATE POLICY "Allow authenticated users to update certificates" ON certificates
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete certificates
CREATE POLICY "Allow authenticated users to delete certificates" ON certificates
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON TABLE certificates IS 'Stores generated certificates with their data and template relationships';
COMMENT ON COLUMN certificates.certificate_no IS 'Unique certificate number/identifier';
COMMENT ON COLUMN certificates.name IS 'Recipient name';
COMMENT ON COLUMN certificates.description IS 'Certificate description or achievement details';
COMMENT ON COLUMN certificates.issue_date IS 'Date when certificate was issued';
COMMENT ON COLUMN certificates.expired_date IS 'Optional expiry date for the certificate';
COMMENT ON COLUMN certificates.qr_code IS 'QR code data or URL for verification';
COMMENT ON COLUMN certificates.category IS 'Certificate category/type';
COMMENT ON COLUMN certificates.template_id IS 'Reference to the template used to create this certificate';
COMMENT ON COLUMN certificates.certificate_image_url IS 'URL to the rendered certificate image';
COMMENT ON COLUMN certificates.text_layers IS 'JSON array of text layers with positioning and styling data';
COMMENT ON COLUMN certificates.created_by IS 'User who created the certificate';
