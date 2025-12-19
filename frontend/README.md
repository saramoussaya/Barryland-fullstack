# BarryLand Frontend - Interface Utilisateur

Interface utilisateur moderne et responsive pour la plateforme immobilière BarryLand en Guinée.

## 🛠️ Technologies utilisées

- **React.js 18** - Framework JavaScript moderne
- **TypeScript** - Typage statique pour plus de robustesse
- **Tailwind CSS** - Framework CSS utilitaire pour design responsive
- **React Router** - Navigation côté client
- **Lucide React** - Icônes modernes et cohérentes
- **Context API** - Gestion d'état globale
- **Vite** - Build tool rapide et moderne

## 🚀 Installation et démarrage

### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou yarn

### Installation
```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Scripts disponibles
- `npm run dev` - Démarre le serveur de développement
- `npm run build` - Compile l'application pour la production
- `npm run preview` - Prévisualise la version de production
- `npm run lint` - Vérifie la qualité du code

## 📁 Structure du projet

```
src/
├── components/          # Composants réutilisables
│   ├── Header.tsx      # En-tête avec navigation
│   ├── Footer.tsx      # Pied de page
│   ├── PropertyCard.tsx # Carte d'affichage des biens
│   ├── SearchFilters.tsx # Composant de filtres
│   └── PropertyForm.tsx # Formulaire de création d'annonces
├── pages/              # Pages principales
│   ├── HomePage.tsx    # Page d'accueil
│   ├── SearchPage.tsx  # Page de recherche
│   ├── PropertyDetailPage.tsx # Détail d'un bien
│   ├── AuthPage.tsx    # Authentification
│   └── DashboardPage.tsx # Tableau de bord
├── contexts/           # Gestion d'état globale
│   ├── AuthContext.tsx # Contexte d'authentification
│   └── PropertyContext.tsx # Contexte des biens
├── types/              # Types TypeScript
│   └── Property.ts     # Interface des biens immobiliers
└── App.tsx            # Composant racine
```

## 🎨 Design et thème

### Couleurs principales
- **Vert émeraude** : #10B981 (couleur principale évoquant la Guinée)
- **Gris neutres** : Pour le texte et les éléments secondaires
- **Blanc** : Arrière-plans et cartes

### Responsive Design
- **Mobile First** : Optimisé pour les écrans mobiles
- **Breakpoints** : sm (640px), md (768px), lg (1024px), xl (1280px)
- **Navigation adaptative** : Menu hamburger sur mobile

## 🔧 Configuration

### Variables d'environnement
Créez un fichier `.env.local` :
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=BarryLand
```

### Intégration avec le Backend
Le frontend communique avec l'API backend via des appels HTTP. Assurez-vous que le backend est démarré sur le port 5000.

## 📱 Fonctionnalités

### Pages principales
- **Accueil** : Présentation des catégories et biens en vedette
- **Recherche** : Filtres avancés et résultats paginés
- **Détail bien** : Galerie photos, informations complètes, contact
- **Authentification** : Inscription et connexion
- **Tableau de bord** : Gestion des annonces utilisateur

### Composants clés
- **PropertyCard** : Affichage des biens en grille ou liste
- **SearchFilters** : Filtres de recherche avancée
- **PropertyForm** : Formulaire de création/modification d'annonces
- **Header/Footer** : Navigation et informations de contact

## 🌍 Spécificités Guinée

### Localisation
- Interface en français
- Villes de Guinée intégrées
- Format de téléphone guinéen (+224)
- Devise en Franc guinéen (GNF)

### Adaptation culturelle
- Design respectueux des codes locaux
- Images représentatives du marché guinéen
- Terminologie adaptée au contexte local

## 🚀 Déploiement

### Build de production
```bash
npm run build
```

### Plateformes recommandées
- **Vercel** (recommandé)
- **Netlify**
- **Azure Static Web Apps**
- **AWS Amplify**

## 🔮 Évolutions futures

- Intégration de cartes interactives (Google Maps)
- Notifications push
- Mode sombre
- Application mobile (React Native)
- Optimisations SEO avancées

---

Pour plus d'informations, consultez le README principal du projet.