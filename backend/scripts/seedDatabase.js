const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Property = require('../models/Property');
const { SystemSettings } = require('../models/Admin');

// Connexion à la base de données
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barryland');
    console.log('✅ Connexion à MongoDB réussie');
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
};

// Données de test pour les utilisateurs
const seedUsers = async () => {
  try {
    // Supprimer les utilisateurs existants (sauf admin)
    await User.deleteMany({ role: { $ne: 'admin' } });

    const users = [
      {
        firstName: 'kadiatou',
        lastName: 'diallo',
        email: 'kadiatou@gmail.com',
        phone: '+22412345678',
        password: 'password123',
        role: 'particular',
        isVerified: true,
        address: {
          street: 'Rue KA-001',
          city: 'Conakry',
          region: 'Conakry',
          country: 'Guinée'
        }
      },
      {
        firstName: 'mamadou',
        lastName: 'barry',
        email: 'mamadou@gmail.com',
        phone: '+22498765432',
        password: 'password123',
        role: 'particular',
        isVerified: true,
        address: {
          city: 'Kankan',
          region: 'Haute-Guinée',
          country: 'Guinée'
        }
      },
      {
        firstName: 'ibrahim',
        lastName: 'toure',
        email: 'ibrahim@gmail.com',
        phone: '+22455566677',
        password: 'password123',
        role: 'particular',
        isVerified: true,
        address: { city: 'Conakry' }
      },
      {
        firstName: 'mariama',
        lastName: 'camara',
        email: 'mariama@gmail.com',
        phone: '+22411122233',
        password: 'password123',
        role: 'particular',
        isVerified: true,
        address: { city: 'Ratoma' }
      },
      {
        firstName: 'alpha',
        lastName: 'conde',
        email: 'alpha@gmail.com',
        phone: '+22444455566',
        password: 'password123',
        role: 'particular',
        isVerified: true,
        address: { city: 'Almamya' }
      }
    ];

    // Hash passwords because insertMany does not trigger pre('save') hooks
    for (const u of users) {
      const salt = await bcrypt.genSalt(12);
      u.password = await bcrypt.hash(u.password, salt);
    }
    const createdUsers = await User.insertMany(users);
    console.log(`✅ ${createdUsers.length} utilisateurs créés`);
    return createdUsers;

  } catch (error) {
    console.error('❌ Erreur lors de la création des utilisateurs:', error);
  }
};

// Données de test pour les propriétés
const seedProperties = async (users) => {
  try {
    // Supprimer les propriétés existantes
    await Property.deleteMany({});

    const properties = [
      {
        title: 'Villa moderne 4 chambres avec piscine',
        description: 'Magnifique villa moderne située dans un quartier résidentiel calme de Conakry. Cette propriété dispose de 4 chambres spacieuses, 3 salles de bain, une cuisine équipée, un salon/salle à manger, une piscine et un jardin paysager. Idéale pour une famille nombreuse recherchant le confort et la tranquillité.',
        transactionType: 'vente',
        propertyType: 'villa',
        publisherType: 'particulier',
        price: 75000000,
        location: {
          address: 'Quartier Kipé, Rue KA-025',
          city: 'Conakry',
          region: 'Conakry',
          coordinates: {
            latitude: 9.5092,
            longitude: -13.7122
          }
        },
        area: 250,
        bedrooms: 4,
        bathrooms: 3,
        images: [
          {
            url: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
            isPrimary: true
          },
          {
            url: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
          },
          {
            url: 'https://images.pexels.com/photos/2121121/pexels-photo-2121121.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
          }
        ],
        features: ['Piscine', 'Jardin', 'Garage double', 'Climatisation', 'Sécurité 24h/24', 'Cuisine équipée'],
        owner: users[0]._id,
        contact: {
          phone: '+22412345678',
          email: 'amadou.barry@example.com'
        },
        status: 'active',
        priority: 'featured',
        views: 245
      },
      {
        title: 'Appartement 3 pièces centre-ville',
        description: 'Bel appartement de 3 pièces situé en plein centre-ville de Conakry. Idéal pour un couple ou une petite famille. Proche de tous les commerces et transports. L\'appartement comprend 2 chambres, 1 salon, 1 cuisine et 1 salle de bain. Balcon avec vue sur la ville.',
        transactionType: 'location',
        propertyType: 'appartement',
        publisherType: 'particulier',
        price: 1500000,
        location: {
          address: 'Avenue de la République, Immeuble Kaloum',
          city: 'Conakry',
          region: 'Conakry',
          coordinates: {
            latitude: 9.5370,
            longitude: -13.6785
          }
        },
        area: 85,
        bedrooms: 2,
        bathrooms: 1,
        images: [
          {
            url: 'https://images.pexels.com/photos/2029667/pexels-photo-2029667.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
            isPrimary: true
          },
          {
            url: 'https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
          }
        ],
        features: ['Balcon', 'Ascenseur', 'Parking', 'Proche commerces', 'Transport public'],
        owner: users[0]._id,
        contact: {
          phone: '+22412345678',
          email: 'amadou.barry@example.com'
        },
        status: 'active',
        views: 156
      },
      {
        title: 'Terrain constructible 500m² Matoto',
        description: 'Terrain de 500m² situé dans une zone en développement de Matoto. Idéal pour construction résidentielle. Accès facile aux routes principales. Terrain plat, prêt à construire. Tous les documents en règle. Possibilité de financement.',
        transactionType: 'vente',
        propertyType: 'terrain',
        publisherType: 'particulier',
        price: 25000000,
        location: {
          address: 'Quartier Hamdallaye, Secteur 3',
          city: 'Conakry',
          region: 'Conakry',
          coordinates: {
            latitude: 9.5500,
            longitude: -13.6500
          }
        },
        area: 500,
        bedrooms: 0,
        bathrooms: 0,
        images: [
          {
            url: 'https://images.pexels.com/photos/1115804/pexels-photo-1115804.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
            isPrimary: true
          }
        ],
        features: ['Accès route', 'Eau disponible', 'Électricité proche', 'Zone résidentielle', 'Documents en règle'],
        owner: users[2]._id,
        contact: {
          phone: '+22455566677',
          email: 'ibrahim.toure@example.com'
        },
        status: 'active',
        views: 89
      },
      {
        title: 'Maison familiale 6 chambres Ratoma',
        description: 'Grande maison familiale avec 6 chambres, parfaite pour une famille nombreuse. Située dans un quartier résidentiel calme avec jardin et espace de jeux pour enfants. La maison dispose également d\'un garage, d\'une terrasse et d\'une cave de stockage.',
        transactionType: 'vente',
        propertyType: 'maison',
        publisherType: 'particulier',
        price: 45000000,
        location: {
          address: 'Quartier Koloma, Rue KO-012',
          city: 'Conakry',
          region: 'Conakry',
          coordinates: {
            latitude: 9.5800,
            longitude: -13.6200
          }
        },
        area: 180,
        bedrooms: 6,
        bathrooms: 4,
        images: [
          {
            url: 'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
            isPrimary: true
          },
          {
            url: 'https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
          }
        ],
        features: ['Jardin', 'Garage double', 'Terrasse', 'Cave', 'Quartier calme', 'Proche écoles'],
        owner: users[3]._id,
        contact: {
          phone: '+22411122233',
          email: 'mariama.camara@example.com'
        },
        status: 'pending',
        views: 67
      },
      {
        title: 'Bureau moderne 120m² Almamya',
        description: 'Espace de bureau moderne et lumineux de 120m² situé dans le quartier d\'affaires d\'Almamya. Parfait pour une entreprise en croissance. L\'espace comprend plusieurs bureaux individuels, une salle de réunion, un espace d\'accueil et des sanitaires.',
        transactionType: 'location',
        propertyType: 'bureau',
        publisherType: 'particulier',
        price: 2500000,
        location: {
          address: 'Boulevard du Commerce, Immeuble Almamya Plaza',
          city: 'Conakry',
          region: 'Conakry',
          coordinates: {
            latitude: 9.5150,
            longitude: -13.7000
          }
        },
        area: 120,
        bedrooms: 0,
        bathrooms: 2,
        images: [
          {
            url: 'https://images.pexels.com/photos/380768/pexels-photo-380768.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
            isPrimary: true
          }
        ],
        features: ['Climatisation', 'Internet haut débit', 'Réceptionniste', 'Parking', 'Sécurité', 'Ascenseur'],
        owner: users[4]._id,
        contact: {
          phone: '+22444455566',
          email: 'alpha.conde@example.com'
        },
        status: 'active',
        views: 134
      },
      {
        title: 'Villa de luxe vue mer - Îles de Los',
        description: 'Exceptionnelle villa de luxe avec vue imprenable sur l\'océan Atlantique. Finitions haut de gamme, piscine à débordement et accès privé à la plage. Cette propriété unique offre 5 chambres avec suites, un spa privé, un système domotique complet et même un hélipad.',
        transactionType: 'vente',
        propertyType: 'villa',
        publisherType: 'particulier',
        price: 150000000,
        location: {
          address: 'Île de Roume, Résidence Océan',
          city: 'Conakry',
          region: 'Conakry',
          coordinates: {
            latitude: 9.5000,
            longitude: -13.8000
          }
        },
        area: 400,
        bedrooms: 5,
        bathrooms: 6,
        images: [
          {
            url: 'https://images.pexels.com/photos/1428348/pexels-photo-1428348.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1',
            isPrimary: true
          },
          {
            url: 'https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
          },
          {
            url: 'https://images.pexels.com/photos/2635038/pexels-photo-2635038.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&dpr=1'
          }
        ],
        features: ['Vue mer', 'Piscine à débordement', 'Accès plage privé', 'Spa', 'Système domotique', 'Hélipad', 'Service de conciergerie'],
        owner: users[4]._id,
        contact: {
          phone: '+22444455566',
          email: 'alpha.conde@example.com'
        },
        status: 'active',
        priority: 'premium',
        isPromoted: true,
        views: 567
      }
    ];

    const createdProperties = await Property.insertMany(properties);
    console.log(`✅ ${createdProperties.length} propriétés créées`);
    return createdProperties;

  } catch (error) {
    console.error('❌ Erreur lors de la création des propriétés:', error);
  }
};

// Données de test pour les conversations et messages
const seedConversationsAndMessages = async (users) => {
  try {
    const Conversation = require('../models/Conversation');
    const Message = require('../models/Message');

    // Supprimer les anciennes conversations/messages pour éviter les doublons
    await Message.deleteMany({});
    await Conversation.deleteMany({});

    // Créer quelques conversations entre utilisateurs de test
    const convos = [];

    if (users && users.length >= 2) {
      const c1 = await Conversation.create({ participants: [users[0]._id, users[1]._id], lastMessage: 'Bonjour, je suis intéressé par votre annonce' });
      const m1 = await Message.create({ conversation: c1._id, sender: users[0]._id, body: 'Bonjour, je suis intéressé par votre annonce. Peut-on visiter ?' });
      const m2 = await Message.create({ conversation: c1._id, sender: users[1]._id, body: 'Oui, je suis disponible samedi matin.' });

      const c2 = await Conversation.create({ participants: [users[0]._id, users[2]._id], lastMessage: 'Merci pour les infos' });
      const m3 = await Message.create({ conversation: c2._id, sender: users[2]._id, body: 'Pouvez-vous envoyer plus de photos ?' });

      convos.push(c1, c2);
    }

    console.log(`✅ ${convos.length} conversations et quelques messages de démonstration créés`);
    return convos;
  } catch (error) {
    console.error('❌ Erreur lors de la création des conversations/messages:', error);
  }
};

// Créer un utilisateur administrateur
const createAdminUser = async () => {
  try {
    // Vérifier si un admin existe déjà
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('✅ Utilisateur admin existe déjà');
      return existingAdmin;
    }

    const adminData = {
      firstName: 'Admin',
      lastName: 'BarryLand',
      email: process.env.ADMIN_EMAIL || 'admin@barryland.gn',
      phone: '+224000000000',
      password: process.env.ADMIN_PASSWORD || 'AdminBarryLand2025!',
      role: 'admin',
      isVerified: true,
      isActive: true
    };

    const admin = new User(adminData);
    await admin.save();

    console.log('✅ Utilisateur administrateur créé');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Mot de passe: ${adminData.password}`);
    
    return admin;

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error);
  }
};

// Créer les paramètres système par défaut
const createSystemSettings = async () => {
  try {
    const defaultSettings = [
      {
        key: 'site_name',
        value: 'BarryLand',
        description: 'Nom du site',
        category: 'general',
        isPublic: true
      },
      {
        key: 'site_description',
        value: 'La première plateforme immobilière moderne de Guinée',
        description: 'Description du site',
        category: 'general',
        isPublic: true
      },
      {
        key: 'contact_email',
        value: 'contact@barryland.gn',
        description: 'Email de contact principal',
        category: 'general',
        isPublic: true
      },
      {
        key: 'contact_phone',
        value: '+224 XX XX XX XX',
        description: 'Téléphone de contact',
        category: 'general',
        isPublic: true
      },
      {
        key: 'max_images_per_property',
        value: 10,
        description: 'Nombre maximum d\'images par propriété',
        category: 'features'
      },
      {
        key: 'property_expiry_days',
        value: 90,
        description: 'Durée de validité des annonces en jours',
        category: 'features'
      },
      {
        key: 'auto_approve_properties',
        value: false,
        description: 'Approbation automatique des propriétés',
        category: 'moderation'
      },
      {
        key: 'require_email_verification',
        value: true,
        description: 'Vérification email obligatoire',
        category: 'security'
      },
      {
        key: 'max_login_attempts',
        value: 5,
        description: 'Nombre maximum de tentatives de connexion',
        category: 'security'
      },
      {
        key: 'enable_notifications',
        value: true,
        description: 'Activer les notifications email',
        category: 'email'
      }
    ];

    for (const setting of defaultSettings) {
      await SystemSettings.findOneAndUpdate(
        { key: setting.key },
        setting,
        { upsert: true, new: true }
      );
    }

    console.log(`✅ ${defaultSettings.length} paramètres système créés/mis à jour`);

  } catch (error) {
    console.error('❌ Erreur lors de la création des paramètres système:', error);
  }
};

// Fonction principale de seeding
const seedDatabase = async () => {
  try {
    console.log('🌱 Début du seeding de la base de données...\n');

    await connectDB();

    // Créer l'administrateur
    const admin = await createAdminUser();

    // Créer les utilisateurs de test
    const users = await seedUsers();

    // Créer les propriétés de test
    if (users && users.length > 0) {
      await seedProperties(users);
    }

    // Créer les paramètres système
    await createSystemSettings();

    console.log('\n🎉 Seeding terminé avec succès !');
    console.log('\n📋 Résumé:');
    console.log(`👤 Utilisateurs: ${users ? users.length : 0} + 1 admin`);
    console.log(`🏠 Propriétés: 6`);
    console.log(`⚙️  Paramètres système: 10`);
    
    console.log('\n🔐 Informations de connexion admin:');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Mot de passe: ${process.env.ADMIN_PASSWORD || 'AdminBarryLand2025!'}`);

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Connexion à la base de données fermée');
    process.exit(0);
  }
};

// Exécuter le seeding si le script est appelé directement
if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase,
  createAdminUser,
  seedUsers,
  seedProperties,
  createSystemSettings
};