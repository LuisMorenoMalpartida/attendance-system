import { put, del } from '@vercel/blob';

interface UploadOptions {
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

interface UploadResult {
  url: string;
  pathname: string;
  contentType?: string;
}

export async function uploadImage(
  file: File,
  fileName: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    folder = 'profiles',
    maxSizeMB = 5,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  } = options;

  try {
    // Validar tipo de archivo
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Tipo de archivo no permitido. Usa: ${allowedTypes.join(', ')}`);
    }

    // Validar tamaño
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new Error(`El archivo no debe superar los ${maxSizeMB}MB`);
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generar nombre único
    const extension = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const uniqueName = `${folder}/${timestamp}-${randomString}.${extension}`;

    // Subir a Vercel Blob
    const blob = await put(uniqueName, buffer, {
      access: 'public',
      contentType: file.type,
    });

    console.log('✅ Imagen subida a Vercel Blob:', blob.url);

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type,
    };
  } catch (error) {
    console.error('❌ Error al subir imagen:', error);
    throw error;
  }
}

export async function deleteImage(url: string): Promise<boolean> {
  try {
    // Extraer el pathname de la URL
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.substring(1); // Quitar el / inicial
    
    await del(pathname);
    console.log('✅ Imagen eliminada:', pathname);
    return true;
  } catch (error) {
    console.warn('⚠️ No se pudo eliminar la imagen:', error);
    return false;
  }
}

export async function updateImage(
  oldUrl: string | null,
  newFile: File,
  fileName: string,
  options?: UploadOptions
): Promise<UploadResult> {
  // Eliminar imagen anterior si existe
  if (oldUrl) {
    try {
      await deleteImage(oldUrl);
    } catch (error) {
      console.warn('⚠️ No se pudo eliminar la imagen anterior:', error);
    }
  }

  // Subir nueva imagen
  return await uploadImage(newFile, fileName, options);
}

// Función helper para obtener el pathname de una URL de Blob
export function getPathnameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1);
  } catch {
    return url;
  }
}