import React, { useState, useEffect } from 'react';

interface Stats {
  totalUsers: number;
  totalProperties: number;
  activeListings: number;
  totalSales: number;
  recentActivity: {
    _id: string;
    type: string;
    description: string;
    date: string;
  }[];
}

const AdminStats: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProperties: 0,
    activeListings: 0,
    totalSales: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Tableau de bord</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Utilisateurs totaux</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Propriétés totales</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalProperties}</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Annonces actives</div>
          <div className="text-3xl font-bold text-gray-900">{stats.activeListings}</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Ventes totales</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalSales}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Activité récente</h3>
        <div className="space-y-4">
          {stats.recentActivity.map((activity) => (
            <div key={activity._id} className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className={`w-3 h-3 rounded-full mt-2 ${
                  activity.type === 'property' ? 'bg-blue-500' : 'bg-green-500'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
