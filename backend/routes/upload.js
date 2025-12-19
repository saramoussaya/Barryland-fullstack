const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Check Cloudinary configuration and warn if missing (development helper)
const isLikelyPlaceholder = (v) => {
  if (!v || typeof v !== 'string') return true;
  const lowered = v.toLowerCase();
  return /your|votre|changeme|replace|api_key|api-secret|api-secret|example|xxxxx|12345/.test(lowered);
};

const isCloudinaryConfigured = (() => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  const ok = !!name && !!key && !!secret && !isLikelyPlaceholder(name) && !isLikelyPlaceholder(key) && !isLikelyPlaceholder(secret);
  if (!ok) {
    console.warn('⚠️ Cloudinary apparemment non configuré correctement. Vérifiez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET. Uploads Cloudinary seront désactivés.');
  }
  return ok;
})();

console.log('[upload] Cloudinary configured:', !!isCloudinaryConfigured);

// Configuration Multer pour le stockage temporaire
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Vérifier le type de fichier
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  }
});

// @route   POST /api/upload/property-images
// @desc    Upload property images
// @access  Private
router.post('/property-images', auth, upload.array('images', 10), async (req, res) => {
  try {
    if (!isCloudinaryConfigured) {
      console.error('[upload] Cloudinary not configured but /property-images called');
      return res.status(500).json({ success: false, message: 'Cloudinary non configuré. Merci de définir CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image fournie'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'barryland/properties',
            transformation: [
              { width: 1200, height: 800, crop: 'fill', quality: 'auto' },
              { format: 'webp' }
            ],
            resource_type: 'image'
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height
              });
            }
          }
        );

        uploadStream.end(file.buffer);
      });
    });
    let uploadedImages;
    try {
      uploadedImages = await Promise.all(uploadPromises);
    } catch (cloudErr) {
      console.error('Cloudinary upload failed:', cloudErr && cloudErr.message ? cloudErr.message : cloudErr);
      return res.status(500).json({ success: false, message: 'Erreur lors de l\'upload vers Cloudinary', error: cloudErr && cloudErr.message ? cloudErr.message : String(cloudErr) });
    }

    // Debug: log uploaded publicIds for tracing
    try {
      console.log('[upload] uploadedImages publicIds:', uploadedImages.map(i => i.publicId));
    } catch (logErr) {
      // ignore logging errors
    }

    res.json({
      success: true,
      message: 'Images uploadées avec succès',
      data: {
        images: uploadedImages
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'upload des images:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload des images',
      error: error && error.message ? error.message : String(error)
    });
  }
});

// @route   POST /api/upload/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!isCloudinaryConfigured) {
      console.error('[upload/avatar] Cloudinary not configured');
      return res.status(500).json({ success: false, message: 'Cloudinary non configuré.' });
    }

    if (!req.file) return res.status(400).json({ success: false, message: 'Aucune image fournie' });

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'barryland/avatars',
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto' },
            { format: 'webp' }
          ],
          resource_type: 'image'
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(req.file.buffer);
    });

    res.json({ success: true, message: 'Avatar uploadé avec succès', data: { avatar: { url: result.secure_url, publicId: result.public_id } } });

  } catch (error) {
    console.error('Erreur lors de l\'upload de l\'avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload de l\'avatar',
      error: error && error.message ? error.message : String(error)
    });
  }
});

// @route   DELETE /api/upload/image/:publicId
// @desc    Delete image from Cloudinary
// @access  Private
router.delete('/image/:publicId', auth, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // Décoder le publicId (il peut être encodé dans l'URL)
    const decodedPublicId = decodeURIComponent(publicId);

    if (!isCloudinaryConfigured && decodedPublicId.startsWith('local/')) {
      const fs = require('fs');
      const path = require('path');
      const filename = decodedPublicId.replace('local/', '');
      const filepath = path.join(__dirname, '..', 'uploads', 'properties', filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return res.json({ success: true, message: 'Image locale supprimée avec succès' });
      }
      return res.status(404).json({ success: false, message: 'Image locale non trouvée' });
    }

    const result = await cloudinary.uploader.destroy(decodedPublicId);

    if (result.result === 'ok') {
      res.json({
        success: true,
        message: 'Image supprimée avec succès'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    }

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'image'
    });
  }
});

// @route   POST /api/upload/multiple
// @desc    Upload multiple images with different transformations
// @access  Private
router.post('/multiple', auth, upload.array('images', 20), async (req, res) => {
  try {
    if (!isCloudinaryConfigured) {
      console.error('[upload/multiple] Cloudinary not configured');
      return res.status(500).json({ success: false, message: 'Cloudinary non configuré. Vérifiez les variables d\'environnement.' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image fournie'
      });
    }

    const { folder = 'barryland/general', transformations } = req.body;

    // Transformations par défaut
    const defaultTransformations = [
      { width: 1200, height: 800, crop: 'fill', quality: 'auto' },
      { format: 'webp' }
    ];

    const uploadPromises = req.files.map(async (file, index) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            transformation: transformations ? JSON.parse(transformations) : defaultTransformations,
            resource_type: 'image',
            public_id: `${Date.now()}_${index}`
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes
              });
            }
          }
        );

        uploadStream.end(file.buffer);
      });
    });

    const uploadedImages = await Promise.all(uploadPromises);

    res.json({
      success: true,
      message: `${uploadedImages.length} image(s) uploadée(s) avec succès`,
      data: {
        images: uploadedImages,
        totalSize: uploadedImages.reduce((sum, img) => sum + img.bytes, 0)
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'upload multiple:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload des images',
      error: error && error.message ? error.message : String(error)
    });
  }
});

module.exports = router;