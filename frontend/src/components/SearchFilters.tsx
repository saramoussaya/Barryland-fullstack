import React from 'react';

interface SearchFiltersState {
  type: string;
  category: string;
  city: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  query: string;
}

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onFilterChange: (filters: Partial<SearchFiltersState>) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ filters, onFilterChange }) => {
  const cities = [
    'Conakry', 'Kankan', 'Labé', 'Nzérékoré', 'Kindia', 'Mamou', 
    'Boké', 'Faranah', 'Siguiri', 'Guéckédou'
  ];

  const handleChange = (name: keyof SearchFiltersState, value: string) => {
    onFilterChange({ [name]: value } as Partial<SearchFiltersState>);
  };

  return (
    <div className="space-y-6">
      {/* Type de transaction */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type de transaction
        </label>
        <select
          value={filters.type}
          onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="">Tous</option>
          <option value="vente">Vente</option>
          <option value="location">Location</option>
        </select>
      </div>

      {/* Catégorie */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Catégorie
        </label>
        <select
          value={filters.category}
          onChange={(e) => handleChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="">Toutes</option>
          <option value="maison">Maison</option>
          <option value="appartement">Appartement</option>
          <option value="villa">Villa</option>
          <option value="terrain">Terrain</option>
          <option value="bureau">Bureau</option>
          <option value="commerce">Commerce</option>
        </select>
      </div>

      {/* Ville */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ville
        </label>
        <select
          value={filters.city}
          onChange={(e) => handleChange('city', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="">Toutes les villes</option>
          {cities.map(city => (
            <option key={city} value={city.toLowerCase()}>{city}</option>
          ))}
        </select>
      </div>

      {/* Prix */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prix (GNF)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => handleChange('minPrice', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => handleChange('maxPrice', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Chambres */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chambres min.
        </label>
        <select
          value={filters.bedrooms}
          onChange={(e) => handleChange('bedrooms', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="">Toutes</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
          <option value="5">5+</option>
        </select>
      </div>

      {/* Salles de bain */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Salles de bain min.
        </label>
        <select
          value={filters.bathrooms}
          onChange={(e) => handleChange('bathrooms', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="">Toutes</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
        </select>
      </div>

      {/* Surface */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Surface min. (m²)
        </label>
        <input
          type="number"
          placeholder="Surface minimale"
          value={filters.area}
          onChange={(e) => handleChange('area', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default SearchFilters;