/**
 * Generate XID (eXternal ID) for file naming
 * 
 * XID Format: {timestamp_base36}{random_base36}
 * - Sortable by time (timestamp first)
 * - Unique (random suffix)
 * - URL-safe (base36: 0-9, a-z)
 * - Compact (~16-20 characters)
 * 
 * Example: c8pjd3q4k0abc123
 */

/**
 * Generate a unique XID
 * @returns XID string (e.g., "c8pjd3q4k0abc123")
 */
export function generateXID(): string {
  const timestamp = Date.now();
  
  // Convert timestamp to base36 for compactness
  const timestampBase36 = timestamp.toString(36);
  
  // Generate random suffix (8 characters)
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  
  // Combine: timestamp + random
  const xid = `${timestampBase36}${randomSuffix}`;
  
  return xid;
}

/**
 * Parse XID to extract timestamp
 * @param xid - XID string
 * @returns Timestamp in milliseconds, or null if invalid
 */
export function parseXID(xid: string): number | null {
  try {
    // XID format: {timestamp_base36}{random_8chars}
    // Timestamp is first ~11 characters (varies by year)
    // Extract timestamp part (before random suffix)
    const timestampPart = xid.substring(0, 11);
    const timestamp = parseInt(timestampPart, 36);
    
    if (isNaN(timestamp)) {
      return null;
    }
    
    return timestamp;
  } catch {
    return null;
  }
}

/**
 * Generate filename with XID
 * @param suffix - File suffix (e.g., "cert", "score")
 * @param extension - File extension (default: "png")
 * @returns Filename with XID (e.g., "c8pjd3q4k0abc123_cert.png")
 */
export function generateXIDFilename(suffix?: string, extension: string = 'png'): string {
  const xid = generateXID();
  
  if (suffix) {
    return `${xid}_${suffix}.${extension}`;
  }
  
  return `${xid}.${extension}`;
}

/**
 * Generate paired filenames for certificate and score
 * @returns Object with certificate and score filenames using same XID
 */
export function generatePairedXIDFilenames(): { cert: string; score: string; xid: string } {
  const xid = generateXID();
  
  return {
    cert: `${xid}_cert.png`,
    score: `${xid}_score.png`,
    xid: xid
  };
}
