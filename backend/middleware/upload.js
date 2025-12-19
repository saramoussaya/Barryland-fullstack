const multer = require('multer');
const path = require('path');

// Use memory storage to avoid accidental disk writes (we push to Cloudinary)
const storage = multer.memoryStorage();

// Filtrage des fichiers (par exemple, accepter uniquement les images)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers image sont autorisés !'), false);
  }
};

// Initialisation de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // Limite de taille : 5 Mo
  }
});

module.exports = upload;
