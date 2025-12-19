import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Square, Heart, Camera, Briefcase } from 'lucide-react';
import { Property } from '../types/Property';
import { useProperty } from '../contexts/PropertyContext';
import StatusBadge from './StatusBadge';
import { cloudinaryUrlFrom } from '../utils/cloudinary';

interface PropertyCardProps {
  property: Property;
  layout?: 'grid' | 'list';
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, layout = 'grid' }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
    }).format(price);
  };
  // Normalize common fields to avoid runtime/TS issues when backend returns mixed shapes
  const firstImgRaw = Array.isArray(property.images) && property.images.length
    ? property.images[0]
    : null;
  const firstImg = firstImgRaw ? cloudinaryUrlFrom(firstImgRaw, { w: 1200, h: 800 }) : '';
  const imagesCount = Array.isArray(property.images) ? property.images.length : 0;
  const locationLabel = typeof property.location === 'string'
    ? property.location
    : (((property.location as any)?.address) || ((property.location as any)?.city) || '');
  // Prefer MongoDB _id when available so API calls use the DB identifier
  const propertyId = (property as any)._id || (property as any).id || '';
  const isValidated = ((property as any).status === 'active' || (property as any).status === 'validee' || Boolean((property as any).moderationInfo));

  const { toggleFavorite, favorites } = useProperty();
  // derive favorite state from context favorites or property flag
  const isFav = !!(favorites.some(f => (f.id === propertyId || f._id === propertyId)) || (property as any).isFavorite);

  if (layout === 'list') {
    const typeLabel = property.type === 'location' ? 'À louer' : property.type === 'vente' ? 'À vendre' : String(property.type || '').toString();
    const typeClass = property.type === 'location' ? 'bg-blue-600' : 'bg-emerald-600';
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300">
        <div className="flex flex-col md:flex-row">
          {/* Image */}
            <div className="md:w-80 h-64 md:h-auto relative">
            <img
              src={firstImg}
              alt={property.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-3 left-3 flex flex-col gap-2">
                <div className={`${typeClass} text-white px-2 py-1 rounded text-sm font-medium`}>
                  {typeLabel}
                </div>
              <StatusBadge status={property.status} />
              {property.publisherType === 'professionnel' && (
                <div className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  <span>Pro</span>
                </div>
              )}
            </div>
            <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded flex items-center space-x-1">
              <Camera className="h-3 w-3" />
              <span className="text-xs">{imagesCount}</span>
            </div>
            <button
              className={`absolute bottom-3 right-3 bg-white p-2 rounded-full hover:bg-gray-100 transition-colors ${isFav ? 'text-red-500' : ''}`}
              onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await toggleFavorite(propertyId);
                  } catch (err) {
                    // log server response when available for debugging
                    const anyErr: any = err;
                    try { console.error('toggle favorite failed', anyErr?.response?.data || anyErr); } catch(e) { console.error('toggle favorite failed', anyErr); }
                  }
                }}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'text-red-500' : 'text-gray-600'}`} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-emerald-600 transition-colors">
                  <Link to={`/property/${propertyId}`}>
                    {property.title}
                  </Link>
                </h3>
                <div className="flex items-center text-gray-600 mb-3">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="text-sm">{locationLabel}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600">
                  {formatPrice(property.price)}
                </div>
                <div className="text-sm text-gray-500">
                  {property.type === 'location' ? '/mois' : ''}
                </div>
              </div>
            </div>

            <p className="text-gray-600 mb-4 line-clamp-2">
              {property.description}
            </p>

            <div className="flex items-center space-x-6 text-gray-600 mb-4">
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                <span className="text-sm">{property.bedrooms}</span>
              </div>
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                <span className="text-sm">{property.bathrooms}</span>
              </div>
              <div className="flex items-center">
                <Square className="h-4 w-4 mr-1" />
                <span className="text-sm">{property.area}m²</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Publié le {new Date(property.createdAt).toLocaleDateString('fr-FR')}
              </div>
              <Link
                to={`/property/${propertyId}`}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                Voir détails
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {/* Image */}
          <div className="relative h-48">
          <img
            src={firstImg}
            alt={property.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        <div className="absolute top-3 left-3 flex flex-col gap-2">
            <div className={`${property.type === 'location' ? 'bg-blue-600' : 'bg-emerald-600'} text-white px-2 py-1 rounded text-sm font-medium`}>{property.type === 'location' ? 'À louer' : property.type === 'vente' ? 'À vendre' : property.type}</div>
            <div className="flex items-center gap-2">
              <StatusBadge status={property.status as any} />
              {isValidated && (
                <div className={`${'text-xs px-2 py-1 rounded font-medium text-white'} ${(property.status === 'active' ? 'bg-green-600' : 'bg-gray-600')}`}>
                  Validé
                </div>
              )}
            </div>
        </div>
        <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded flex items-center space-x-1">
          <Camera className="h-3 w-3" />
          <span className="text-xs">{imagesCount}</span>
        </div>
        <button
          className={`absolute bottom-3 right-3 bg-white p-2 rounded-full hover:bg-gray-100 transition-colors ${isFav ? 'text-red-500' : ''}`}
          onClick={async (e) => {
              e.stopPropagation();
              try {
                await toggleFavorite(propertyId);
              } catch (err) {
                console.error('toggle favorite failed', err);
              }
            }}
        >
          <Heart className={`h-4 w-4 ${isFav ? 'text-red-500' : 'text-gray-600'}`} />
        </button>
  </div>

  {/* Content */}
  <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="text-2xl font-bold text-emerald-600">
            {formatPrice(property.price)}
          </div>
          <div className="text-sm text-gray-500">
            {property.type === 'location' ? '/mois' : ''}
          </div>
        </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2 hover:text-emerald-600 transition-colors">
          <Link to={`/property/${propertyId}`}>
            {property.title}
          </Link>
        </h3>

        <div className="flex items-center text-gray-600 mb-3">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="text-sm">{locationLabel}</span>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {property.description}
        </p>

        <div className="flex items-center justify-between text-gray-600 mb-4">
          <div className="flex items-center">
            <Bed className="h-4 w-4 mr-1" />
            <span className="text-sm">{property.bedrooms}</span>
          </div>
          <div className="flex items-center">
            <Bath className="h-4 w-4 mr-1" />
            <span className="text-sm">{property.bathrooms}</span>
          </div>
          <div className="flex items-center">
            <Square className="h-4 w-4 mr-1" />
            <span className="text-sm">{property.area}m²</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {new Date(property.createdAt).toLocaleDateString('fr-FR')}
          </div>
          <Link
            to={`/property/${propertyId}`}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            Voir détails
          </Link>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PropertyCard);