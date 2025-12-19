# BarryLand Backend - API REST

Backend de l'application web immobilière BarryLand pour la Guinée. Cette API REST fournit tous les services nécessaires pour gérer les utilisateurs, les propriétés immobilières et l'administration de la plateforme.

## 🏗️ Architecture

### Technologies utilisées
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MongoDB** - Base de données NoSQL
- **Mongoose** - ODM pour MongoDB
- **JWT** - Authentification par tokens
- **Bcrypt** - Hachage des mots de passe
- **Cloudinary** - Stockage et gestion des images
- **Nodemailer** - Envoi d'emails
- **Multer** - Upload de fichiers

### Structure du projet
```
backend/
├── models/           # Modèles de données MongoDB
│   ├── User.js      # Modèle utilisateur
│   ├── Property.js  # Modèle propriété immobilière
│   └── Admin.js     # Modèles administration
├── routes/          # Routes API
│   ├── auth.js      # Authentification
│   ├── properties.js # Gestion des propriétés
│   ├── users.js     # Gestion des utilisateurs
│   ├── admin.js     # Administration
│   ├── upload.js    # Upload d'images
│   └── notifications.js # Notifications
├── middleware/      # Middlewares
│   └── auth.js      # Authentification et autorisation
├── utils/           # Utilitaires
│   └── email.js     # Gestion des emails
├── scripts/         # Scripts utilitaires
│   └── seedDatabase.js # Peuplement de la base de données
└── server.js        # Point d'entrée de l'application
```

## 🚀 Installation et Configuration

### Prérequis
- Node.js (version 16 ou supérieure)
- MongoDB (local ou cloud)
- Compte Cloudinary (pour les images)
- Compte email SMTP (Gmail recommandé)

### Installation

1. **Cloner le repository et naviguer vers le dossier backend**
```bash
cd backend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration des variables d'environnement**
```bash
cp .env.example .env
```

Éditer le fichier `.env` avec vos configurations :

```env
# Base de données
MONGODB_URI=mongodb://localhost:27017/barryland

# JWT
JWT_SECRET=votre_jwt_secret_tres_securise_ici
JWT_EXPIRE=7d

# Serveur
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Cloudinary (pour les images)
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre_email@gmail.com
EMAIL_PASS=votre_mot_de_passe_app

# Admin par défaut
ADMIN_EMAIL=admin@barryland.gn
ADMIN_PASSWORD=AdminBarryLand2025!
ADMIN_NAME=Administrateur BarryLand
```

4. **Démarrer MongoDB**
```bash
# Si MongoDB est installé localement
mongod

# Ou utiliser MongoDB Atlas (cloud)
```

5. **Peupler la base de données avec des données de test**
```bash
npm run seed
```

6. **Démarrer le serveur**
```bash
# Mode développement (avec nodemon)
npm run dev

# Mode production
npm start
```

Le serveur sera accessible sur `http://localhost:5000`

## 📡 API Endpoints

### Authentification (`/api/auth`)
- `POST /register` - Inscription d'un nouvel utilisateur
- `POST /login` - Connexion utilisateur
- `GET /me` - Profil utilisateur actuel
- `PUT /profile` - Mise à jour du profil
- `PUT /change-password` - Changement de mot de passe
- `POST /logout` - Déconnexion

### Propriétés (`/api/properties`)
- `GET /` - Liste des propriétés avec filtres
- `GET /featured` - Propriétés en vedette
- `GET /:id` - Détails d'une propriété
- `POST /` - Créer une propriété (vendeurs/agents)
- `PUT /:id` - Modifier une propriété
- `DELETE /:id` - Supprimer une propriété
- `POST /:id/favorite` - Ajouter/retirer des favoris
- `GET /user/my-properties` - Propriétés de l'utilisateur

### Utilisateurs (`/api/users`)
- `GET /favorites` - Favoris de l'utilisateur
- `POST /search-alert` - Créer une alerte de recherche
- `GET /search-alerts` - Alertes de recherche
- `PUT /search-alert/:id` - Modifier une alerte
- `DELETE /search-alert/:id` - Supprimer une alerte
- `PUT /preferences` - Préférences utilisateur
- `GET /stats` - Statistiques utilisateur

### Administration (`/api/admin`)
- `GET /dashboard` - Tableau de bord admin
- `GET /users` - Gestion des utilisateurs
- `PUT /users/:id/status` - Activer/désactiver un utilisateur
- `GET /properties` - Gestion des propriétés
- `PUT /properties/:id/status` - Approuver/rejeter une propriété
- `DELETE /properties/:id` - Supprimer une propriété
- `GET /logs` - Logs d'activité admin
- `GET /settings` - Paramètres système
- `PUT /settings` - Modifier les paramètres

### Upload (`/api/upload`)
- `POST /property-images` - Upload d'images de propriétés
- `POST /avatar` - Upload d'avatar utilisateur
- `DELETE /image/:publicId` - Supprimer une image
- `POST /multiple` - Upload multiple d'images

### Notifications (`/api/notifications`)
- `POST /contact-owner` - Contacter un propriétaire
- `POST /property-alert` - Alertes de nouvelles propriétés
- `POST /newsletter` - Newsletter (admin)
- `POST /welcome` - Email de bienvenue

## 🔐 Authentification et Sécurité

### JWT (JSON Web Tokens)
- Tokens sécurisés pour l'authentification
- Expiration configurable (7 jours par défaut)
- Middleware de vérification sur les routes protégées

### Sécurité des mots de passe
- Hachage avec bcrypt (12 rounds)
- Politique de mots de passe (minimum 6 caractères)
- Protection contre les attaques par force brute

### Autorisation par rôles
- **buyer** : Acheteur/locataire
- **seller** : Propriétaire/vendeur
- **agent** : Agent immobilier
- **admin** : Administrateur

### Sécurité générale
- Helmet.js pour les en-têtes de sécurité
- Rate limiting (100 requêtes/15min par IP)
- Validation des données avec express-validator
- CORS configuré pour le frontend

## 📊 Base de Données
## ☁️ Migration des images vers Cloudinary

Si vous aviez des images stockées localement dans `backend/uploads/properties`, un script de migration est fourni pour uploader ces images vers Cloudinary et mettre à jour les documents `Property` en base.

1. Configurez vos variables d'environnement dans `backend/.env` :
```
# Cloudinary
CLOUDINARY_CLOUD_NAME=... 
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# MongoDB
MONGODB_URI=...
```

2. Installez les dépendances si nécessaire et lancez le script depuis le dossier `backend` :
```powershell
npm install
node scripts/migrate-images-to-cloudinary.js
```

3. Vérifiez la console et la table de résultat imprimée. Effectuez des vérifications manuelles avant de supprimer les fichiers locaux.

4. Après vérification, vous pouvez supprimer/archiver `backend/uploads/properties` pour libérer de l'espace.

Note: le script tente de détecter les références locales (URL `/uploads/properties/filename` ou `images.publicId` marqués `local/filename`). Adaptez le script si votre schéma d'images diffère.


### Modèles principaux

#### User (Utilisateur)
```javascript
{
  name: String,
  email: String (unique),
  phone: String (format guinéen),
  password: String (haché),
  role: ['buyer', 'seller', 'agent', 'admin'],
  userType: ['buyer', 'seller', 'agent'],
  avatar: String,
  isVerified: Boolean,
  isActive: Boolean,
  address: Object,
  preferences: Object,
  favorites: [ObjectId],
  lastLogin: Date,
  loginAttempts: Number,
  lockUntil: Date
}
```

#### Property (Propriété)
```javascript
{
  title: String,
  description: String,
  type: ['vente', 'location'],
  category: ['maison', 'appartement', 'villa', 'terrain', 'bureau', 'commerce'],
  price: Number,
  location: {
    address: String,
    city: String,
    region: String,
    coordinates: { latitude: Number, longitude: Number }
  },
  area: Number,
  bedrooms: Number,
  bathrooms: Number,
  images: [{ url: String, publicId: String, isPrimary: Boolean }],
  features: [String],
  owner: ObjectId,
  contact: Object,
  status: ['pending', 'active', 'inactive', 'sold', 'rented', 'rejected'],
  priority: ['normal', 'featured', 'premium'],
  views: Number,
  favorites: Number,
  isPromoted: Boolean,
  expiresAt: Date
}
```

### Index de performance
- Index sur les champs de recherche fréquents
- Index géospatial pour les coordonnées
- Index de texte pour la recherche textuelle
- Index composites pour les requêtes complexes

## 📧 Système d'Email

### Templates disponibles
- **welcome** : Email de bienvenue
- **contact-owner** : Contact propriétaire
- **contact-copy** : Copie du message
- **property-alert** : Alerte nouvelle propriété
- **newsletter** : Newsletter

### Configuration SMTP
- Support Gmail, Outlook, et autres fournisseurs SMTP
- Templates HTML responsives
- Envoi en lot pour les newsletters
- Gestion des erreurs et retry automatique

## 🖼️ Gestion des Images

### Cloudinary Integration
- Upload automatique vers Cloudinary
- Transformations d'images (redimensionnement, compression)
- Format WebP pour l'optimisation
- Suppression automatique des images inutilisées

### Limites et validation
- Maximum 10 images par propriété
- Taille maximum : 10MB par image
- Formats acceptés : JPG, PNG, WebP
- Validation du type MIME

## 👨‍💼 Administration

### Tableau de bord admin
- Statistiques en temps réel
- Graphiques et métriques
- Activité récente
- Logs d'actions

### Gestion des utilisateurs
- Liste avec filtres et recherche
- Activation/désactivation de comptes
- Vérification des utilisateurs
- Historique des actions

### Modération des propriétés
- File d'attente des propriétés en attente
- Approbation/rejet avec raisons
- Gestion des propriétés signalées
- Statistiques de modération

### Logs d'activité
- Traçabilité complète des actions admin
- Filtrage par type d'action et date
- Détails des modifications
- Export des logs

## 🧪 Tests et Développement

### Scripts disponibles
```bash
npm run dev          # Serveur de développement avec nodemon
npm start           # Serveur de production
npm run seed        # Peupler la base de données
npm test           # Lancer les tests (à implémenter)
```

### Données de test
Le script `npm run seed` crée :
- 1 administrateur
- 5 utilisateurs de test
- 6 propriétés d'exemple
- Paramètres système par défaut

### Comptes de test créés
```
Admin:
- Email: admin@barryland.gn
- Mot de passe: AdminBarryLand2025!

Utilisateurs:
- amadou.barry@example.com (vendeur)
- fatoumata.diallo@example.com (acheteur)
- ibrahim.toure@example.com (agent)
- mariama.camara@example.com (vendeur)
- alpha.conde@example.com (agent)
- Mot de passe pour tous: password123
```

## 🚀 Déploiement

### Variables d'environnement de production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=secret_tres_securise_production
FRONTEND_URL=https://votre-domaine.com
```

### Recommandations de déploiement
- **Heroku** : Facile avec le Procfile inclus
- **DigitalOcean** : App Platform ou Droplet
- **AWS** : EC2 ou Elastic Beanstalk
- **Railway** : Déploiement simple avec Git

### Optimisations de production
- Compression gzip activée
- Logs structurés avec Morgan
- Rate limiting configuré
- Monitoring des erreurs recommandé

## 🔧 Maintenance

### Monitoring recommandé
- Surveillance de la base de données MongoDB
- Monitoring des performances API
- Alertes sur les erreurs critiques
- Surveillance de l'espace disque Cloudinary

### Sauvegardes
- Sauvegarde automatique MongoDB
- Export régulier des données critiques
- Sauvegarde des images Cloudinary
- Documentation des procédures de restauration

### Mises à jour
- Mise à jour régulière des dépendances
- Tests de sécurité périodiques
- Monitoring des vulnérabilités
- Changelog des modifications

## 📞 Support

Pour toute question ou problème :
- **Documentation** : Consultez ce README
- **Issues** : Utilisez le système d'issues du repository
- **Email** : contact@barryland.gn

---

**BarryLand Backend** - API moderne et sécurisée pour l'immobilier en Guinée 🇬🇳🏠