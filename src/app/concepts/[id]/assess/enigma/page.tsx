import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import EnigmaWorkspace from './EnigmaWorkspace';

export default async function EnigmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: concept, error } = await supabase
    .from('concepts')
    .select('*, materials(*)')
    .eq('id', id)
    .single();

  if (error || !concept) {
    notFound();
  }

  return <EnigmaWorkspace concept={concept} />;
}
