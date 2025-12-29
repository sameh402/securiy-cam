
export const downloadImageWithTimestamp = async (base64Data: string, timestamp: string, filename: string) => {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve();

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Setup text style
      const fontSize = Math.floor(canvas.width * 0.03);
      ctx.font = `bold ${fontSize}px monospace`;
      const padding = fontSize;
      const text = `SENTINEL AI | CAPTURE TIME: ${timestamp}`;
      const metrics = ctx.measureText(text);
      
      // Draw background for text readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(
        0, 
        canvas.height - (fontSize * 2), 
        canvas.width, 
        fontSize * 2
      );

      // Draw text
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, padding, canvas.height - fontSize);

      // Trigger download
      const link = document.createElement('a');
      link.download = `${filename}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
      resolve();
    };
    img.src = base64Data;
  });
};
