import { put, del, list } from '@vercel/blob';

export const storage = {
  /**
   * Subir una imagen de perfil
   */
  uploadProfilePhoto: async (file: File, userId: number): Promise<string> => {
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `profiles/${userId}/photo-${Date.now()}.${extension}`;

    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
    });

    return blob.url;
  },

  /**
   * Eliminar una imagen de perfil
   */
  deleteProfilePhoto: async (url: string): Promise<void> => {
    try {
      // Extraer el pathname de la URL
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.substring(1); // Quitar el '/' inicial
      await del(pathname);
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
    }
  },

  /**
   * Subir documento de justificación de ausencia
   */
  uploadAbsenceDocument: async (file: File, userId: number): Promise<string> => {
    const extension = file.name.split('.').pop() || 'pdf';
    const filename = `documents/${userId}/absence-${Date.now()}.${extension}`;

    const blob = await put(filename, file, {
      access: 'private',
      addRandomSuffix: false,
      contentType: file.type,
    });

    return blob.url;
  },

  /**
   * Obtener URL temporal para documento privado
   */
  getPrivateUrl: async (url: string): Promise<string> => {
    // Las URLs privadas requieren autenticación
    return url;
  },

  /**
   * Limpiar archivos antiguos de un usuario
   */
  cleanUserFiles: async (userId: number): Promise<void> => {
    try {
      const { blobs } = await list({ prefix: `profiles/${userId}/` });
      
      for (const blob of blobs) {
        await del(blob.pathname);
      }
    } catch (error) {
      console.error('Error al limpiar archivos:', error);
    }
  },
};