import React, { useEffect, useState } from 'react';
import apiClient from '../../utils/apiClient';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal, UserFormModal } from '../../components';
import Pagination from '../../components/Pagination';
import { EditIcon, TrashIcon, LockIcon, UserIcon } from '../../components/Icons';

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(4);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();

  const fetchUsers = async (p = page) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.get('/admin/users', { params: { page: p, limit, search } });
      if (res.data.success) {
        setUsers(res.data.data.users || []);
        setTotalPages(res.data.data.pagination.totalPages || 1);
        setPage(res.data.data.pagination.currentPage || p);
      } else {
        const m = res.data.message || 'Erreur récupération utilisateurs';
        setErrorMessage(m);
        toast.showToast(m, 'error');
      }
    } catch (err: any) {
      console.error('fetchUsers error', err);
      const m = err?.response?.data?.message || 'Erreur lors de la récupération des utilisateurs';
      setErrorMessage(m);
      toast.showToast(m, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(1); }, []);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const onDelete = async () => {
    if (!selectedUser) return;
    try {
      const res = await apiClient.delete(`/admin/users/${selectedUser._id}`);
      if (res.data.success) {
        toast.showToast('Utilisateur supprimé', 'success');
        setShowDeleteModal(false);
        fetchUsers(1);
      } else {
        toast.showToast(res.data.message || 'Erreur suppression', 'error');
      }
    } catch (err: any) {
      console.error('delete user error', err);
      toast.showToast('Erreur lors de la suppression de l\'utilisateur', 'error');
    }
  };

  const toggleActive = async (user: User) => {
    try {
      const res = await apiClient.put(`/admin/users/${user._id}/status`, { isActive: !user.isActive });
      if (res.data.success) {
        toast.showToast(`Utilisateur ${!user.isActive ? 'activé' : 'désactivé'}`, 'success');
        fetchUsers(page);
      } else {
        toast.showToast(res.data.message || 'Erreur', 'error');
      }
    } catch (err: any) {
      console.error('toggleActive error', err);
      toast.showToast('Erreur lors de la modification du statut', 'error');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-gray-600 mt-1">Consultez, modérez et gérez les comptes utilisateurs.</p>
        </div>
        <div>
          <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:bg-emerald-700" onClick={() => { setSelectedUser(null); setShowFormModal(true); }}>Ajouter un utilisateur</button>
        </div>
      </div>

      <form onSubmit={onSearch} className="mb-4 flex gap-2 items-center">
        <input className="w-80 px-3 py-2 border rounded" placeholder="Rechercher par nom, email ou téléphone" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="px-3 py-2 rounded border" type="submit">Rechercher</button>
        <button type="button" className="px-3 py-2 rounded border" onClick={() => { setSearch(''); fetchUsers(1); }}>Réinitialiser</button>
      </form>

      {errorMessage && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <div className="flex items-center justify-between">
            <div>{errorMessage}</div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-white border rounded" onClick={() => fetchUsers(1)}>Réessayer</button>
              <button className="px-3 py-1 bg-white border rounded" onClick={() => { localStorage.removeItem('barrylandAuthToken'); window.location.reload(); }}>Se déconnecter</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <div className="w-full max-w-7xl bg-white rounded-lg shadow-md overflow-hidden border">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 border-b text-sm text-gray-600 font-medium">
            <div className="col-span-1 text-center">N°</div>
            <div className="col-span-2 text-center">Utilisateur</div>
            <div className="col-span-4 text-center">Email</div>
            <div className="col-span-2 text-center">Téléphone</div>
            <div className="col-span-1 text-center">Statut</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>
        <div>
              {loading ? (
            <div className="p-6 text-center text-gray-600">Chargement...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Aucun utilisateur trouvé.</div>
          ) : (
            users.map(u => (
              <div key={u._id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center border-b hover:bg-gray-50 transition-colors">
                <div className="col-span-1 text-center text-sm text-gray-700">{(page - 1) * limit + (users.indexOf(u) + 1)}</div>
                <div className="col-span-2 flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 drop-shadow-sm overflow-hidden">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleString() : ''}</div>
                  </div>
                </div>
                <div className="col-span-4 text-sm text-gray-700 truncate text-center">{u.email}</div>
                <div className="col-span-2 text-sm text-gray-700 text-center">{u.phone}</div>
                <div className="col-span-1 flex items-center justify-center">
                  {u.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Bloqué
                    </span>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  <div className="flex items-center space-x-2">
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded border hover:shadow-sm transition"
                      onClick={() => { setSelectedUser(u); setShowFormModal(true); }}
                      title="Éditer"
                      aria-label={`Éditer ${u.firstName} ${u.lastName}`}>
                      <EditIcon className="w-4 h-4 text-gray-600" />
                    </button>

                    <button
                      className="w-8 h-8 flex items-center justify-center rounded border hover:bg-gray-50 transition"
                      onClick={() => toggleActive(u)}
                      title={u.isActive ? 'Bloquer cet utilisateur' : 'Débloquer cet utilisateur'}
                      aria-label={u.isActive ? 'Bloquer' : 'Débloquer'}>
                      <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.657-1.567-3-3.5-3S5 9.343 5 11s1.567 3 3.5 3S12 12.657 12 11zM12 11v6"/></svg>
                    </button>

                    <button
                      className={u.role === 'admin' ? 'w-8 h-8 flex items-center justify-center rounded bg-gray-100 text-gray-400 border' : 'w-8 h-8 flex items-center justify-center rounded bg-red-600 text-white hover:bg-red-700 shadow-sm'}
                      onClick={() => { setSelectedUser(u); setShowDeleteModal(true); }}
                      disabled={u.role === 'admin'}
                      title={u.role === 'admin' ? 'Impossible de supprimer un administrateur' : `Supprimer ${u.firstName} ${u.lastName}`}
                      aria-label={`Supprimer ${u.firstName} ${u.lastName}`}>
                      {u.role === 'admin' ? <LockIcon className="w-4 h-4 text-gray-400" /> : <TrashIcon className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>

      <Pagination current={page} total={totalPages} onPageChange={(p) => { setPage(p); fetchUsers(p); }} />

      {selectedUser && (
        <ConfirmModal
          open={showDeleteModal}
          title="Confirmer la suppression"
          description={`Voulez-vous vraiment supprimer ${selectedUser.firstName} ${selectedUser.lastName} ? Cette action est irréversible.`}
          onConfirm={onDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {showFormModal && (
        <UserFormModal
          initialUser={selectedUser}
          onClose={() => { setShowFormModal(false); fetchUsers(1); }}
        />
      )}

    </div>
  );
}
