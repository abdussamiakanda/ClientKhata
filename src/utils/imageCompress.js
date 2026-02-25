/**
 * Compress an image file and return it as a base64 data URL.
 * Uses canvas to resize (max dimension) and encode as JPEG to reduce size.
 *
 * @param {File} file - Image file (e.g. from input type="file")
 * @param {Object} [options]
 * @param {number} [options.maxDimension=800] - Max width or height in pixels
 * @param {number} [options.quality=0.7] - JPEG quality 0–1
 * @returns {Promise<string>} Base64 data URL (e.g. "data:image/jpeg;base64,...")
 */
export function compressImageToBase64(file, options = {}) {
  const { maxDimension = 800, quality = 0.7 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
