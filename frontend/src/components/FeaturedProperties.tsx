import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFeaturedProperties } from '../services/propertyService';
import { FeaturedProperty } from '../types/Property';
import { ArrowRight, MapPin, Bed, Bath, Square, Camera, Heart } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { useToast } from '../contexts/ToastContext';

const FeaturedProperties: React.FC = () => {
  const [items, setItems] = useState<FeaturedProperty[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { toggleFavorite } = useProperty();
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getFeaturedProperties(6)
      .then(res => {
        if (!mounted) return;
        console.debug('getFeaturedProperties raw response:', res);
        // Accept either axios response (res.data.properties) or already-unwrapped data (res.properties)
        let props: any[] = [];
        try {
          if (res && res.data && Array.isArray(res.data.properties)) props = res.data.properties;
          else if (res && Array.isArray((res as any).properties)) props = (res as any).properties;
          else if (Array.isArray(res)) props = res as any[];
        } catch (e) { props = []; }
        // Ensure description and isFavorite exist to allow rendering
        const normalized = props.map(p => ({ ...p, description: p.description || '', isFavorite: !!p.isFavorite }));
        console.debug('getFeaturedProperties normalized items:', normalized);
        setItems(normalized as FeaturedProperty[]);
      })
      .catch(err => {
        console.error('Failed to load featured', err);
        if (mounted) setItems([]);
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, []);

  if (loading && items === null) {
    return (
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Biens en vedette</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                <div className="h-36 bg-gray-200 rounded mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!items || items.length === 0) return null;

  const handleFavoriteClick = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const isFav = await toggleFavorite(id);
      showToast(isFav ? 'Annonce ajoutée à vos favoris' : 'Annonce retirée de vos favoris', 'success');
      // update local items so UI updates immediately
      setItems(prev => prev ? prev.map(it => (String(it._id) === String(id) ? { ...it, isFavorite: isFav } : it)) : prev);
    } catch (err) {
      console.error('favorite error', err);
      showToast('Impossible d\'ajouter aux favoris', 'error');
    }
  };

  const truncate = (text: string | undefined | null, max = 140) => {
    if (!text) return '';
    const t = String(text).trim();
    return t.length > max ? t.slice(0, max).trim() + '…' : t;
  };

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">Biens en vedette</h2>
            <p className="text-gray-600">Découvrez une sélection de nos meilleures offres immobilières</p>
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <article key={item._id} className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition-all">
              <Link to={`/property/${item._id}`} className="block">
                <div className="relative h-52 bg-gray-100">
                  {item.mainImage ? (
                    <img src={item.mainImage} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">Pas d'image</div>
                  )}
                  {/* Top-left label for transaction type */}
                  {item.type === 'location' && (
                    <div className="absolute left-3 top-3 bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-semibold">À louer</div>
                  )}
                  {/* Validation badge (assuming featured means approved) */}
                  <div className="absolute left-3 top-12 bg-emerald-50 text-emerald-800 px-2 py-1 rounded text-xs font-medium">Validée</div>
                  {/* Camera count */}
                  <div className="absolute right-3 top-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs inline-flex items-center gap-1">
                    <Camera className="h-4 w-4" />
                    <span className="text-xs">{item.imagesCount || 0}</span>
                  </div>
                  {/* Favorite button */}
                  <div className="absolute right-3 bottom-3">
                    <button
                      onClick={(ev) => handleFavoriteClick(ev, String(item._id))}
                      className="bg-white p-2 rounded-full shadow hover:scale-105 transition-transform"
                      aria-label="Ajouter aux favoris"
                    >
                      <Heart className={`h-5 w-5 ${item.isFavorite ? 'text-red-500' : 'text-gray-600'}`} />
                    </button>
                  </div>
                </div>
              </Link>

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-emerald-600 font-bold text-2xl">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'GNF', minimumFractionDigits: 0 }).format(item.price)}</div>
                    <div className="text-sm text-gray-500">{item.type === 'location' ? '/mois' : ''}</div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-2 line-clamp-2">{item.title}</h3>

                <div className="flex items-center text-gray-600 mb-2">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="text-sm">{item.city || ''}</span>
                </div>

                {truncate(item.description) ? (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-3">{truncate(item.description, 140)}</p>
                ) : null}

                <div className="flex items-center justify-between text-gray-600 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center text-sm"><Bed className="h-4 w-4 mr-1" /> {item.rooms ?? 0}</div>
                    <div className="flex items-center text-sm"><Bath className="h-4 w-4 mr-1" /> {0}</div>
                    <div className="flex items-center text-sm"><Square className="h-4 w-4 mr-1" /> {item.surface ? `${item.surface}m²` : ''}</div>
                  </div>
                  <div className="text-sm text-gray-500">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : ''}</div>
                </div>

                <div className="flex items-center justify-between">
                  <Link to={`/property/${item._id}`} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">Voir détails</Link>
                  <div className="text-sm text-gray-500">{/* placeholder for extra info */}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/search" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-full hover:bg-emerald-700 transition-colors">
            Voir tous les biens
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProperties;
