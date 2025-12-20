import React, { useEffect, useState } from 'react';
import apiClient from '../../utils/apiClient';

type Activity = {
  _id: string;
  userId: string;
  userEmail?: string;
  userRole?: string;
  actionType: string;
  actionDescription?: string;
  targetEntity?: string;
  targetId?: string;
  timestamp: string;
};

const ActivityLog: React.FC = () => {
  const [items, setItems] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchPage = async (p = 1) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/activity-log', { params: { page: p, limit: 25 } });
      if (res?.data?.success) {
        setItems(res.data.data.logs || []);
        setPage(res.data.data.pagination.currentPage || p);
        setTotalPages(res.data.data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Erreur fetching activity log', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  return (
    <section>
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Journal des Activités</h2>
        <div className="text-sm text-gray-600">{items.length} entrées affichées</div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Utilisateur</th>
              <th className="px-4 py-2 text-left">Rôle</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-left">Cible</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4">Chargement...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="p-4">Aucune activité trouvée</td></tr>
            ) : (
              items.map(a => (
                <tr key={a._id} className="border-t">
                  <td className="px-4 py-3">{new Date(a.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3">{a.userEmail || a.userId}</td>
                  <td className="px-4 py-3">{a.userRole || '—'}</td>
                  <td className="px-4 py-3 font-medium">{a.actionType}</td>
                  <td className="px-4 py-3"><div className="text-xs text-gray-700 max-w-md break-words">{a.actionDescription || '—'}</div></td>
                  <td className="px-4 py-3">{a.targetEntity || '—'} {a.targetId ? `(${a.targetId})` : ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">Page {page} / {totalPages}</div>
        <div className="space-x-2">
          <button disabled={page <= 1} onClick={() => fetchPage(Math.max(1, page-1))} className="px-3 py-1 bg-gray-200 rounded">Préc</button>
          <button disabled={page >= totalPages} onClick={() => fetchPage(Math.min(totalPages, page+1))} className="px-3 py-1 bg-gray-200 rounded">Suiv</button>
        </div>
      </div>
    </section>
  );
};

export default ActivityLog;
