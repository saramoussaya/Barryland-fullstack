import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const useLogout = () => {
  const navigate = useNavigate();
  const { logout: contextLogout } = useAuth();

  const handleLogout = () => {
    contextLogout();
    navigate('/auth', { replace: true });
  };

  return handleLogout;
};
