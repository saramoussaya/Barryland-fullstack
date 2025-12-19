import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Grid, List } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import SearchFilters from '../components/SearchFilters';
import { useProperty } from '../contexts/PropertyContext';
import { Property } from '../types/Property';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { properties } = useProperty();
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(properties);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('latest');
  
  // Filters state
  const [filters, setFilters] = useState({
    type: searchParams.get('type') || '',
    category: searchParams.get('category') || '',
    city: searchParams.get('city') || '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    query: searchParams.get('q') || ''
  });

  const applyFilters = useCallback(() => {
    let filtered = [...properties];

    const locationLabelOf = (property: Property) => (
      typeof property.location === 'string' ? property.location : (property.location?.address || property.location?.city || '')
    );

    // Apply search query
    if (filters.query) {
      const q = filters.query.toLowerCase();
      filtered = filtered.filter(property =>
        property.title.toLowerCase().includes(q) ||
        property.description.toLowerCase().includes(q) ||
        locationLabelOf(property).toLowerCase().includes(q)
      );
    }

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(property => property.type === filters.type);
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(property => property.category === filters.category);
    }

    // Apply city filter
    if (filters.city) {
      const cityQ = filters.city.toLowerCase();
      filtered = filtered.filter(property => 
        locationLabelOf(property).toLowerCase().includes(cityQ)
      );
    }

    // Apply price range
    if (filters.minPrice) {
      filtered = filtered.filter(property => property.price >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(property => property.price <= parseFloat(filters.maxPrice));
    }

    // Apply bedrooms filter
    if (filters.bedrooms) {
      filtered = filtered.filter(property => property.bedrooms >= parseInt(filters.bedrooms));
    }

    // Apply bathrooms filter
    if (filters.bathrooms) {
      filtered = filtered.filter(property => property.bathrooms >= parseInt(filters.bathrooms));
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'latest':
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    setFilteredProperties(filtered);
  }, [filters, properties, sortBy]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  type FiltersState = typeof filters;

  const handleFilterChange = (newFilters: Partial<FiltersState>) => {
    setFilters({ ...filters, ...newFilters });
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      category: '',
      city: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      bathrooms: '',
      area: '',
      query: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Recherche de biens immobiliers
          </h1>
          <p className="text-gray-600">
            {filteredProperties.length} bien{filteredProperties.length !== 1 ? 's' : ''} trouvé{filteredProperties.length !== 1 ? 's' : ''}
            {filters.city && ` à ${filters.city}`}
            {filters.type && ` en ${filters.type}`}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters - Desktop */}
          <div className="lg:w-80">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Filtres</h2>
                <button
                  onClick={clearFilters}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                >
                  Réinitialiser
                </button>
              </div>
              
              <SearchFilters
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Filters & Controls */}
            <div className="lg:hidden mb-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal className="h-5 w-5" />
                  <span>Filtres</span>
                </button>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600'}`}
                  >
                    <Grid className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600'}`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <SearchFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              )}
            </div>

            {/* Sort Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="hidden lg:flex items-center space-x-4">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600'}`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600'}`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="latest">Plus récent</option>
                <option value="price-low">Prix croissant</option>
                <option value="price-high">Prix décroissant</option>
              </select>
            </div>

            {/* Properties Grid/List */}
            {filteredProperties.length > 0 ? (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  : "space-y-6"
              }>
                {filteredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    layout={viewMode}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Aucun bien trouvé
                </h3>
                <p className="text-gray-600 mb-6">
                  Essayez de modifier vos critères de recherche pour voir plus de résultats.
                </p>
                <button
                  onClick={clearFilters}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}

            {/* Pagination would go here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;