import React, { useEffect, useState } from 'react';
import messageService from '../services/messageService';
import { Link } from 'react-router-dom';

type PropertyRef = { _id?: string; title?: string } | string | null;

type Msg = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  property?: PropertyRef;
  message: string;
  createdAt?: string;
  status: 'nouveau' | 'lu' | 'traite' | string;
};

const StatusBadge: React.FC<{ status: Msg['status'] }> = ({ status }) => {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border';
  switch (status) {
    case 'nouveau':
      return <span className={`${base} bg-amber-100 text-amber-800 border-amber-300`}>Nouveau</span>;
    case 'lu':
      return <span className={`${base} bg-slate-100 text-slate-800 border-slate-200`}>Lu</span>;
    case 'traite':
      return <span className={`${base} bg-emerald-100 text-emerald-800 border-emerald-300`}>Traité</span>;
    default:
      return <span className={`${base} bg-gray-100 text-gray-800 border-gray-200`}>{status}</span>;
  }
};

const MessageCard: React.FC<{ m: Msg; onOpen: (m: Msg) => void }> = ({ m, onOpen }) => {
  const unread = m.status === 'nouveau';
  const propertyTitle = typeof m.property === 'string' ? m.property : m.property?.title || '';
  const propertyId = ((): string | null => {
    if (!m.property) return null;
    if (typeof m.property === 'string') return /^[0-9a-fA-F]{24}$/.test(m.property) ? m.property : null;
    return m.property._id ? String(m.property._id) : null;
  })();
  return (
    <article
      onClick={() => onOpen(m)}
      className={`w-full bg-white rounded-lg shadow-sm border overflow-hidden cursor-pointer transition-shadow ${unread ? 'ring-1 ring-amber-200' : 'hover:shadow-md'}`}>
      <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="truncate">
              <div className="text-sm font-semibold text-slate-900 truncate">{m.firstName || ''} {m.lastName || ''}</div>
              <div className="text-xs text-gray-500 truncate">{m.email}{m.phone ? ` • ${m.phone}` : ''}</div>
            </div>
            <div className="text-xs text-gray-400">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</div>
          </div>

          <div className="mt-3">
            <div className="text-sm font-medium text-slate-800 truncate">
              {propertyId ? (
                <Link to={`/property/${propertyId}`} onClick={(e) => e.stopPropagation()} className="text-emerald-600 hover:underline">
                  {propertyTitle}
                </Link>
              ) : (
                <span>{propertyTitle}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed max-w-full break-words">{m.message}</p>
          </div>
        </div>

        <div className="w-full md:w-40 flex-shrink-0 flex flex-col items-end gap-3">
          <StatusBadge status={m.status} />
          <button onClick={(e) => { e.stopPropagation(); onOpen(m); }} className="text-sm px-3 py-2 bg-emerald-600 text-white rounded">Voir</button>
        </div>
      </div>
    </article>
  );
};

const Modal: React.FC<{ open: boolean; onClose: () => void; children?: React.ReactNode }> = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 z-10 overflow-auto max-h-[90vh]">
        {children}
      </div>
    </div>
  );
};

const UserMessages: React.FC = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [selected, setSelected] = useState<Msg | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const resp = await messageService.getMessages({ page, limit, status: filterStatus || undefined });
      setMessages(resp.data || []);
      setTotal(resp.total || 0);
      setAccessDenied(false);
    } catch (err) {
      console.error(err);
      // If backend returns 403, mark access denied so we show a clear message
      const status = (err as any)?.response?.status;
      if (status === 403) setAccessDenied(true);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, filterStatus]);

  const openDetail = async (m: Msg) => {
    try {
      const resp = await messageService.getMessage(m._id);
      setSelected(resp.data || m);
    } catch (err) { console.error(err); }
  };

  const changeStatus = async (id: string, status: Msg['status']) => {
    try {
      await messageService.updateMessage(id, { status });
      await load();
      if (selected && selected._id === id) setSelected(prev => prev ? { ...prev, status } : prev);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Messagerie</h2>
        <div className="flex items-center gap-3">
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2 border rounded bg-white text-sm">
            <option value="">Tous statuts</option>
            <option value="nouveau">Nouveau</option>
            <option value="lu">Lu</option>
            <option value="traite">Traité</option>
          </select>
          <button onClick={load} className="px-3 py-2 bg-emerald-600 text-white rounded text-sm">Actualiser</button>
        </div>
      </div>

      <div className="space-y-4">
        {accessDenied ? (
          <div className="py-8 text-center text-red-600">Accès refusé — vous n'êtes pas autorisé à voir ces messages.</div>
        ) : loading ? (
          <div className="py-8 text-center">Chargement...</div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-gray-500">Aucun message</div>
        ) : (
          messages.map(m => <MessageCard key={m._id} m={m} onOpen={openDetail} />)
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">{Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} sur {total}</div>
        <div className="flex gap-2">
          <button aria-label="Précédent" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-2 border rounded text-sm">Préc</button>
          <button aria-label="Suivant" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-2 border rounded text-sm">Suiv</button>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold">{selected.firstName} {selected.lastName}</h3>
                <div className="text-xs text-gray-500">{selected.email}{selected.phone ? ` • ${selected.phone}` : ''}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={selected.status} />
              </div>
            </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="text-sm text-gray-600">Bien: {(() => {
                const prop = selected.property;
                const title = typeof prop === 'string' ? prop : prop?.title || '';
                const id = (prop && typeof prop === 'string') ? (/^[0-9a-fA-F]{24}$/.test(prop) ? prop : null) : (prop?._id ? String(prop._id) : null);
                return id ? <Link to={`/property/${id}`} className="text-emerald-600 hover:underline">{title}</Link> : <span>{title}</span>;
              })()}</div>
              <div className="text-sm text-gray-600">Date: {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ''}</div>
              <div className="mt-3 p-4 bg-gray-50 rounded text-sm whitespace-pre-wrap">{selected.message}</div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={async () => { await changeStatus(selected._id, 'lu'); }} className="px-3 py-2 bg-emerald-600 text-white rounded">Marquer lu</button>
              <button onClick={async () => { await changeStatus(selected._id, 'traite'); }} className="px-3 py-2 bg-blue-600 text-white rounded">Marquer traité</button>
              <button onClick={() => setSelected(null)} className="px-3 py-2 border rounded">Fermer</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserMessages;
