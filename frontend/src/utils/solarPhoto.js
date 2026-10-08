const maxGalleryBytes = 700 * 1024;
const maxPhotoCount = 5;
const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function prepareSolarPhotos(files) {
  const selectedFiles = Array.from(files);
  if (!selectedFiles.length) return [];
  if (selectedFiles.length > maxPhotoCount) {
    throw new Error(`Choose no more than ${maxPhotoCount} solar photos.`);
  }

  const photos = [];
  let totalBytes = 0;
  try {
    for (const file of selectedFiles) {
      if (!supportedTypes.has(file.type)) {
        throw new Error('Choose JPEG, PNG, or WebP photos.');
      }

      let bitmap;
      try {
        bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1280 / bitmap.width, 900 / bitmap.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Your browser could not prepare the solar photo.');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        let photo;
        for (const quality of [0.82, 0.68, 0.52]) {
          photo = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
          if (!photo) throw new Error('Your browser could not prepare the solar photo.');
          if (totalBytes + photo.size <= maxGalleryBytes) break;
          photo = null;
        }
        if (!photo) {
          throw new Error('Your selected photos are too large together. Choose fewer or smaller photos.');
        }

        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const [, encoded] = String(reader.result).split(',', 2);
            if (!encoded) reject(new Error('Could not read the selected solar photo.'));
            else resolve(encoded);
          };
          reader.onerror = () => reject(new Error('Could not read the selected solar photo.'));
          reader.readAsDataURL(photo);
        });
        totalBytes += photo.size;
        photos.push({
          data,
          contentType: 'image/jpeg',
          preview: URL.createObjectURL(photo)
        });
      } finally {
        bitmap?.close();
      }
    }
    return photos;
  } catch (error) {
    photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    throw error;
  }
}
