export interface Property {
  _id?: string;
  id: string;
  title: string;
  description: string;
  type: 'vente' | 'location';
  category: 'maison' | 'appartement' | 'villa' | 'terrain' | 'bureau' | 'commerce';
  price: number;
  // location can be a simple string or an object returned by backend
  location: string | {
    address?: string;
    city?: string;
    region?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    }
  };
  area: number;
  bedrooms: number;
  bathrooms: number;
  images: Array<string | { url?: string; publicId?: string; caption?: string; isPrimary?: boolean }>;
  features?: string[];
  owner: string;
  publisherType: 'particulier' | 'professionnel';
  professionalInfo?: {
    agencyName: string;
    professionalPhone: string;
    agencyAddress: string;
  };
  status: 'en_attente' | 'validee' | 'rejetee' | 'active' | 'inactive' | 'sold' | 'rented';
  propertyStatus?: 'en_attente' | 'validee' | 'rejetee';
  contact: {
    phone: string;
    email: string;
  };
  moderationInfo?: {
    moderatedBy: string;
    moderatedAt: string;
    rejectionReason?: string;
    moderationNotes?: string;
  };
  createdAt: string;
  updatedAt: string;
  // number of users who favorited this property (optional)
  favorites?: number;
  // whether the current authenticated user favorited this property
  isFavorite?: boolean;
}

export type PropertyStatus = 'en_attente' | 'validee' | 'rejetee';

export interface SimilarProperty {
  _id: string;
  title: string;
  image?: string | null;
  mainImage?: string | null;
  price: number;
  propertyType?: string;
  bedrooms?: number;
  area?: number;
  city?: string | null;
  address?: string | null;
}

export interface FeaturedProperty {
  _id: string;
  title: string;
  price: number;
  propertyType?: string;
  city?: string | null;
  mainImage?: string | null;
  createdAt?: string;
  type?: string | null;
  rooms?: number | null;
  surface?: number | null;
  description?: string;
  isFavorite?: boolean;
  imagesCount?: number;
}