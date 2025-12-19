import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';
import { useProperty } from '../../contexts/PropertyContext';
import { useToast } from '../../contexts/ToastContext';
import { Property } from '../../types/Property';

type ModalState = {
  open: boolean;
  property?: Property | null;
  action?: 'approve' | 'reject' | null;
};

const AdminProperties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>({ open: false, property: null, action: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [featureOnApprove, setFeatureOnApprove] = useState(false);
  const { showToast } = useToast();
  const propertyCtx = useProperty();
  const { refreshProperties } = propertyCtx as any;

  useEffect(() => { fetchProperties(); /* eslint-disable-next-line */ }, [page, search]);

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.get(`/admin/properties?page=${page}&limit=${limit}&status=pending&search=${encodeURIComponent(search)}`);
      const data = resp?.data?.data;
      setProperties(data.properties || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (e: any) {
      console.error('Erreur chargement propriétés admin:', e);
      const status = e?.response?.status;
      if (status === 401) {
        setError('Accès non autorisé (401). Veuillez vous reconnecter en tant qu\'administrateur.');
      } else if (status === 403) {
        setError('Accès refusé (403). Votre compte n\'a pas les droits administrateur.');
      } else {
        setError('Erreur lors du chargement des propriétés. Vérifiez que le backend tourne et que vous êtes connecté.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openModal = (property: Property, action: 'approve' | 'reject') => {
    setRejectionReason('');
    setModal({ open: true, property, action });
  };

  const closeModal = () => setModal({ open: false, property: null, action: null });

  const submitModeration = async () => {
    if (!modal.property || !modal.action) return;
    setSubmitError(null);
    const id = modal.property._id || modal.property.id;
    const status = modal.action === 'approve' ? 'active' : 'rejected';

    if (modal.action === 'reject' && (!rejectionReason || rejectionReason.trim().length < 3)) {
      setSubmitError('Veuillez fournir une raison de rejet (au moins 3 caractères).');
      return;
    }

    setSubmitting(true);
    try {
      // Optimistic UI: remove item from list immediately so admin sees instant feedback
      setProperties(prev => prev.filter(p => (p._id || p.id) !== id));
      closeModal();
      setRejectionReason('');
      try { showToast(`Annonce ${status === 'active' ? 'approuvée' : 'rejetée'} avec succès`, 'success'); } catch(e) { void e; }
      // Fire the request but don't block UI
      apiClient.put(`/admin/properties/${id}/status`, { status, reason: rejectionReason, featured: modal.action === 'approve' ? featureOnApprove : undefined })
        .then(() => {
          // Refresh admin list and also refresh global properties so approved items become visible publicly
          fetchProperties();
          try { if (refreshProperties) refreshProperties().catch(() => {}); } catch (e) { /* ignore */ }
        })
        .catch((err) => {
          console.error('Erreur lors de la modération (background):', err);
          try { showToast('Erreur lors de la mise à jour (vérifiez les logs)', 'error'); } catch(e) { void e; }
          // Re-fetch to restore state
          fetchProperties();
        });
    } catch (e: any) {
      console.error('Erreur lors de la modération:', e);
      setSubmitError(e?.response?.data?.message || 'Erreur lors de la modération');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Modération des annonces</h2>
        <div className="flex items-center gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Recherche..." className="border px-3 py-2 rounded" />
          <button onClick={() => fetchProperties()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Rechercher</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">{loading ? 'Chargement des annonces en attente...' : `${properties.length} annonces trouvées`}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setPage(1); fetchProperties(); }} className="px-3 py-1 border rounded bg-white hover:bg-gray-50">Rafraîchir</button>
          </div>
        </div>

        {error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-2">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ) : properties.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p className="text-lg font-medium">Aucune annonce en attente</p>
            <p className="mt-2">Vérifiez le flux de création ou rafraîchissez la page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propriétaire</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {properties.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap max-w-xs truncate">{p.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{(p as any).owner?.name || (p as any).owner?.email || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(p.createdAt || '').toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-4">
                      <button onClick={() => openModal(p, 'approve')} className="text-white bg-green-600 px-3 py-1 rounded hover:bg-green-700">Approuver</button>
                      <button onClick={() => openModal(p, 'reject')} className="text-white bg-red-600 px-3 py-1 rounded hover:bg-red-700">Rejeter</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div>Page {page} / {totalPages}</div>
        <div className="space-x-2">
          <button onClick={() => setPage(Math.max(1, page-1))} className="px-3 py-1 border rounded">Préc</button>
          <button onClick={() => setPage(Math.min(totalPages, page+1))} className="px-3 py-1 border rounded">Suiv</button>
        </div>
      </div>

      {/* Modal */}
      {modal.open && modal.property && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold">{modal.action === 'approve' ? 'Approuver l\'annonce' : 'Rejeter l\'annonce'}</h3>
            <p className="mt-2">{modal.property.title}</p>

            {modal.action === 'reject' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Raison du rejet (obligatoire)</label>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="mt-1 block w-full border rounded p-2" rows={4} />
                {submitError && <div className="mt-2 text-sm text-red-600">{submitError}</div>}
              </div>
            )}
            {modal.action === 'approve' && (
              <div className="mt-4 flex items-center gap-3">
                <input type="checkbox" id="feature" checked={featureOnApprove} onChange={e => setFeatureOnApprove(e.target.checked)} />
                <label htmlFor="feature" className="text-sm">Mettre en vedette (affichée dans les biens en vedette)</label>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 border rounded">Annuler</button>
              <button onClick={submitModeration} disabled={submitting} className={`px-4 py-2 ${submitting ? 'bg-gray-400' : 'bg-emerald-600'} text-white rounded`}>
                {submitting ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProperties;
