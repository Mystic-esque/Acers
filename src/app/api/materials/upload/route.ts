import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';

// Use Node.js runtime for file processing
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Auth error in upload API:", authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string || file.name.replace('.pdf', '');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Extract text from PDF using unpdf (serverless-compatible, no native deps)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let rawContent = '';
    try {
      const pdf = await getDocumentProxy(uint8Array);
      const { text } = await extractText(pdf, { mergePages: true });
      rawContent = text || '';

      if (!rawContent.trim()) {
        return NextResponse.json(
          { error: 'Could not extract text from this PDF. It may be a scanned image or have no selectable text.' },
          { status: 400 }
        );
      }
    } catch (e) {
      console.error("PDF Parse error:", e);
      return NextResponse.json(
        { error: 'Failed to extract text from PDF. It might be scanned or corrupted.' },
        { status: 400 }
      );
    }

    // Clean up extra whitespace while preserving paragraph breaks
    rawContent = rawContent.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    // 1. Upload file to Supabase Storage
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    let { error: storageError } = await supabase.storage
      .from('materials')
      .upload(fileName, file);

    // If bucket doesn't exist, create it and retry
    if (storageError && storageError.message.includes('Bucket not found')) {
      console.log("Bucket 'materials' not found, attempting to create it...");
      await supabase.storage.createBucket('materials', {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      });

      // Retry upload
      const retry = await supabase.storage.from('materials').upload(fileName, file);
      storageError = retry.error;
    }

    if (storageError && storageError.message !== 'The resource already exists') {
      console.error("Storage error:", storageError);
      // We can continue even if storage fails, but ideally it works
    }

    // 2. Insert material into DB
    const { data: material, error: insertError } = await supabase
      .from('materials')
      .insert({
        user_id: user.id,
        title,
        source_type: 'uploaded_doc',
        raw_content: rawContent,
        storage_path: fileName
      })
      .select()
      .single();

    if (insertError) {
      console.error("DB Insert error:", insertError);
      return NextResponse.json({ error: 'Failed to save material' }, { status: 500 });
    }

    // Return the created material so the client can trigger concept extraction
    return NextResponse.json({ materialId: material.id, success: true });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
