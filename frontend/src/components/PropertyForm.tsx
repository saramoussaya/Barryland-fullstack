import React, { useEffect, useRef, useState } from 'react';
import { X, Upload, Plus, Minus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/authService';
import { useProperty } from '../contexts/PropertyContext';
import { useToast } from '../contexts/ToastContext';

interface PropertyFormProps {
  onClose: () => void;
  initialData?: any; // Partial property for edit mode
}

interface FormErrors {
  title?: string;
  description?: string;
  price?: string;
  location?: string;
  area?: string;
  images?: string;
  submit?: string;
  [key: string]: string | undefined;
}

interface FormData {
  title: string;
  description: string;
  type: 'vente' | 'location';
  category: 'maison' | 'appartement' | 'villa' | 'terrain' | 'bureau' | 'commerce';
  price: string;
  location: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  features: string[];
  images: string[];
  files?: File[];
}

const PropertyForm: React.FC<PropertyFormProps> = ({ onClose, initialData }) => {
  const { user } = useAuth();
  const { addProperty, updateProperty } = useProperty();
  const { showToast } = useToast();
  const userId = user ? (user.id || (user as any)._id || user.email || `${user.firstName} ${user.lastName}`) : undefined;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    type: 'vente',
    category: 'maison',
    price: '',
    location: '',
    area: '',
    bedrooms: '1',
    bathrooms: '1',
    features: [''],
    images: [],
    files: []
  });

  // If initialData is provided, populate the form (edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        title: initialData.title || prev.title,
        description: initialData.description || prev.description,
        type: initialData.type || prev.type,
        category: initialData.category || prev.category,
        price: initialData.price ? String(initialData.price) : prev.price,
        location: typeof initialData.location === 'string' ? initialData.location : (initialData.location?.address || initialData.location?.city || prev.location),
        area: initialData.area ? String(initialData.area) : prev.area,
        bedrooms: initialData.bedrooms ? String(initialData.bedrooms) : prev.bedrooms,
        bathrooms: initialData.bathrooms ? String(initialData.bathrooms) : prev.bathrooms,
        features: initialData.features && initialData.features.length ? initialData.features : prev.features,
        images: Array.isArray(initialData.images) ? initialData.images.map((i: any) => (typeof i === 'string' ? i : i.url || '')) : prev.images
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const [errors, setErrors] = useState<FormErrors>({});

  const cities = [
    'Conakry', 'Kankan', 'Labé', 'Nzérékoré', 'Kindia', 'Mamou', 
    'Boké', 'Faranah', 'Siguiri', 'Guéckédou'
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData((prev) => ({
      ...prev,
      features: newFeatures,
    }));
  };

  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, ''],
    }));
  };

  const removeFeature = (index: number) => {
    if (formData.features.length > 1) {
      setFormData((prev) => ({
        ...prev,
        features: prev.features.filter((_, i) => i !== index),
      }));
    }
  };

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 10 - (formData.images?.length || 0);
    const fileArray = Array.from(files).slice(0, remaining);

    const createdUrls: string[] = fileArray.map((file) => URL.createObjectURL(file));

    // Track created object URLs for cleanup
    createdObjectUrlsRef.current.push(...createdUrls);

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...createdUrls].slice(0, 10), // Max 10 images
      files: [...(prev.files || []), ...fileArray].slice(0, 10)
    }));
  };

  // Keep a ref of created object URLs so we can revoke them on removal/unmount
  const createdObjectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      // Revoke all created object URLs when component unmounts
      createdObjectUrlsRef.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
      });
      createdObjectUrlsRef.current = [];
    };
  }, []);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Le titre doit contenir au moins 10 caractères';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    } else if (formData.description.length < 50) {
      newErrors.description = 'La description doit contenir au moins 50 caractères';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Le prix est requis';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Le prix doit être un nombre positif';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'La localisation est requise';
    }

    if (!formData.area.trim()) {
      newErrors.area = 'La surface est requise';
    } else if (isNaN(Number(formData.area)) || Number(formData.area) <= 0) {
      newErrors.area = 'La surface doit être un nombre positif';
    }

    // Ensure at least one permanent image URL or files to upload exist
    const hasPermanentImage = formData.images.some(i => typeof i === 'string' && i.trim() !== '' && !i.startsWith('blob:'));
    const hasFilesToUpload = formData.files && formData.files.length > 0;
    if (!hasPermanentImage && !hasFilesToUpload) {
      newErrors.images = 'Au moins une image permanente ou un fichier à uploader est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // If there are files to upload, upload them first
      let uploadedImages: Array<{ url: string; publicId?: string }> = [];

      if (formData.files && formData.files.length > 0) {
        const fd = new FormData();
        formData.files.forEach((file) => fd.append('images', file));

        const uploadResp = await apiClient.post('/upload/property-images', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent: ProgressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          }
        } as any);

        if (uploadResp && uploadResp.data && uploadResp.data.data && uploadResp.data.data.images) {
          uploadedImages = uploadResp.data.data.images;
        }
      }

      // Compute region mapping client-side to avoid missing region validation on server
      const cityToRegion: Record<string, string> = {
        'Conakry': 'Conakry',
        'Kankan': 'Haute-Guinée',
        'Siguiri': 'Haute-Guinée',
        'Kouroussa': 'Haute-Guinée',
        'Labé': 'Moyenne-Guinée',
        'Pita': 'Moyenne-Guinée',
        'Mamou': 'Moyenne-Guinée',
        'Nzérékoré': 'Guinée-Forestière',
        'Guéckédou': 'Guinée-Forestière',
        'Kissidougou': 'Guinée-Forestière',
        'Boké': 'Basse-Guinée',
        'Kindia': 'Basse-Guinée',
        'Télimélé': 'Basse-Guinée'
      };

      const region = cityToRegion[formData.location] || 'Conakry';

      const propertyData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        // also send server field names to be robust
        transactionType: formData.type,
        category: formData.category,
        propertyType: formData.category,
        price: Number(formData.price),
        location: { city: formData.location, address: formData.location, region },
        area: Number(formData.area),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        features: formData.features.filter(f => f.trim() !== ''),
        // include uploaded images and keep existing remote image URLs from the form
        images: [
          ...uploadedImages.map(img => ({ url: img.url, publicId: img.publicId })),
          ...formData.images
            .filter((i: any) => typeof i === 'string' && i.trim() !== '' && !i.startsWith('blob:'))
            .map((url: string) => ({ url }))
        ],
        publisherType: user?.role === 'admin' ? 'professionnel' : 'particulier',
        status: 'pending' as const
      };

      let created = null;
      if ((initialData as any)?.id || (initialData as any)?._id) {
        // Edit mode -> PUT
        const id = (initialData as any).id || (initialData as any)._id;
        const resp = await apiClient.put(`/properties/${id}`, propertyData);
        created = resp?.data?.data?.property || resp?.data?.data || resp?.data;
      } else {
        const resp = await apiClient.post('/properties', propertyData);
        created = resp?.data?.data?.property || resp?.data?.data;
      }
      // If backend returned the full property, add it to context for immediate UI update
      if (created) {
        // ensure owner is set so dashboard can match owner's properties
        if (!created.owner && user) {
          (created as any).owner = userId;
        }
        // If in edit mode, update context, otherwise add
        if ((initialData as any)?.id || (initialData as any)?._id) {
          const id = (initialData as any).id || (initialData as any)._id;
          await updateProperty(id, created);
        } else {
          addProperty(created);
        }
      } else {
        // fallback: add minimal data
        addProperty({
          title: propertyData.title,
          description: propertyData.description,
          images: propertyData.images?.map((i: any) => i.url || i) || [],
          price: propertyData.price || 0,
          location: propertyData.location?.address || propertyData.location || '',
          area: propertyData.area || 0,
          bedrooms: propertyData.bedrooms || 0,
          bathrooms: propertyData.bathrooms || 0,
          publisherType: propertyData.publisherType || 'particulier',
          status: 'en_attente',
          owner: userId || 'Vous'
        } as any);
      }

  // Notify user and close
  showToast(initialData ? 'Votre annonce a été mise à jour' : 'Votre annonce a été publiée et est en cours de vérification', 'success', 6000);
      onClose();
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'annonce:', error);
      // If server returned field errors (express-validator or Mongoose), map them to fields
      const resp = error?.response?.data;
      if (resp) {
        // express-validator returns errors: [{ msg, param, ... }]
        if (Array.isArray(resp.errors)) {
          const newErrors: any = {};
          resp.errors.forEach((er: any) => {
            const field = er.param || er.field || 'submit';
            newErrors[field] = er.msg || er.message || JSON.stringify(er);
          });
          setErrors(prev => ({ ...prev, ...newErrors }));
          try { showToast(resp.message || 'Données invalides', 'error', 6000); } catch (e) { /* ignore */ }
          return;
        }

        // Mongoose validation error
        if (resp.errors && typeof resp.errors === 'object') {
          const newErrors: any = {};
          Object.keys(resp.errors).forEach(key => {
            const e = resp.errors[key];
            newErrors[key] = e.message || String(e);
          });
          setErrors(prev => ({ ...prev, ...newErrors }));
          try { showToast(resp.message || 'Erreur de validation', 'error', 6000); } catch (e) { /* ignore */ }
          return;
        }

        // Generic server message
        const serverMsg = resp.message || resp.error || JSON.stringify(resp);
        setErrors(prev => ({ ...prev, submit: serverMsg }));
        try { showToast(serverMsg, 'error', 6000); } catch (e) { /* ignore */ }
        return;
      }

      const fallback = error?.message || 'Erreur lors de la création de l\'annonce';
      setErrors(prev => ({ ...prev, submit: fallback }));
      try { showToast(fallback, 'error', 6000); } catch (e) { /* ignore */ }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
  <h2 className="text-2xl font-bold text-gray-900">Déposer une annonce</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Titre de l'annonce *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ex: Villa moderne 4 chambres avec piscine"
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Décrivez votre bien en détail..."
          />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
        </div>

        {/* Type and Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type de transaction *
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="vente">Vente</option>
              <option value="location">Location</option>
            </select>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="maison">Maison</option>
              <option value="appartement">Appartement</option>
              <option value="villa">Villa</option>
              <option value="terrain">Terrain</option>
              <option value="bureau">Bureau</option>
              <option value="commerce">Commerce</option>
            </select>
          </div>
        </div>

        {/* Price and Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Prix (GNF) *
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                errors.price ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: 50000000"
            />
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Localisation *
            </label>
            <select
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Sélectionnez une ville</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
          </div>
        </div>

        {/* Area, Bedrooms, Bathrooms */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
              Surface (m²) *
            </label>
            <input
              type="number"
              id="area"
              name="area"
              value={formData.area}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                errors.area ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: 150"
            />
            {errors.area && <p className="text-red-500 text-sm mt-1">{errors.area}</p>}
          </div>

          <div>
            <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">
              Chambres
            </label>
            <select
              id="bedrooms"
              name="bedrooms"
              value={formData.bedrooms}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={num} value={num.toString()}>{num}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">
              Salles de bain
            </label>
            <select
              id="bathrooms"
              name="bathrooms"
              value={formData.bathrooms}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={num} value={num.toString()}>{num}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Features */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Caractéristiques
          </label>
          {formData.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={feature}
                onChange={(e) => handleFeatureChange(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ex: Parking, Jardin, Piscine..."
              />
              {formData.features.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  className="text-red-600 hover:text-red-800 p-2"
                >
                  <Minus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addFeature}
            className="text-emerald-600 hover:text-emerald-700 flex items-center text-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter une caractéristique
          </button>
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos *
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-2">Glissez vos photos ici ou cliquez pour sélectionner</p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer inline-block"
            >
              Sélectionner des photos
            </label>
            <p className="text-xs text-gray-500 mt-2">Maximum 10 photos, formats acceptés: JPG, PNG</p>
          </div>
          
          {formData.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newImages = formData.images.filter((_, i) => i !== index);
                      // Revoke object URL if it is an object URL
                      const url = formData.images[index];
                      if (url && url.startsWith('blob:')) {
                        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
                      }

                      // Remove corresponding file from files array if present
                      const newFiles = (formData.files || []).filter((_, i) => i !== index);

                      setFormData(prev => ({ ...prev, images: newImages, files: newFiles }));
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Upload progress */}
          {uploadProgress !== null && (
            <div className="mt-2 text-sm text-gray-600">Upload images: {uploadProgress}%</div>
          )}
          {errors.images && <p className="text-red-500 text-sm mt-1">{errors.images}</p>}
        </div>

        {/* Submit Button */}
        <div className="flex space-x-4 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 bg-emerald-600 text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-emerald-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                En cours...
              </>
            ) : (
              "Publier l'annonce"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PropertyForm;