import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';
import colors from 'colors';

// Charger les variables d'environnement
dotenv.config();

// Fonction pour connecter à la base de données
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barryland');
    console.log('✅ Connexion à MongoDB réussie');
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
};

// Fonction pour créer l'administrateur
const createAdmin = async () => {
  try {
    // Vérifier si un admin existe déjà
    const adminExists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });

    if (adminExists) {
      console.log(colors.yellow('Un administrateur existe déjà.'));
      return;
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);

    // Créer l'admin
    const admin = await Admin.create({
      firstName: 'Admin',
      lastName: 'BarryLand',
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      phone: '+224666666666', // Vous pouvez modifier ce numéro
      role: 'admin',
      isVerified: true
    });

    if (admin) {
      console.log(colors.green('Administrateur créé avec succès :'));
      console.log(colors.green(`Email: ${admin.email}`));
      console.log(colors.green(`Nom: ${admin.firstName} ${admin.lastName}`));
    }

  } catch (error) {
    console.error(colors.red(`Error: ${error.message}`));
  }
};

// Exécuter le script
const seedAdmin = async () => {
  try {
    await connectDB();
    await createAdmin();
    
    console.log(colors.cyan('Script terminé.'));
    process.exit();
  } catch (error) {
    console.error(colors.red(`Error: ${error.message}`));
    process.exit(1);
  }
};

seedAdmin();
