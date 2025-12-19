import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SimilarProperty } from '../types/Property';
import { getSimilarProperties } from '../services/propertyService';

interface Props {
  propertyId: string | undefined;
}

const SimilarProperties: React.FC<Props> = ({ propertyId }) => {
  const [items, setItems] = useState<SimilarProperty[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    if (!propertyId) return;
    setLoading(true);
    getSimilarProperties(propertyId, 4)
      .then((res) => {
        if (!mounted) return;
        const props = (res && res.data && Array.isArray(res.data.properties)) ? res.data.properties : [];
        setItems(props);
      })
      .catch((err) => {
        console.error('Failed to load similar properties', err);
        if (mounted) setItems([]);
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [propertyId]);

  if (!propertyId) return null;
  if (loading && items === null) {
    // Skeleton loader
    return (
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Plus de biens similaires</h3>
        <div className="flex gap-4 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-60 min-w-[15rem] bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="h-36 bg-gray-200 rounded-md mb-3" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Plus de biens similaires</h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map(item => (
          <Link
            to={`/property/${item._id}`}
            key={item._id}
            className="w-60 min-w-[15rem] bg-white rounded-lg shadow hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 overflow-hidden"
          >
            <div className="h-36 bg-gray-100">
              {item.image ? (
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">Pas d'image</div>
              )}
            </div>
            <div className="p-3">
              <div className="text-sm text-gray-600 mb-1">{item.propertyType ? item.propertyType : ''} {item.bedrooms ? `• ${item.bedrooms} pièce(s)` : ''}</div>
              <div className="font-semibold text-gray-900 mb-1">{item.title}</div>
              <div className="text-emerald-600 font-bold mb-1">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'GNF', minimumFractionDigits: 0 }).format(item.price)}</div>
              <div className="text-sm text-gray-600">{item.area ? `${item.area} m² • ` : ''}{item.city || item.address || ''}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SimilarProperties;
