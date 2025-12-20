import React, { useEffect, useState } from 'react';
import apiClient from '../../utils/apiClient';
import { useLocation, useNavigate } from 'react-router-dom';

type HistoryLog = {
  _id: string;
  userId?: string;
  userEmail?: string;
  actionType: string;
  actionDetails?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
};

const AdminHistory: React.FC = () => {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchLogs = async (p = 1) => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/history', { params: { page: p, limit: 25 } });
      if (res?.data?.success) {
        setLogs(res.data.data.logs || []);
        setPage(res.data.data.pagination.currentPage || p);
        setTotalPages(res.data.data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Erreur fetching history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section>
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Historiques</h2>
        <div className="text-sm text-gray-600">{logs.length} entrées affichées</div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Utilisateur</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">Détails</th>
              <th className="px-4 py-2 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-4">Chargement...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="p-4">Aucun historique trouvé</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log._id} className="border-t">
                  <td className="px-4 py-3">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3">{log.userEmail || log.userId || '—'}</td>
                  <td className="px-4 py-3 font-medium">{log.actionType}</td>
                  <td className="px-4 py-3"><pre className="whitespace-pre-wrap max-h-28 overflow-auto text-xs">{JSON.stringify(log.actionDetails || {}, null, 2)}</pre></td>
                  <td className="px-4 py-3">{log.ipAddress || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">Page {page} / {totalPages}</div>
        <div className="space-x-2">
          <button disabled={page <= 1} onClick={() => { const p = Math.max(1, page-1); fetchLogs(p); navigate({ pathname: location.pathname, search: `?page=${p}` }); }} className="px-3 py-1 bg-gray-200 rounded">Préc</button>
          <button disabled={page >= totalPages} onClick={() => { const p = Math.min(totalPages, page+1); fetchLogs(p); navigate({ pathname: location.pathname, search: `?page=${p}` }); }} className="px-3 py-1 bg-gray-200 rounded">Suiv</button>
        </div>
      </div>
    </section>
  );
};

export default AdminHistory;
