import { supabase } from '@/lib/supabase/client'

export async function uploadFile(
  file: File,
  bucket: string,
  folder: string
): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath)

  return publicUrl
}

export async function uploadPhoto(file: File): Promise<string> {
  // Validate file type
  if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
    throw new Error('Only JPG and PNG images are allowed')
  }

  // Validate file size (2MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('File size must be less than 2MB')
  }

  return uploadFile(file, 'documents', 'accused-photos')
}

export async function uploadDocument(file: File): Promise<string> {
  // Validate file type
  if (!file.type.match(/^application\/pdf$/)) {
    throw new Error('Only PDF files are allowed')
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB')
  }

  return uploadFile(file, 'documents', 'bail-documents')
}


