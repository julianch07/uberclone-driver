// AI-assisted: see docs/AI_LOG.md #7
import { File } from "expo-file-system";

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export async function uploadDriverImage(imageUri, imageName) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Falta configurar las variables de entorno de Cloudinary.');
  }

  if (!imageUri) {
    throw new Error('No se proporcionó una imagen para subir.');
  }

  const formData = new FormData();

  const imageFile = new File(imageUri);
  formData.append("file", imageFile, imageName + (imageFile.extension || ".jpg"));

  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error?.message || 'No se pudo subir la imagen a Cloudinary.'
    );
  }

  if (!result.secure_url) {
    throw new Error('Cloudinary no devolvió una URL segura para la imagen.');
  }

  return result.secure_url;
}
