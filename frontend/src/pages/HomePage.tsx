import React from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Shield, Users, Home, Building, TreePine, ArrowRight, Star} from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { useProperty } from '../contexts/PropertyContext';

const HomePage: React.FC = () => {
  const { properties } = useProperty();
  // Show only public/validated properties or those whose images are hosted on Cloudinary
  const isPublicProperty = (p: any) => {
    // If property is validated or active, show it
    if (p.status === 'validee' || p.status === 'active') return true;
    // Otherwise, if any image URL contains cloudinary domain, consider it public
    if (Array.isArray(p.images) && p.images.some((img: string) => typeof img === 'string' && img.includes('res.cloudinary.com'))) return true;
    return false;
  };

  const featuredProperties = properties.filter(isPublicProperty).slice(0, 6);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Trouvez votre <span className="text-emerald-200">bien idéal</span> en Guinée
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-emerald-100">
              La première plateforme immobilière moderne de Guinée. Achat, vente, location en toute sécurité.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/search?type=vente"
                className="bg-white text-emerald-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center"
              >
                <Search className="h-5 w-5 mr-2" />
                Rechercher un bien
              </Link>
              <Link
                to="/dashboard"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-emerald-600 transition-all duration-300 flex items-center justify-center"
              >
                Déposer une annonce
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Explorez par catégorie
            </h2>
            <p className="text-xl text-gray-600">
              Découvrez une large sélection de biens immobiliers adaptés à vos besoins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link
              to="/search?type=vente"
              className="group bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-center">
                <div className="bg-blue-600 text-white p-4 rounded-full w-20 h-20 mx-auto mb-6 group-hover:bg-blue-700 transition-colors flex items-center justify-center">
                  <Home className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Achat</h3>
                <p className="text-gray-600 mb-4">
                  Maisons, appartements, villas et propriétés à vendre dans toute la Guinée
                </p>
                <span className="inline-flex items-center text-blue-600 font-semibold">
                  Explorer les biens à vendre
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>

            <Link
              to="/search?type=location"
              className="group bg-gradient-to-br from-emerald-50 to-emerald-100 p-8 rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-center">
                <div className="bg-emerald-600 text-white p-4 rounded-full w-20 h-20 mx-auto mb-6 group-hover:bg-emerald-700 transition-colors flex items-center justify-center">
                  <Building className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Location</h3>
                <p className="text-gray-600 mb-4">
                  Appartements, maisons et bureaux en location pour tous les budgets
                </p>
                <span className="inline-flex items-center text-emerald-600 font-semibold">
                  Voir les locations
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>

            <Link
              to="/search?category=terrain"
              className="group bg-gradient-to-br from-amber-50 to-amber-100 p-8 rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-center">
                <div className="bg-amber-600 text-white p-4 rounded-full w-20 h-20 mx-auto mb-6 group-hover:bg-amber-700 transition-colors flex items-center justify-center">
                  <TreePine className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Terrains</h3>
                <p className="text-gray-600 mb-4">
                  Terrains constructibles, agricoles et d'investissement disponibles
                </p>
                <span className="inline-flex items-center text-amber-600 font-semibold">
                  Découvrir les terrains
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Biens en vedette
            </h2>
            <p className="text-xl text-gray-600">
              Découvrez une sélection de nos meilleures offres immobilières
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/search"
              className="bg-emerald-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-emerald-700 transition-all duration-300 inline-flex items-center"
            >
              Voir tous les biens
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Pourquoi choisir BarryLand ?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nous révolutionnons le marché immobilier guinéen avec une plateforme moderne, sécurisée et accessible
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="bg-emerald-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 group-hover:bg-emerald-200 transition-colors flex items-center justify-center">
                <Shield className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Sécurisé</h3>
              <p className="text-gray-600">
                Toutes les annonces sont vérifiées pour garantir votre sécurité
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-blue-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 group-hover:bg-blue-200 transition-colors flex items-center justify-center">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Local</h3>
              <p className="text-gray-600">
                Spécialisé dans le marché immobilier guinéen avec une connaissance locale
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-purple-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 group-hover:bg-purple-200 transition-colors flex items-center justify-center">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Communauté</h3>
              <p className="text-gray-600">
                Une communauté active d'acheteurs, vendeurs et professionnels
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-amber-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 group-hover:bg-amber-200 transition-colors flex items-center justify-center">
                <Star className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Qualité</h3>
              <p className="text-gray-600">
                Interface moderne et expérience utilisateur optimisée
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-emerald-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <h3 className="text-4xl md:text-5xl font-bold mb-2">500+</h3>
              <p className="text-emerald-100">Biens disponibles</p>
            </div>
            <div>
              <h3 className="text-4xl md:text-5xl font-bold mb-2">1200+</h3>
              <p className="text-emerald-100">Utilisateurs actifs</p>
            </div>
            <div>
              <h3 className="text-4xl md:text-5xl font-bold mb-2">15+</h3>
              <p className="text-emerald-100">Villes couvertes</p>
            </div>
            <div>
              <h3 className="text-4xl md:text-5xl font-bold mb-2">98%</h3>
              <p className="text-emerald-100">Satisfaction client</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;