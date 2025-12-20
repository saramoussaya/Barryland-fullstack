import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationItem from '../components/NotificationItem';
import { useLocation } from 'react-router-dom';
import { Plus, Home, BarChart3, Heart, Bell, Edit, Trash2, User, Lock, ChevronRight, ChevronLeft, Eye, EyeOff, MessageSquare, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import PropertyForm from '../components/PropertyForm';
import PropertyCard from '../components/PropertyCard';
import { useToast } from '../contexts/ToastContext';
const UserMessages = React.lazy(() => import('./UserMessages'));
import { useLogout } from '../hooks/useLogout';

// Inline component: ChangePasswordForm
const ChangePasswordForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validLength = password.length >= 8;
  const passwordsMatch = password && confirm && password === confirm;
  const canSubmit = validLength && passwordsMatch;

  return (
    <div>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe *</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Taper un nouveau mot de passe" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-2 text-gray-500">
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {!validLength && password.length > 0 && <p className="text-sm text-red-600 mt-2">Le mot de passe doit contenir au moins 8 caractères.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le nouveau mot de passe *</label>
          <div className="relative">
            <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-taper le nouveau mot de passe" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2 top-2 text-gray-500">
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {confirm.length > 0 && !passwordsMatch && <p className="text-sm text-red-600 mt-2">Les mots de passe ne correspondent pas.</p>}
        </div>

        <div>
          <button disabled={!canSubmit} onClick={async () => {
            if (!canSubmit) return;
            try {
              // TODO: call backend change password endpoint
              showToast('Mot de passe modifié avec succès', 'success');
              onClose();
            } catch (err: any) {
              showToast(err?.message || 'Erreur lors de la modification du mot de passe', 'error');
            }
          }} className={`w-full py-3 rounded-full font-semibold ${canSubmit ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-400'}`}>Modifier votre mot de passe</button>
        </div>
      </div>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const propertyCtx = useProperty();
  const { myProperties, favorites, loading, error, fetchMyProperties } = propertyCtx as any;
  // Notifications hook must be called at top-level to respect Rules of Hooks
  const { notifications, loading: notificationsLoading, markAllRead, refresh: refreshNotifications } = useNotifications();
  const location = useLocation();
  const initialTab = (location && (location as any).state && (location as any).state.tab) || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const { showToast } = useToast();
  const handleLogout = useLogout();
  const [markAllLoading, setMarkAllLoading] = useState(false);

  // Use `myProperties` as the single source of truth for the current user's properties.
  // Falling back to the global `properties` list causes false positives when owner fields are non-standard.
  const allPropsSource = Array.isArray(myProperties) ? myProperties : [];
  // Deduplicate by id/_id to avoid double-counting when backend may return duplicates
  const dedupeById = (arr: any[]) => {
    const map = new Map<string, any>();
    (arr || []).forEach(item => {
      const key = String(item?.id || item?._id || '');
      if (!key) return;
      if (!map.has(key)) map.set(key, item);
    });
    return Array.from(map.values());
  };

  const deduped = dedupeById(allPropsSource);

  // Ensure we only count properties that truly belong to the logged-in user (defensive)
  const userPropertiesAll = deduped.filter((p: any) => {
    if (!user) return false;
    const owner = p?.owner;
    const ownerId = typeof owner === 'string' ? owner : (owner?._id || owner?.id || owner?.toString());
    return !!ownerId && (ownerId === user.id || ownerId === (user as any)._id || ownerId === user.email);
  });

  // Dev logs to help debug count mismatches (removed/disabled in production)
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[Dashboard] myProperties count:', allPropsSource.length, 'deduped:', deduped.length, 'owner-matched:', userPropertiesAll.length);
  }

  // For the "Mes biens" tab we show all properties belonging to the user (pending, active, rejected)
  const userProperties = userPropertiesAll;

  // Dynamic statistics computed from the user's properties and favorites
  const totalProperties = userPropertiesAll.length;
  const activeProperties = userPropertiesAll.filter((p: any) => {
    const s = (p?.status || '').toString().toLowerCase();
    return s === 'active' || s === 'validee' || s === 'validated' || s === 'active';
  }).length;
  const pendingProperties = userPropertiesAll.filter((p: any) => {
    const s = (p?.status || '').toString().toLowerCase();
    return s === 'en_attente' || s === 'pending' || s === 'waiting' || s === 'pending_validation';
  }).length;
  const rejectedProperties = userPropertiesAll.filter((p: any) => {
    const s = (p?.status || '').toString().toLowerCase();
    return s === 'rejetee' || s === 'rejected' || s === 'rejected';
  }).length;
  // Sum up views if the backend exposes a `views` numeric field per property, otherwise 0
  const views = userPropertiesAll.reduce((acc: number, p: any) => acc + (Number(p?.views) || 0), 0);
  const favoritesCount = Array.isArray(favorites) ? favorites.length : 0;
  const stats = {
    totalProperties,
    activeProperties,
    pendingProperties,
    rejectedProperties,
    views,
    favorites: favoritesCount
  };

  // Build tabs based on user role: only admins and owners/professionals see Messages
  const baseTabs: Array<{ id: string; label: string; icon: any }> = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'properties', label: 'Mes biens', icon: Home },
    { id: 'favorites', label: 'Favoris', icon: Heart },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Compte', icon: User }
  ];

  const tabs = (() => {
    const t = [...baseTabs];
    const role = user?.role as string | undefined;
    if (role === 'admin' || role === 'professional' || role === 'owner') {
      // insert Messages tab before Notifications for visibility
      t.splice(3, 0, { id: 'messages', label: 'Messages', icon: MessageSquare });
    }
    return t;
  })();

  // Consider these as account sub-views so the 'Compte' sidebar item stays highlighted
  const accountViews = ['settings', 'profile', 'security'];
  const isAccountView = accountViews.includes(activeTab);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);

  // When entering account views, move focus to the 'Compte' sidebar button for accessibility
  useEffect(() => {
    if (isAccountView && settingsButtonRef.current) {
      settingsButtonRef.current.focus();
    }
  }, [isAccountView]);

  // Stable tab setter: persist in sessionStorage and ensure focus remains consistent
  const setActiveTabStable = (tabId: string) => {
    try {
      sessionStorage.setItem('dashboardActiveTab', tabId);
    } catch (e) { /* ignore */ }
    setActiveTab(tabId);
    // After UI update, ensure focus remains on sidebar to prevent 'lost focus' issues
    setTimeout(() => {
      const activeButton = document.querySelector('[data-dashboard-active]');
      if (activeButton && (activeButton as HTMLElement).focus) (activeButton as HTMLElement).focus();
    }, 50);
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total biens</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalProperties}</p>
            </div>
            <Home className="h-8 w-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Biens actifs</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeProperties}</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En attente</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingProperties}</p>
            </div>
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-yellow-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejetées</p>
              <p className="text-3xl font-bold text-gray-900">{stats.rejectedProperties}</p>
            </div>
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-red-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Activité récente</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Nouvelle vue sur votre bien</p>
              <p className="text-sm text-gray-600">Villa moderne à Conakry - il y a 2 heures</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Bien ajouté aux favoris</p>
              <p className="text-sm text-gray-600">Appartement 3 pièces Kipé - il y a 5 heures</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Annonce publiée avec succès</p>
              <p className="text-sm text-gray-600">Terrain 500m² Matoto - il y a 1 jour</p>
            </div>
          </div>
        </div>
      </div>
      {/* Diagnostic panel removed (development-only) */}
    </div>
  );

  const renderProperties = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Mes biens immobiliers</h2>
        <button
          onClick={() => setShowPropertyForm(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Ajouter un bien</span>
        </button>
      </div>
      <div className="text-sm text-gray-500 mb-4">Affichage de {userProperties.length} biens</div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      ) : userProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userProperties.map((property: any) => (
            <div key={property.id} className="relative">
              <PropertyCard property={property} />
              <div className="absolute top-4 right-4 flex space-x-2">
                <button
                  onClick={() => { setEditingProperty(property); setShowPropertyForm(true); }}
                  className="bg-white p-2 rounded-full shadow-md hover:bg-gray-50 transition-colors"
                >
                  <Edit className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => { setDeletingPropertyId(property.id || property._id); setShowDeleteConfirm(true); }}
                  className="bg-white p-2 rounded-full shadow-md hover:bg-gray-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun bien immobilier
          </h3>
          <p className="text-gray-600 mb-6">
            Commencez par publier votre premier bien immobilier
          </p>
          <button
            onClick={() => setShowPropertyForm(true)}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Déposer une annonce</span>
          </button>
        </div>
      )}

      
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'properties':
        return renderProperties();
      case 'favorites':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Mes favoris</h2>
            {Array.isArray(favorites) && favorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((prop: any) => (
                  <div key={prop.id || prop._id} className="relative">
                    <PropertyCard property={prop} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun favori</h3>
                <p className="text-gray-600">Les biens que vous ajouterez en favori apparaîtront ici</p>
              </div>
            )}
          </div>
        );
      case 'messages':
          return (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Messages</h2>
                <div className="text-sm text-gray-600 mb-6">Gestion de vos messages et demandes reçues.</div>
                {/* UserMessages: role-aware messages dashboard */}
                <Suspense fallback={<div className="py-8 text-center">Chargement des messages...</div>}>
                  <UserMessages />
                </Suspense>
              </div>
            </div>
          );
      case 'notifications': {
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Notifications</h2>
            <div className="flex justify-end mb-4">
              {notifications && notifications.some((n: any) => !n.read) ? (
                <button
                  onClick={async () => {
                    try {
                      setMarkAllLoading(true);
                      await markAllRead();
                      // Use refresh for stronger consistency rather than local optimistic update
                      await refreshNotifications();
                      showToast('Toutes les notifications ont été marquées comme lues', 'success');
                    } catch (err: any) {
                      showToast(err?.message || 'Erreur lors du marquage', 'error');
                    } finally {
                      setMarkAllLoading(false);
                    }
                  }}
                  className="text-sm text-blue-600 hover:underline inline-flex items-center"
                >
                  {markAllLoading ? (
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  ) : null}
                  Marquer tout lu
                </button>
              ) : null}
            </div>
            <div className="space-y-2">
              {notificationsLoading ? (
                <div className="py-8 text-center">Chargement...</div>
              ) : !notifications || notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune notification</h3>
                  <p className="text-gray-600">Vous recevrez des notifications lorsque votre annonce est validée ou qu'un internaute vous contacte.</p>
                </div>
              ) : (
                notifications.map((n: any) => <NotificationItem key={n._id} notification={n} />)
              )}
            </div>
          </div>
        );
      }
      case 'settings':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Compte</h2>
              <div className="text-sm text-gray-600 mt-2">{user?.email}</div>
            </div>

            <div className="space-y-4">
                <button onClick={() => setActiveTabStable('profile')} className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg hover:shadow transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Informations personnelles</div>
                    <div className="text-sm text-gray-500">Mettre à jour votre nom, téléphone et plus</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>

              <button onClick={() => setActiveTabStable('security')} className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg hover:shadow transition-shadow">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Connexion et sécurité</div>
                    <div className="text-sm text-gray-500">Changer votre email et mot de passe</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            {/* Logout block at the bottom of the Compte tab */}
            <div className="mt-6">
              <div className="bg-red-600 text-white rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <h3 className="text-lg font-semibold">Se déconnecter</h3>
                  <p className="text-sm text-red-100 mt-1">Déconnectez-vous de votre compte pour sécuriser l'accès sur cet appareil.</p>
                </div>
                <div className="w-full md:w-auto flex justify-center md:justify-end">
                  <button onClick={handleLogout} className="bg-white text-red-600 px-6 py-3 rounded-full font-medium inline-flex items-center space-x-2 hover:bg-gray-100">
                    <LogOut className="h-4 w-4" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-4 mb-4">
                <button onClick={() => setActiveTabStable('settings')} className="p-2 rounded-md hover:bg-gray-100">
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Informations personnelles</h2>
                  <p className="text-sm text-gray-600 mt-2">Bienvenue sur votre profil personnel. Vous pouvez ajouter et modifier vos données personnelles dans cette section.</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white">
                  <div className="divide-y divide-gray-100">
                    <div className="py-6 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Nom</div>
                        <div className="text-sm text-gray-500 mt-2">{user && (user.firstName || user.lastName) ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Non fourni'}</div>
                      </div>
                      <div>
                        <button onClick={() => setShowEditProfile(true)} className="text-sm text-emerald-600 font-medium">Modifier</button>
                      </div>
                    </div>

                    <div className="py-6 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Numéro de téléphone</div>
                        <div className="text-sm text-gray-500 mt-2">{user?.phone || 'Non fourni'}</div>
                      </div>
                      <div>
                        <button onClick={() => setShowEditProfile(true)} className="text-sm text-emerald-600 font-medium">Modifier</button>
                      </div>
                    </div>

                    <div className="py-6 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Adresse</div>
                        <div className="text-sm text-gray-500 mt-2">Non fourni</div>
                      </div>
                      <div>
                        <button onClick={() => setShowEditProfile(true)} className="text-sm text-emerald-600 font-medium">Modifier</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <div className="p-4 bg-white border border-gray-100 rounded-lg shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="text-emerald-600 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zM9 7a1 1 0 012 0v3a1 1 0 11-2 0V7zm1 7a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 14z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-sm text-gray-700">
                        <div className="font-medium text-gray-900">Comment utilisons-nous ces données ?</div>
                        <div className="text-sm text-gray-500 mt-2">Vos informations sont partagées avec les agences ou les particuliers uniquement lorsque vous les contactez par email et décidez de les transmettre.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-4 mb-4">
                <button onClick={() => setActiveTabStable('settings')} className="p-2 rounded-md hover:bg-gray-100">
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Connexion et sécurité</h2>
                </div>
              </div>

              <div className="mt-4 bg-white">
                <div className="divide-y divide-gray-100">
                  <div className="py-6 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Email</div>
                      <div className="text-sm text-gray-500 mt-2">{user?.email || 'Non fourni'}</div>
                    </div>
                    <div>
                      <button onClick={() => setShowChangeEmail(true)} className="text-sm text-emerald-600 font-medium">Modifier</button>
                    </div>
                  </div>

                  <div className="py-6 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Mot de passe</div>
                      <div className="text-sm text-gray-500 mt-2">{Array(12).fill('*').join('')}</div>
                    </div>
                    <div>
                      <button onClick={() => setShowChangePassword(true)} className="text-sm text-emerald-600 font-medium">Modifier</button>
                    </div>
                  </div>

                  <div className="py-6">
                    <p className="text-sm text-gray-600">Besoin de supprimer votre compte ?</p>
                    <button className="mt-3 text-sm font-medium text-red-600">Supprimer mon compte</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return renderOverview();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Accès restreint</h2>
          <p className="text-gray-600">Vous devez être connecté pour accéder au tableau de bord</p>
        </div>
      </div>
    );
  }
  // Fetch user's properties on mount or when user becomes available so overview stats are accurate
  React.useEffect(() => {
    if (user) {
      fetchMyProperties().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Also fetch when switching to properties tab for freshness
  React.useEffect(() => {
    if (activeTab === 'properties') {
      fetchMyProperties().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bonjour, {user.firstName} {user.lastName} 👋
          </h1>
          <div className="flex items-center space-x-4">
            <p className="text-gray-600">Gérez vos biens immobiliers et suivez votre activité</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-lg shadow-md p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const isActive = tab.id === 'settings' ? isAccountView : activeTab === tab.id;
                  const refProps = tab.id === 'settings' ? { ref: settingsButtonRef } : {};
                  return (
                      <button
                        key={tab.id}
                        {...refProps}
                        data-dashboard-active={isActive ? '1' : undefined}
                        onClick={() => setActiveTabStable(tab.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <tab.icon className="h-5 w-5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Property Form Modal */}
      {showPropertyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <PropertyForm onClose={() => { setShowPropertyForm(false); setEditingProperty(null); }} initialData={editingProperty || undefined} />
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer ce bien ? Cette action est irréversible.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletingPropertyId(null); }}
                className="px-4 py-2 rounded-lg border border-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!deletingPropertyId) return;
                  try {
                    await propertyCtx.deleteProperty(deletingPropertyId);
                    setShowDeleteConfirm(false);
                    setDeletingPropertyId(null);
                    showToast('Bien supprimé avec succès', 'success');
                  } catch (err: any) {
                    showToast(err?.message || 'Erreur lors de la suppression', 'error');
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full mt-12 shadow-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowChangePassword(false)} className="p-2 rounded-md hover:bg-gray-100">
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <h3 className="text-lg font-semibold">Modifier votre mot de passe</h3>
              </div>
            </div>
            <div className="p-6">
              <ChangePasswordForm onClose={() => setShowChangePassword(false)} />
            </div>
          </div>
        </div>
      )}
      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal onClose={() => setShowEditProfile(false)} />
      )}

      {/* Change Email Modal (UI-only) */}
      {showChangeEmail && (
        <ChangeEmailModal onClose={() => setShowChangeEmail(false)} />
      )}
    </div>
  );
};

// Top-level ChangeEmailModal component
function ChangeEmailModal({ onClose }: { onClose: () => void }) {
  const { updateUser } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: any = {};
    if (!validateEmail(email)) err.email = 'Entrez une adresse email valide.';
    if (!password || password.length < 6) err.password = 'Entrez votre mot de passe actuel.';
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('barrylandAuthToken');
      const res = await fetch('/api/users/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ email, currentPassword: password })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.errors && Array.isArray(data.errors)) {
          const fieldErr: any = {};
          data.errors.forEach((it: any) => {
            if (it.param === 'email') fieldErr.email = it.msg;
            if (it.param === 'currentPassword') fieldErr.password = it.msg;
          });
          setErrors(fieldErr);
        } else {
          setErrors({ general: data?.message || 'Erreur lors de la mise à jour de l\'email' });
        }
        setLoading(false);
        return;
      }

      const updatedUser = data?.data?.user;
      if (updatedUser) updateUser(updatedUser as any);
      showToast('Email mis à jour', 'success');
      onClose();
    } catch (err: any) {
      setErrors({ general: err?.message || 'Erreur réseau' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg mx-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100">
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h3 className="text-lg font-semibold">Modifier votre email</h3>
            </div>
          </div>

          <form onSubmit={submit} className="p-4">
            {errors.general && <div className="mb-3 text-sm text-red-600">{errors.general}</div>}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nouvel email *</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Saisissez votre nouvel email" className={`w-full rounded-md border px-4 py-3 focus:outline-none ${errors.email ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
              <div className="relative">
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPass ? 'text' : 'password'} placeholder="Entrez votre mot de passe actuel" className={`w-full rounded-md border px-4 py-3 focus:outline-none ${errors.password ? 'border-red-500' : 'border-gray-300'}`} />
                <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-3 text-gray-500">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <div className="pt-4">
              <button type="submit" disabled={loading} className={`w-full ${loading ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'} text-white rounded-full py-3 font-semibold`}>
                {loading ? 'En cours...' : 'Modifier votre email'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// EditProfileModal component
function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; phone?: string }>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: any = {};
    if (!firstName || firstName.trim().length < 2) err.firstName = 'Prénom invalide';
    if (!lastName || lastName.trim().length < 2) err.lastName = 'Nom invalide';
    // phone optional but if provided, simple check
    if (phone && !/^\+?[0-9]{6,15}$/.test(phone)) err.phone = 'Numéro invalide';
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setLoading(true);
    try {
      // UI-only: update local context (include address.city)
      updateUser({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), address: { city: city.trim() } as any } as any);
      showToast('Profil mis à jour (simulation)', 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de la mise à jour', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl mx-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100">
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h3 className="text-lg font-semibold">Modifier mes informations</h3>
            </div>
          </div>

          <form onSubmit={submit} className="p-6 grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Prénom</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nom</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Numéro de téléphone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} placeholder="+224XXXXXXXX" />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ville</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 border-gray-300" />
            </div>

            <div className="pt-4 col-span-full">
              <button type="submit" disabled={loading} className={`w-full ${loading ? 'bg-emerald-400' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-full py-3 font-semibold`}>
                {loading ? 'En cours...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;