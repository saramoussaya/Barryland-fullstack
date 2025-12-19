import { BrowserRouter as Router } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import PreventRefresh from './components/PreventRefresh';
import { AuthProvider } from './contexts/AuthContext';
import { PropertyProvider } from './contexts/PropertyContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppRoutes from './routes';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PropertyProvider>
          <NotificationProvider>
            <Router>
              <ScrollToTop />
              <PreventRefresh />
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header />
                <main className="flex-1">
                  <AppRoutes />
                </main>
                <Footer />
              </div>
            </Router>
          </NotificationProvider>
        </PropertyProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;