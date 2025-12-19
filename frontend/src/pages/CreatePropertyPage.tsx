import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyForm from '../components/PropertyForm';
import { useAuth } from '../contexts/AuthContext';

const CreatePropertyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Rediriger si l'utilisateur n'est pas connecté
  React.useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/create-property' } });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Déposer une annonce</h1>
        <div className="bg-white rounded-lg shadow-md">
          <PropertyForm onClose={() => navigate('/dashboard')} />
        </div>
      </div>
    </div>
  );
};

export default CreatePropertyPage;
