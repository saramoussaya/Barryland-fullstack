# BarryLand - Application Web Immobilière pour la Guinée

## 🏠 À propos du projet

BarryLand est une application web moderne conçue pour moderniser le marché immobilier en Guinée. Elle permet aux utilisateurs de rechercher, publier et gérer des biens immobiliers (vente, location, terrains) dans un environnement numérique sécurisé et intuitif.

### 🎯 Objectifs
- Moderniser le marché immobilier guinéen avec une plateforme numérique
- Centraliser les annonces immobilières
- Faciliter les transactions entre acheteurs, vendeurs, locataires et propriétaires
- Offrir une expérience utilisateur moderne et accessible

### 👥 Public cible
- **Acheteurs et Locataires** : Recherche de biens immobiliers
- **Propriétaires et Vendeurs** : Publication et gestion d'annonces
- **Agents immobiliers** : Gestion professionnelle de portefeuilles
- **Administrateurs** : Modération et gestion de la plateforme

## ✨ Fonctionnalités principales

### 🏡 Pour les utilisateurs
- **Page d'accueil** avec présentation des catégories (vente, location, terrains)
- **Recherche avancée** avec filtres (prix, localisation, type, caractéristiques)
- **Pages détaillées** des biens avec galeries photos et informations complètes
- **Système de favoris** pour sauvegarder les biens intéressants
- **Authentification sécurisée** (inscription/connexion)
- **Interface responsive** optimisée mobile et desktop

### 👤 Pour les propriétaires
- **Tableau de bord personnel** pour gérer ses annonces
- **Publication facile** d'annonces avec formulaire guidé
- **Upload d'images** multiples pour chaque bien
- **Statistiques** des vues et interactions
- **Gestion des contacts** et messages

### 🎨 Design et expérience utilisateur
- **Design moderne** inspiré des meilleures pratiques internationales
- **Couleurs** : Vert émeraude (#10B981) évoquant la Guinée
- **Navigation intuitive** avec menu responsive
- **Animations subtiles** et micro-interactions
- **Interface multilingue** (français prioritaire)

## 🛠️ Technologies utilisées

### Frontend
- **React.js 18** - Framework JavaScript moderne
- **TypeScript** - Typage statique pour plus de robustesse
- **Tailwind CSS** - Framework CSS utilitaire pour design responsive
- **React Router** - Navigation côté client
- **Lucide React** - Icônes modernes et cohérentes
- **Context API** - Gestion d'état globale

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MongoDB** - Base de données NoSQL
- **Mongoose** - ODM pour MongoDB
- **JWT** - Authentification par tokens
- **Bcrypt** - Hachage des mots de passe
- **Cloudinary** - Stockage et gestion des images
- **Nodemailer** - Envoi d'emails
- **Multer** - Upload de fichiers

### Outils de développement
- **Vite** - Build tool rapide et moderne
- **ESLint** - Linting du code
- **PostCSS** - Traitement CSS avancé

## 🚀 Installation et démarrage

### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou yarn
- MongoDB (local ou cloud)
- Git

### Installation

1. **Cloner le repository**
```bash
git clone [URL_DU_REPOSITORY]
cd Barryland
```

2. **Installation du Frontend**
```bash
cd frontend
npm install
```

3. **Installation du Backend**
```bash
cd ../backend
npm install
```

4. **Configuration du Backend**
```bash
# Copier le fichier d'exemple des variables d'environnement
cp .env.example .env

# Éditer le fichier .env avec vos configurations
nano .env
```

5. **Variables d'environnement requises (.env)**
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

6. **Démarrer MongoDB**
```bash
# Si MongoDB est installé localement
mongod

# Ou utiliser MongoDB Atlas (cloud)
```

7. **Peupler la base de données avec des données de test**
```bash
cd backend
npm run seed
```

8. **Démarrer le serveur backend**
```bash
cd backend
npm run dev
```

9. **Démarrer le frontend (dans un nouveau terminal)**
```bash
cd frontend
npm run dev
```

L'application sera accessible à :
- **Frontend** : `http://localhost:5173`
- **Backend API** : `http://localhost:5000`

### Scripts disponibles

#### Frontend
- `npm run dev` - Démarre le serveur de développement
- `npm run build` - Compile l'application pour la production
- `npm run preview` - Prévisualise la version de production
- `npm run lint` - Vérifie la qualité du code

#### Backend
- `npm run dev` - Démarre le serveur de développement avec nodemon
- `npm start` - Démarre le serveur de production
- `npm run seed` - Peuple la base de données avec des données de test
- `npm test` - Lance les tests (à implémenter)

## 📱 Utilisation de l'application

### Pour les visiteurs
1. **Parcourir les biens** depuis la page d'accueil
2. **Rechercher** avec des filtres spécifiques
3. **Consulter les détails** des biens qui vous intéressent
4. **Créer un compte** pour accéder aux fonctionnalités avancées

### Pour les utilisateurs connectés
1. **Se connecter** avec email et mot de passe
2. **Accéder au tableau de bord** personnel
3. **Publier des annonces** avec photos et descriptions
4. **Gérer ses biens** (modification, suppression)
5. **Suivre les statistiques** de vues et interactions

### Fonctionnalités de recherche
- **Filtres par type** : Vente ou location
- **Filtres par catégorie** : Maison, appartement, villa, terrain, bureau, commerce
- **Filtres par localisation** : Toutes les principales villes de Guinée
- **Filtres par prix** : Fourchette min/max
- **Filtres par caractéristiques** : Nombre de chambres, salles de bain, surface

## 🏗️ Architecture du projet

```
Barryland/
├── frontend/                # Application React.js
│   ├── src/
│   │   ├── components/      # Composants réutilisables
│   │   ├── pages/          # Pages principales
│   │   ├── contexts/       # Gestion d'état globale
│   │   ├── types/          # Types TypeScript
│   │   └── App.tsx         # Composant racine
│   ├── public/             # Fichiers statiques
│   └── package.json        # Dépendances frontend
├── backend/                # API Node.js/Express
│   ├── models/             # Modèles de données MongoDB
│   ├── routes/             # Routes API
│   ├── middleware/         # Middlewares
│   ├── utils/              # Utilitaires
│   ├── scripts/            # Scripts utilitaires
│   └── server.js           # Point d'entrée du serveur
└── README.md              # Documentation principale
```

## 🌍 Spécificités pour la Guinée

### Localisation
- **Villes principales** : Conakry, Kankan, Labé, Nzérékoré, Kindia, Mamou, Boké, etc.
- **Devise** : Franc guinéen (GNF)
- **Langue** : Interface en français

### Types de biens adaptés
- **Maisons traditionnelles** et modernes
- **Villas** avec cours et jardins
- **Appartements** en centre-ville
- **Terrains** constructibles et agricoles
- **Bureaux et commerces** pour les professionnels

### Considérations culturelles
- **Photos respectueuses** et représentatives
- **Descriptions détaillées** en français
- **Prix transparents** en devise locale
- **Contact direct** avec les propriétaires


### Étapes de déploiement

#### Frontend
```bash
cd frontend
npm run build
# Déployer le dossier dist/ sur votre plateforme
```

#### Backend
```bash
cd backend
# Configurer les variables d'environnement de production
# Déployer sur votre plateforme serveur
```

## 🔮 Évolutions futures

### Phase 2 - Fonctionnalités avancées
- **Système de messagerie** intégré
- **Géolocalisation** et cartes interactives
- **Notifications push** pour nouvelles annonces
- **Système de notation** des propriétaires/acheteurs
- **Paiements en ligne** sécurisés

### Phase 3 - Mobile et API
- **Application mobile** React Native
- **API REST** complète
- **Base de données** avec PostgreSQL/MongoDB
- **Système de backup** et récupération

### Phase 4 - Intelligence artificielle
- **Recommandations** personnalisées
- **Estimation automatique** des prix
- **Reconnaissance d'images** pour catégorisation
- **Chatbot** d'assistance

## 🧪 Tests et développement

### Tests recommandés
- **Tests unitaires** pour les composants React
- **Tests d'intégration** pour l'API
- **Tests de performance** pour la charge
- **Tests de sécurité** pour les vulnérabilités

### Monitoring recommandé
- **Surveillance de la base de données** MongoDB
- **Monitoring des performances** API
- **Alertes sur les erreurs** critiques
- **Surveillance de l'espace disque** Cloudinary

## 👥 Contribution

Nous accueillons les contributions ! Pour contribuer :

1. **Forker** le projet
2. **Créer une branche** feature (`git checkout -b feature/AmazingFeature`)
3. **Commiter** vos changements (`git commit -m 'Add AmazingFeature'`)
4. **Pousser** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir une Pull Request**

## 📞 Support et contact

Pour toute question ou support :
- **Email** : contact@barryland.gn
- **Documentation** : Consultez ce README
- **Issues** : Utilisez le système d'issues GitHub

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

**BarryLand** - Modernisons ensemble l'immobilier en Guinée ! 🇬🇳🏠