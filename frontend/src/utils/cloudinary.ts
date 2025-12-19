// Small helper to build Cloudinary URLs with optimizations when we have a publicId or full URL
export function cloudinaryUrlFrom(image: any, options: { w?: number; h?: number; crop?: string; q?: 'auto' | number } = {}) {
  // If image is a full URL (already secure_url), optionally transform via Cloudinary if it's a cloudinary URL
  if (!image) return '';
  const { w, h, crop = 'fill', q = 'auto' } = options;

  // If image has a publicId and cloud name configured in backend responses, construct a Cloudinary URL
  const publicId = image.publicId || image.public_id || null;
  const url = image.url || image.secure_url || image;

  // If publicId is present, we can build a URL without backend interaction
  if (publicId) {
    // cloud name is embedded in the returned url sometimes, otherwise leave as-is
    // Example: https://res.cloudinary.com/<cloud>/image/upload/<transformations>/<publicId>.<ext>
    // We try to extract cloud name from url if available
    const cloudMatch = (url || '').match(/https:\/\/res.cloudinary.com\/([^\/]+)\//);
    const cloudName = cloudMatch ? cloudMatch[1] : process.env.VITE_CLOUDINARY_CLOUD_NAME || '';
    const transforms = [] as string[];
    if (w) transforms.push(`w_${w}`);
    if (h) transforms.push(`h_${h}`);
    if (crop) transforms.push(`c_${crop}`);
    if (q) transforms.push(`q_${q}`);
    transforms.push('f_auto');
    const transformStr = transforms.join(',');
    const ext = (publicId.split('.').pop() || 'jpg');
    const publicIdStr = publicId.replace(/\//g, '%2F');
    if (cloudName) {
      return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}/${publicIdStr}.${ext}`;
    }
  }

  // If url looks like a cloudinary url, we can append transformations after /upload/
  if (typeof url === 'string' && url.includes('/res.cloudinary.com/')) {
    const transforms = [] as string[];
    if (w) transforms.push(`w_${w}`);
    if (h) transforms.push(`h_${h}`);
    if (crop) transforms.push(`c_${crop}`);
    if (q) transforms.push(`q_${q}`);
    transforms.push('f_auto');
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/${transforms.join(',')}/${parts[1]}`;
    }
  }

  // Fallback: return the original url or string
  return typeof url === 'string' ? url : '';
}
