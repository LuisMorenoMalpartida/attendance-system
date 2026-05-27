import { put, del, list, head } from '@vercel/blob';

export const storage = {
  /**
   * Subir una imagen de perfil (siempre privada)
   */
  uploadProfilePhoto: async (file: File, userId: number): Promise<string> => {
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `profiles/${userId}/photo-${Date.now()}.${extension}`;

    const blob = await put(filename, file, {
      access: 'private', // Cambiado a private
      addRandomSuffix: false,
      contentType: file.type,
    });

    // Guardamos la URL completa (incluye token temporal)
    return blob.url;
  },

  /**
   * Obtener URL temporal para visualización (válida por 1 hora)
   */
  getProfilePhotoUrl: async (url: string): Promise<string> => {
    try {
      // Extraer el pathname de la URL
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.substring(1); // Quitar el '/' inicial
      
      // Obtener metadata del blob
      const blob = await head(pathname);
      
      // La URL ya incluye token temporal si es privado
      return blob.url;
    } catch (error) {
      console.error('Error al obtener URL de imagen:', error);
      return '/default-avatar.png'; // Imagen por defecto
    }
  },

  /**
   * Eliminar una imagen de perfil
   */
  deleteProfilePhoto: async (url: string): Promise<void> => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.substring(1);
      await del(pathname);
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
    }
  },

  /**
   * Subir documento de justificación (privado)
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
   * Limpiar archivos antiguos
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