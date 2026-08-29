import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { TeachBackWorkspace } from "./TeachBackWorkspace";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeachBackPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: concept, error } = await supabase
    .from("concepts")
    .select("*, materials(id)")
    .eq("id", id)
    .single();

  if (error || !concept) {
    notFound();
  }

  return <TeachBackWorkspace concept={concept} />;
}
