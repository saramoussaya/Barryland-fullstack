import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, Heart, Share2, Camera, Bed, Bath, Square, 
  Calendar, ChevronLeft, ChevronRight, Check, Briefcase, AlertCircle
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import SimilarProperties from '../components/SimilarProperties';
import { useProperty } from '../contexts/PropertyContext';
import { useToast } from '../contexts/ToastContext';

const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { properties, toggleFavorite, favorites, loading } = useProperty();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { showToast } = useToast();
  // contact form state in sidebar
  const [contactEmail, setContactEmail] = useState('');

  // Split name into first/last for the new form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Accept either p.id or p._id to be resilient to backend id shapes
  const property = properties.find(p => String((p as any).id || (p as any)._id) === String(id));

  // Message starts empty so the user fills it manually

  // Normalize images and location to safe string arrays/labels
  const imagesArr: string[] = property && Array.isArray(property.images)
    ? property.images.map((img: any) => (typeof img === 'string' ? img : (img?.url || ''))).filter(Boolean)
    : [];
  const imagesCount = imagesArr.length;
  // ensure current image index is within bounds
  const currentImgIndex = imagesCount > 0 ? Math.min(Math.max(0, currentImageIndex), imagesArr.length - 1) : 0;
  const locationLabel = property
    ? (typeof property.location === 'string' ? property.location : (property.location?.address || property.location?.city || ''))
    : '';

  const renderStatusInfo = () => {
    if (!property) return null;
    if (property.status === 'rejetee' && property.moderationInfo?.rejectionReason) {
      return (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Annonce rejetée</h3>
              <p className="mt-2 text-sm text-red-700">{property.moderationInfo.rejectionReason}</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Bien non trouvé</h2>
          <p className="text-gray-600 mb-6">Le bien que vous recherchez n'existe pas.</p>
          <Link to="/search" className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors">
            Retour à la recherche
          </Link>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === imagesArr.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? Math.max(imagesArr.length - 1, 0) : prev - 1
    );
  };

  const renderProfessionalInfo = () => {
    if (property.publisherType === 'professionnel' && property.professionalInfo) {
      return (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Briefcase className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-900">
                {property.professionalInfo.agencyName}
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                {property.professionalInfo.agencyAddress}
              </p>
              <p className="mt-2 text-sm text-blue-700">
                Tél: {property.professionalInfo.professionalPhone}
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Inline contact form submission handler will be defined in the form onSubmit

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link to="/" className="hover:text-emerald-600 transition-colors">Accueil</Link>
            <span>/</span>
            <Link to="/search" className="hover:text-emerald-600 transition-colors">Recherche</Link>
            <span>/</span>
            <span className="text-gray-900">{property.title}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="relative mb-8">
              <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                {imagesCount > 0 ? (
                  <img
                    src={imagesArr[currentImgIndex]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">Pas d'image disponible</div>
                )}
                
                {/* Navigation Arrows */}
                {imagesCount > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full flex items-center space-x-1">
                  <Camera className="h-4 w-4" />
                  <span className="text-sm">
                    {currentImageIndex + 1} / {imagesCount}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button
                    onClick={async () => {
                      try {
                        const pid = (property.id || property._id || String(property._id || '')) as string;
                        await toggleFavorite(pid);
                      } catch (e) {
                        // toggleFavorite handles toasts/errors; swallow here
                      }
                    }}
                    disabled={loading}
                    aria-pressed={Boolean(property.isFavorite || favorites.some(f => (f.id || f._id) === (property.id || property._id)))}
                    className={`p-2 rounded-full transition-all ${
                      (property.isFavorite || favorites.some(f => (f.id || f._id) === (property.id || property._id)))
                        ? 'bg-red-500 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Heart className="h-5 w-5" fill={(property.isFavorite || favorites.some(f => (f.id || f._id) === (property.id || property._id))) ? 'currentColor' : 'none'} />
                  </button>
                  <button className="bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Thumbnail Strip */}
              {imagesCount > 1 && (
                <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
                  {imagesArr.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentImageIndex 
                          ? 'border-emerald-500' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${property.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-5 w-5 mr-2" />
                      <span>{locationLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={property.status} />
                      {property.publisherType === 'professionnel' && (
                        <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          <span>Pro</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {renderStatusInfo()}
                  {renderProfessionalInfo()}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-emerald-600 mb-1">
                    {formatPrice(property.price)}
                  </div>
                  <div className="text-sm text-gray-500 capitalize">
                    {property.type}
                  </div>
                </div>
              </div>

              {/* Property Features */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-gray-200">
                <div className="flex items-center space-x-2">
                  <Bed className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">{property.bedrooms} chambres</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Bath className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">{property.bathrooms} salles de bain</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Square className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">{property.area} m²</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">
                    {new Date(property.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-700 leading-relaxed">{property.description}</p>
              </div>

              {/* Features */}
              {property.features && property.features.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Caractéristiques</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {property.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="h-5 w-5 text-emerald-600" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Map Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Localisation</h2>
                  <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <MapPin className="h-8 w-8 mx-auto mb-2" />
                  <p>Carte interactive</p>
                  <p className="text-sm">{locationLabel}</p>
                </div>
              </div>
            </div>
            {/* Similar properties */}
            <SimilarProperties propertyId={id} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              {/* Agency / owner name with icon */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Annonce par</div>
                  <div className="font-medium text-gray-900">
                    {property.professionalInfo?.agencyName || (
                      typeof property.owner === 'string'
                        ? property.owner
                        : ((property.owner as any)?.name || (property.owner as any)?.email || (property.owner as any)?.phone || 'Particulier')
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2.2a2 2 0 011.8 1.1l.9 1.8a2 2 0 01-.5 2.2L7.6 10.4a16 16 0 006 6l1.7-1.2a2 2 0 012.2-.5l1.8.9A2 2 0 0121 18.8V21a2 2 0 01-2 2H19c-9.4 0-17-7.6-17-17V5z" />
                  </svg>
                </div>
                <div className="text-sm text-gray-900 font-medium">
                  {property.contact?.phone ? (
                    <a href={`tel:${property.contact.phone}`} className="hover:underline">{property.contact.phone}</a>
                  ) : (
                    'Numéro non disponible'
                  )}
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                // simple client-side validation
                const newErrors: any = {};
                if (!firstName || !String(firstName).trim()) newErrors.firstName = 'Entrez votre prénom';
                if (!lastName || !String(lastName).trim()) newErrors.lastName = 'Entrez votre nom de famille';
                const emailVal = contactEmail || '';
                const emailOk = /\S+@\S+\.\S+/.test(emailVal);
                if (!emailVal || !emailOk) newErrors.email = 'Entrez une adresse email valide';
                const phoneDigits = (contactPhone || '').toString().replace(/[^0-9]/g, '');
                if (!phoneDigits || phoneDigits.length < 7) newErrors.phone = 'Saisissez un numéro de téléphone';
                setFormErrors(newErrors);
                if (Object.keys(newErrors).length > 0) return;

                try {
                  // TODO: call backend API to send message
                  showToast('Message envoyé à l\'agence', 'success');
                  // clear message field only
                  setMessage('');
                } catch (err) {
                  try { showToast('Erreur lors de l\'envoi du message', 'error'); } catch(e) { void e; }
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${formErrors.firstName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-emerald-500`}
                    placeholder="Prénom"
                  />
                  {formErrors.firstName && <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de famille *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${formErrors.lastName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-emerald-500`}
                    placeholder="Nom de famille"
                  />
                  {formErrors.lastName && <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-emerald-500`}
                    placeholder="Email"
                  />
                  {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-emerald-500`}
                    placeholder="Téléphone"
                  />
                  {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
                </div>

                {/* Owner checkbox removed as requested */}

                <div>
                  <button type="button" onClick={() => setShowMessage(!showMessage)} className="text-sm text-gray-700 underline">Ajouter un message</button>
                </div>

                {showMessage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                  </div>
                )}

                <div>
                  <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-full font-semibold hover:bg-red-700 transition-colors">Contacter l'agence</button>
                </div>

                {/* Owner phone removed from bottom as requested */}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Contact modal removed; inline sidebar contact form used instead */}
    </div>
  );
};

export default PropertyDetailPage;