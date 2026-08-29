import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudyWorkspace } from "./StudyWorkspace";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="p-8">Please log in to view this material.</div>
    );
  }

  // Fetch material
  const { data: material, error } = await supabase
    .from("materials")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !material) {
    notFound();
  }

  // Fetch concepts for this material
  const { data: concepts } = await supabase
    .from("concepts")
    .select("*")
    .eq("material_id", id);

  // Create a study session if needed, or we can just track it on the client/first AI call.
  // Create a study session if needed
  const { data: session } = await supabase
    .from("study_sessions")
    .insert({
      material_id: material.id,
      user_id: user.id,
    })
    .select()
    .single();

  // Get signed URL if it's an uploaded document
  let signedPdfUrl = null;
  if (material.source_type === 'uploaded_doc' && material.storage_path) {
    const { data: urlData } = await supabase
      .storage
      .from('materials')
      .createSignedUrl(material.storage_path, 3600 * 24); // 24 hours
    if (urlData) {
      signedPdfUrl = urlData.signedUrl;
    }
  }
  // Check if an audio overview already exists
  let initialAudioUrl = null;
  const { data: files } = await supabase.storage.from('materials').list('overviews', { search: `${id}_overview.wav` });
  if (files && files.length > 0 && (files[0].metadata?.size ?? 0) > 0) {
    const { data: publicUrlData } = supabase.storage.from('materials').getPublicUrl(`overviews/${id}_overview.wav`);
    initialAudioUrl = publicUrlData.publicUrl;
  }

  return (
    <StudyWorkspace 
      material={material} 
      sessionId={session?.id} 
      concepts={concepts || []}
      pdfUrl={signedPdfUrl}
      initialAudioUrl={initialAudioUrl}
    />
  );
}
