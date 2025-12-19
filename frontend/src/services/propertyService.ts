import apiClient from '../utils/apiClient';

interface PropertyData {
  title: string;
  description: string;
  transactionType: 'vente' | 'location';
  propertyType: 'maison' | 'appartement' | 'terrain' | 'bureau' | 'commerce' | 'autre';
  publisherType: 'particulier' | 'professionnel';
  professionalInfo?: {
    agencyName: string;
    professionalPhone: string;
    agencyAddress: string;
  };
  price: number;
  location: {
    address: string;
    city: string;
    region: string;
    coordinates?: [number, number];
  };
  features: {
    rooms?: number;
    bathrooms?: number;
    surface?: number;
    furnished?: boolean;
    parking?: boolean;
    garden?: boolean;
  };
  images: Array<{
    url: string;
    caption?: string;
  }>;
}

export const createProperty = async (propertyData: PropertyData) => {
  const response = await apiClient.post('/properties', propertyData);
  return response.data;
};

export const updateProperty = async (id: string, propertyData: Partial<PropertyData>) => {
  const response = await apiClient.put(`/properties/${id}`, propertyData);
  return response.data;
};

export const deleteProperty = async (id: string) => {
  const response = await apiClient.delete(`/properties/${id}`);
  return response.data;
};

export const getProperty = async (id: string) => {
  const response = await apiClient.get(`/properties/${id}`);
  return response.data;
};

export const getProperties = async (filters?: {
  transactionType?: string;
  propertyType?: string;
  publisherType?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
}) => {
  const response = await apiClient.get('/properties', { params: filters });
  return response.data;
};
