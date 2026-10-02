self.onmessage = async ({ data }) => {
    let bitmap;
    try {
        bitmap = await createImageBitmap(data.file);
        const scale = Math.min(1, data.maxWidth / Math.max(bitmap.width, bitmap.height));
        const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        bitmap = null;
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: data.quality });
        self.postMessage({ base64: new FileReaderSync().readAsDataURL(blob) });
    } catch (error) {
        self.postMessage({ error: error.message });
    } finally {
        bitmap?.close();
    }
};
