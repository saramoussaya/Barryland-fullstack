import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { useToast } from '../contexts/ToastContext';

type User = {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role?: string;
  isActive?: boolean;
};

const UserFormModal: React.FC<{ initialUser?: User | null; onClose: () => void }> = ({ initialUser = null, onClose }) => {
  const [form, setForm] = useState<User>({ firstName: '', lastName: '', email: '', phone: '', role: 'particular', isActive: true });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  useEffect(() => {
    if (initialUser) setForm({ ...initialUser });
  }, [initialUser]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName || form.firstName.trim().length < 2) e.firstName = 'Prénom trop court';
    if (!form.lastName || form.lastName.trim().length < 2) e.lastName = 'Nom trop court';
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Email invalide';
    if (!form.phone || !/^\+224[0-9]{8,9}$/.test(form.phone)) e.phone = 'Téléphone invalide (+224...)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (initialUser && initialUser._id) {
        const res = await apiClient.put(`/admin/users/${initialUser._id}`, form);
        if (res.data.success) {
          toast.showToast('Utilisateur mis à jour', 'success');
          onClose();
        } else {
          toast.showToast(res.data.message || 'Erreur', 'error');
        }
      } else {
        const res = await apiClient.post('/admin/users', form);
        if (res.data.success) {
          toast.showToast('Utilisateur créé', 'success');
          onClose();
        } else {
          toast.showToast(res.data.message || 'Erreur', 'error');
        }
      }
    } catch (err: any) {
      console.error('user form submit error', err);
      toast.showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg mx-4">
        <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">{initialUser ? 'Éditer utilisateur' : 'Créer utilisateur'}</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600">Prénom</label>
                <input name="firstName" value={form.firstName} onChange={onChange} className="input w-full" placeholder="Prénom" required />
                {errors.firstName && <div className="text-xs text-red-600">{errors.firstName}</div>}
              </div>
              <div>
                <label className="block text-sm text-gray-600">Nom</label>
                <input name="lastName" value={form.lastName} onChange={onChange} className="input w-full" placeholder="Nom" required />
                {errors.lastName && <div className="text-xs text-red-600">{errors.lastName}</div>}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Email</label>
              <input name="email" value={form.email} onChange={onChange} className="input w-full" placeholder="Email" type="email" required />
              {errors.email && <div className="text-xs text-red-600">{errors.email}</div>}
            </div>
            <div>
              <label className="block text-sm text-gray-600">Téléphone</label>
              <input name="phone" value={form.phone} onChange={onChange} className="input w-full" placeholder="Téléphone (+224...)" required />
              {errors.phone && <div className="text-xs text-red-600">{errors.phone}</div>}
            </div>
            <div className="flex gap-2 items-center">
              <label className="block text-sm text-gray-600">Rôle</label>
              <select name="role" value={form.role} onChange={onChange} className="input">
                <option value="particular">Particulier</option>
                <option value="professional">Professionnel</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
          </div>
          <div className="p-4 flex justify-end gap-2">
            <button type="button" className="px-4 py-2 rounded border" onClick={onClose}>Annuler</button>
            <button type="submit" disabled={saving} className={`px-4 py-2 rounded ${saving ? 'bg-gray-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
