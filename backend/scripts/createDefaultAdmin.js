const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createDefaultAdmin = async () => {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (!existingAdmin) {
      // Créer l'admin par défaut
      const admin = new User({
        firstName: process.env.ADMIN_NAME.split(' ')[0] || 'Admin',
        lastName: process.env.ADMIN_NAME.split(' ')[1] || 'BarryLand',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        phone: '+224600000000', // Numéro par défaut pour l'admin
        role: 'admin',
        isVerified: true,
        isActive: true
      });

      await admin.save();
      console.log('✅ Administrateur par défaut créé avec succès');
    } else {
      console.log('ℹ️ L\'administrateur par défaut existe déjà');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'administrateur:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createDefaultAdmin();
