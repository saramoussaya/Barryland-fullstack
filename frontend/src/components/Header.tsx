import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Heart, User, Bell, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
// removed useLogout as logout button is not shown in header for logged-in users
import { useNotifications } from '../contexts/NotificationContext';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { favorites } = useProperty();
  const { notifications } = useNotifications();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo: use image from public folder (place yes.png into frontend/public/yes.png) */}
          <Link to="/" aria-label="Accueil" className="flex items-center">
            <div className="bg-emerald-600 p-0 rounded-full flex items-center justify-center">
              <img src="/yes.png" alt="BarryLand" className="h-20 md:h-24 w-auto object-contain" />
            </div>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un bien immobilier..."
                className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-emerald-600 transition-colors"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </form>

          {/* Navigation - Desktop */}
          <nav className="hidden lg:flex items-center space-x-4">
            <Link to="/search?type=vente" className="text-gray-700 hover:text-emerald-600 transition-colors">
              Acheter
            </Link>
            <Link to="/search?type=location" className="text-gray-700 hover:text-emerald-600 transition-colors">
              Louer
            </Link>
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="text-gray-700 hover:text-emerald-600 font-medium transition-colors"
                  >
                    Admin
                  </Link>
                )}

                {/* Deposit button - prominent green pill */}
                <Link
                  to="/create-property"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-full hover:bg-emerald-700 transition-colors inline-flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">Déposer une annonce</span>
                </Link>

                {/* Notification bell */}
                <button
                  onClick={() => navigate('/dashboard', { state: { tab: 'notifications' } })}
                  className="relative text-gray-700 hover:text-emerald-600 transition-colors p-2"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {Array.isArray(notifications) && notifications.some(n => !n.read) && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </button>

                {/* Favorites icon */}
                <button
                  onClick={() => navigate('/dashboard', { state: { tab: 'favorites' } })}
                  className="text-gray-700 hover:text-emerald-600 transition-colors p-2 relative"
                  aria-label="Favoris"
                >
                  <Heart className="h-5 w-5" />
                  {Array.isArray(favorites) && favorites.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">{favorites.length}</span>
                  )}
                </button>

                {/* User avatar */}
                <Link to="/dashboard" className="text-gray-700 hover:text-emerald-600 transition-colors p-2">
                  {(user as any)?.avatar ? (
                    <img src={(user as any).avatar} alt="Profil" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  to="/auth"
                  state={{ from: '/create-property' }}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-full hover:bg-emerald-700 transition-colors inline-flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">Déposer une annonce</span>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-gray-700"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-200">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mt-4 mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un bien immobilier..."
                  className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </form>

            {/* Mobile Navigation */}
            <nav className="flex flex-col space-y-3">
              <Link
                to="/search?type=vente"
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Acheter
              </Link>
              <Link
                to="/search?type=location"
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Louer
              </Link>
              {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="text-gray-700 hover:text-emerald-600 transition-colors py-2 flex items-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Mes annonces
                    </Link>
                    <Link
                      to="/create-property"
                      className="bg-emerald-600 text-white px-4 py-2 rounded-full hover:bg-emerald-700 transition-colors text-center inline-flex items-center justify-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Déposer une annonce
                    </Link>
                    <button
                      onClick={() => { navigate('/dashboard', { state: { tab: 'notifications' } }); setIsMenuOpen(false); }}
                      className="text-gray-700 hover:text-emerald-600 transition-colors py-2 flex items-center"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Notifications
                    </button>
                    <button
                      onClick={() => { navigate('/dashboard', { state: { tab: 'favorites' } }); setIsMenuOpen(false); }}
                      className="text-gray-700 hover:text-emerald-600 transition-colors py-2 flex items-center"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Favoris
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Connexion
                  </Link>
                )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;