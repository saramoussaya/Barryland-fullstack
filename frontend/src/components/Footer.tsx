import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo et Description */}
          <div>
            <Link to="/" className="flex items-center space-x-3 mb-4">
              <div className="bg-emerald-600 p-0 rounded-full flex items-center justify-center">
                <img src="/yes.png" alt="Logo" className="h-16 w-auto object-contain" />
              </div>
            </Link>
            <p className="text-gray-300 mb-4">
              La plateforme immobilière moderne de la Guinée. Trouvez votre bien idéal en toute simplicité.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Liens Rapides */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Liens Rapides</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/search?type=vente" className="text-gray-300 hover:text-emerald-400 transition-colors">
                  Achat
                </Link>
              </li>
              <li>
                <Link to="/search?type=location" className="text-gray-300 hover:text-emerald-400 transition-colors">
                  Location
                </Link>
              </li>
              <li>
                <Link to="/search?category=terrain" className="text-gray-300 hover:text-emerald-400 transition-colors">
                  Terrains
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-gray-300 hover:text-emerald-400 transition-colors">
                  Déposer une annonce
                </Link>
              </li>
            </ul>
          </div>

          {/* Villes Populaires */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Villes Populaires</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/search?city=conakry" className="text-gray-300 hover:text-emerald-400 transition-colors">
                  Conakry
                </Link>
              </li>
              <li>
                <Link to="/search?city=kankan" className="text-gray-300 hover:text-emerald-400 transition-colors">
                  Kankan
                </Link>
              </li>
              <li>
                <Link to="/search?city=labé" className="text-gray-300 hover:text-emerald-400 transition-colors">
                  Labé
                </Link>
              </li>
              <li>
                <Link to="/search?city=nzérékoré" className="text-gray-300 hover:text-emerald-400 transition-colors">
                  Nzérékoré
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-emerald-400" />
                <span className="text-gray-300">Conakry, Guinée</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-emerald-400" />
                <span className="text-gray-300">+224 XX XX XX XX</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-emerald-400" />
                <span className="text-gray-300">contact@barryland.gn</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © 2025. Tous droits réservés. Développé pour moderniser l'immobilier en Guinée.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;