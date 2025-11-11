import { supabaseClient } from "./client";

export interface Score {
  id: string;
  score_no: string;
  name: string;
  description: string | null;
  issue_date: string;
  expired_date: string | null;
  category: string | null;
  template_id: string | null;
  member_id: string | null;
  score_image_url: string | null;
  text_layers: TextLayer[];
  score_data: ScoreData;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  public_id: string;
  is_public: boolean;
  // Optional joined relations
  members?: {
    id?: string;
    name?: string;
    email?: string;
    organization?: string;
    phone?: string | null;
    job?: string | null;
    city?: string | null;
  } | null;
  templates?: {
    id?: string;
    name?: string;
    category?: string | null;
    orientation?: string | null;
  } | null;
}

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  xPercent: number;
  yPercent: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  fontFamily: string;
}

export interface ScoreData {
  nilai_prestasi?: string;
  keterangan?: string;
  date: string;
  pembina: {
    nama: string;
  };
  aspek_non_teknis: Array<{
    no: number;
    aspek: string;
    nilai: number;
  }>;
  aspek_teknis: Array<{
    no: number;
    standar_kompetensi: string;
    nilai: number;
  }>;
}

export interface CreateScoreData {
  name: string;
  description?: string;
  issue_date: string;
  expired_date?: string;
  category?: string;
  template_id?: string;
  member_id?: string;
  score_image_url?: string;
  text_layers?: TextLayer[];
  score_data: ScoreData;
  merged_image?: string; // Data URL for immediate display
}

export interface UpdateScoreData {
  name?: string;
  description?: string;
  issue_date?: string;
  expired_date?: string;
  category?: string;
  template_id?: string;
  member_id?: string;
  score_image_url?: string;
  text_layers?: TextLayer[];
  score_data?: ScoreData;
}

// Get scores by member
export async function getScoresByMember(
  memberId: string,
): Promise<Score[]> {
  const { data, error } = await supabaseClient
    .from("scores")
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch scores by member: ${error.message}`,
    );
  }

  return data || [];
}

// Get score by public ID
export async function getScoreByPublicId(publicId: string): Promise<Score | null> {
  const { data, error } = await supabaseClient
    .from("scores")
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .eq("public_id", publicId)
    .eq("is_public", true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch score: ${error.message}`);
  }

  return data;
}

// Get all scores with pagination
export async function getAllScores(
  page: number = 1,
  limit: number = 10,
): Promise<{ scores: Score[]; total: number }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseClient
    .from("scores")
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch scores: ${error.message}`);
  }

  return {
    scores: data || [],
    total: count || 0,
  };
}

// Generate unique score number
export async function generateScoreNumber(): Promise<string> {
  const { data, error } = await supabaseClient
    .from("scores")
    .select("score_no")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to generate score number: ${error.message}`);
  }

  const lastScore = data?.[0];
  let nextNumber = 1;

  if (lastScore?.score_no) {
    const match = lastScore.score_no.match(/SC-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `SC-${nextNumber.toString().padStart(6, "0")}`;
}

// Create new score
export async function createScore(
  scoreData: CreateScoreData,
): Promise<Score> {
  try {
    console.log("🚀 Starting score creation process...");

    // Generate unique score number
    const scoreNo = await generateScoreNumber();
    console.log("🔢 Generated score number:", scoreNo);

    // Generate public ID
    const publicId = crypto.randomUUID();
    console.log("🔑 Generated public_id:", publicId);

    const insertData = {
      score_no: scoreNo,
      name: scoreData.name.trim(),
      description: scoreData.description?.trim() || null,
      issue_date: scoreData.issue_date,
      expired_date: scoreData.expired_date || null,
      category: scoreData.category?.trim() || null,
      template_id: scoreData.template_id || null,
      member_id: scoreData.member_id || null,
      // Prefer public URL if provided; fall back to merged_image (data URL)
      score_image_url:
        scoreData.score_image_url ||
        scoreData.merged_image ||
        null,
      text_layers: scoreData.text_layers || [],
      score_data: scoreData.score_data || {},
      public_id: publicId,
      is_public: true, // Default to public
    };

    console.log("💾 Inserting score data to database:", insertData);

    // Insert data into scores table
    const { data, error } = await supabaseClient
      .from("scores")
      .insert([insertData])
      .select(
        `
        *,
        templates (
          id,
          name,
          category,
          orientation
        ),
        members:members(*)
      `,
      )
      .single();

    if (error) {
      console.error("❌ Database insert error:", error);
      throw new Error(`Failed to create score: ${error.message}`);
    }

    console.log("✅ Score created successfully in database:", data);
    return data;
  } catch (error) {
    console.error("💥 Score creation process failed:", error);
    throw error;
  }
}

// Update score
export async function updateScore(
  id: string,
  scoreData: UpdateScoreData,
): Promise<Score> {
  const { data, error } = await supabaseClient
    .from("scores")
    .update({
      ...scoreData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .single();

  if (error) {
    throw new Error(`Failed to update score: ${error.message}`);
  }

  return data;
}

// Delete score
export async function deleteScore(id: string): Promise<void> {
  const { error } = await supabaseClient
    .from("scores")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete score: ${error.message}`);
  }
}

// Get score by ID
export async function getScoreById(id: string): Promise<Score | null> {
  const { data, error } = await supabaseClient
    .from("scores")
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch score: ${error.message}`);
  }

  return data;
}
