// Disable react-refresh warning about non-component exports in this file
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { Property } from '../types/Property';
import { apiClient } from '../services/authService';

interface PropertyContextType {
  properties: Property[];
  myProperties: Property[];
  favorites: Property[];
  loading: boolean;
  error: string | null;
  addProperty: (property: Partial<Property>) => Promise<void>;
  updateProperty: (id: string, property: Partial<Property>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<boolean>;
  fetchMyProperties: () => Promise<void>;
  fetchFavorites: () => Promise<Property[]>;
  refreshProperties: (filters?: any) => Promise<Property[]>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Start with an empty list; in development we previously seeded mockProperties which
  // could cause duplicate listings when server data is fetched. We'll load server data
  // on mount via refreshProperties so public pages reflect the DB.
  const [properties, setProperties] = useState<Property[]>([]);
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('barrylandLocalFavorites');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Helper to normalize backend property objects to the frontend Property shape
  const normalizeProperty = (p: any): Property => {
    const imagesArr: string[] = Array.isArray(p.images)
      ? p.images.map((img: any) => (typeof img === 'string' ? img : (img?.url || ''))).filter(Boolean)
      : [];

    const locAny: any = p.location;
    const locationLabel = typeof p.location === 'string'
      ? p.location
      : (locAny?.address || locAny?.city || (locAny?.city ? `${locAny.city}${locAny?.region ? ', ' + locAny.region : ''}` : '')) || '';

    const id = (p._id || p.id || String(Date.now())).toString();

    // Normalize transaction type: prefer explicit 'location' or 'vente'
    const rawType = (p.type || p.transactionType || p.propertyType || '').toString().toLowerCase();
    const normalizedType = rawType === 'location' || rawType.includes('loc') ? 'location' : 'vente';

    return {
      ...p,
      _id: p._id || p.id || id,
      id: p.id || p._id || id,
      images: imagesArr,
      type: (p.type || p.transactionType || p.propertyType) ? normalizedType : (p.type || 'vente'),
      location: locationLabel,
      // ensure createdAt exists for rendering
      createdAt: p.createdAt || new Date().toISOString(),
      // normalize status values
      status: (() => {
        const s = (p.status || p.propertyStatus || '').toString().toLowerCase();
        if (s === 'pending' || s === 'en_attente' || s === 'waiting') return 'en_attente';
        if (s === 'validee' || s === 'validated' || s === 'active' || s === 'active') return 'validee';
        if (s === 'rejetee' || s === 'rejected') return 'rejetee';
        return s || 'en_attente';
      })(),
    } as Property;
  };

  // Ensure favorites are loaded on provider mount so header counters reflect server state on refresh
  useEffect(() => {
    // fire-and-forget; fetchFavorites handles auth fallback
    // Call with skipAuthRedirect to avoid global interceptor redirecting unauthenticated visitors
    // (we want public home page to render without forcing a login page)
    // Defer to next tick to avoid calling a const-declared function before initialization (TDZ)
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchFavorites({ skipAuthRedirect: true }).catch(() => {});
      // Also refresh global properties from server to avoid mixing in local mock seeds
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      refreshProperties().catch(() => {});
    }, 0);
  }, []);

  // Local favorites storage helpers
  const LOCAL_FAV_KEY = 'barrylandLocalFavorites';

  const loadLocalFavoriteIds = (): string[] => {
    try {
      const raw = localStorage.getItem(LOCAL_FAV_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (e) {
      return [];
    }
  };

  const saveLocalFavoriteIds = (ids: string[]) => {
    try {
      const unique = Array.from(new Set(ids.map(String)));
      localStorage.setItem(LOCAL_FAV_KEY, JSON.stringify(unique));
      // keep in-memory copy in sync
      setPendingFavoriteIds(unique);
    } catch (e) { /* ignore */ }
  };

  const addLocalFavoriteId = (id: string) => {
    try {
      const ids = loadLocalFavoriteIds();
      if (!ids.includes(id)) {
        ids.unshift(id);
        saveLocalFavoriteIds(ids);
      }
    } catch (e) { /* ignore */ }
  };

  const removeLocalFavoriteId = (id: string) => {
    try {
      const ids = loadLocalFavoriteIds().filter(x => x !== id);
      saveLocalFavoriteIds(ids);
      setPendingFavoriteIds(ids);
    } catch (e) { /* ignore */ }
  };

  // Try to sync pending local favorites to server when a token is present
  useEffect(() => {
    const trySync = async () => {
      try {
        const token = localStorage.getItem('barrylandAuthToken');
        if (!token) return; // only sync when authenticated
        if (!pendingFavoriteIds || pendingFavoriteIds.length === 0) return;

        for (const favId of [...pendingFavoriteIds]) {
          try {
            // If favId is not a valid ObjectId, try to map it via our in-memory properties list
            let apiId = favId;
            if (!isValidObjectId(apiId)) {
              const mapped = properties.find(p => String(p.id) === favId || String(p._id) === favId);
              if (mapped && mapped._id && isValidObjectId(String(mapped._id))) {
                apiId = String(mapped._id);
              } else {
                // Nothing we can do server-side for this id — drop it from pending to avoid repeated 400s
                removeLocalFavoriteId(favId);
                continue;
              }
            }

            await apiClient.post(`/properties/${apiId}/favorite`, null, { skipAuthRedirect: true, headers: { 'X-Skip-Auth-Redirect': '1' } } as any);
            // remove from local on success
            removeLocalFavoriteId(favId);
          } catch (e) {
            // If the server rejects the id as invalid (400) or not found (404), remove it from pending
            const status = (e as any)?.response?.status;
            if (status === 400 || status === 404) {
              try { removeLocalFavoriteId(favId); } catch (_) { /* ignore */ }
              // do not log noisy warnings for invalid/found errors
              continue;
            }
            // For other errors (network, 5xx), keep the id pending silently.
          }
        }
      } catch (e) { /* ignore */ }
    };
    // Avoid unhandled promise rejection warnings from the async function
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    trySync().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFavoriteIds]);

  const isValidObjectId = (val: string) => /^[0-9a-fA-F]{24}$/.test(val);
  // saveLocalFavoriteIds / unionIds removed — local storage writes are avoided for authenticated sessions

  // When favorites change, ensure all known properties reflect the isFavorite flag
  useEffect(() => {
    try {
      // Build a robust set of favorite identifiers (consider both id/_id/externalId)
      const favIds = new Set<string>();
      (favorites || []).forEach(f => {
        try {
          if ((f as any)._id) favIds.add(String((f as any)._id));
          if ((f as any).id) favIds.add(String((f as any).id));
          if ((f as any).externalId) favIds.add(String((f as any).externalId));
        } catch (e) { /* ignore malformed fav */ }
      });

      const markIsFav = (p: any) => {
        const candidates = [p._id, p.id, p.externalId].filter(Boolean).map(String);
        return candidates.some(c => favIds.has(c));
      };

      setProperties(prev => prev.map(p => ({ ...p, isFavorite: markIsFav(p) })));
      setMyProperties(prev => prev.map(p => ({ ...p, isFavorite: markIsFav(p) })));
    } catch (e) {
      // ignore
    }
  }, [favorites]);

  // Listen for login events to refresh favorites from server (after syncing local favorites)
  useEffect(() => {
    const onLogin = async (event: Event) => {
      const e = event as CustomEvent;
      // Favoris du serveur
      const serverFavorites = (e.detail && Array.isArray(e.detail.favorites)) ? e.detail.favorites : [];
      const serverIds = serverFavorites.map((f: any) => String(f._id || f.id));
      // Favoris locaux
      const localRaw = localStorage.getItem('barrylandLocalFavorites');
      const localFavorites = localRaw ? JSON.parse(localRaw) : [];
      // Synchroniser les favoris locaux manquants côté serveur
      const toSync = localFavorites.filter((favId: string) => !serverIds.includes(String(favId)));
      for (const favId of toSync) {
        try {
          await apiClient.post(`/properties/${favId}/favorite`);
        } catch (_) {
          // Si l'API ne reconnaît pas l'id, on le garde côté local
        }
      }
      // Vider le localStorage après synchronisation
      localStorage.removeItem('barrylandLocalFavorites');
      // Recharger la liste des favoris depuis le serveur
      let serverFavs: Property[] = [];
      try {
        serverFavs = await fetchFavorites();
      } catch (_) {}
      // Fusionner avec les favoris locaux non reconnus par le serveur
      const serverIdSet = new Set(serverFavs.map(f => String(f._id || f.id)));
      const missingLocal = localFavorites.filter((id: string) => !serverIdSet.has(String(id)));
      if (missingLocal.length > 0) {
        const localProps = missingLocal.map((id: string) => {
          const found = properties.find(p => p.id === id || p._id === id);
          return found ? { ...found, isFavorite: true } : ({ _id: id, id, title: 'Annonce', description: '', images: [], location: '', price: 0, type: 'vente', category: 'maison', area: 0, bedrooms: 0, bathrooms: 0, features: [], owner: '', contact: { phone: '', email: '' }, status: 'validee', publisherType: 'particulier', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), favorites: 0, isFavorite: true } as unknown as Property);
        });
        setFavorites([...serverFavs, ...localProps]);
      }
    };
    try {
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('barryland:auth:login', onLogin as EventListener);
      }
    } catch (e) { /* ignore */ }
    return () => {
      try {
        if (typeof window !== 'undefined' && window.removeEventListener) {
          window.removeEventListener('barryland:auth:login', onLogin as EventListener);
        }
      } catch (e) { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties]);

  const fetchMyProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.get('/properties/user/my-properties');
      const props = resp?.data?.data?.properties || [];
      const normalized = props.map((p: any) => normalizeProperty(p));
      // Deduplicate and ensure the list only contains properties owned by the current user
      const dedupeMap = new Map<string, Property>();
      normalized.forEach((p: Property) => {
        const key = String(p.id || p._id || '');
        if (!key) return;
        if (!dedupeMap.has(key)) dedupeMap.set(key, p);
      });
      const deduped = Array.from(dedupeMap.values());
      // Filter by owner if possible (owner may be object or string)
      const owned = deduped.filter(p => {
        const owner = (p as any).owner;
        const ownerId = typeof owner === 'string' ? owner : (owner?._id || owner?.id || owner?.toString());
        // If no owner info, keep the prop (defensive)
        if (!ownerId) return true;
        // Do not filter aggressively here — the dashboard provides final owner-focused filtering.
        return true;
      });
      // keep global properties untouched (used by public pages)
      setMyProperties(owned);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement des propriétés";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all properties from the server (public listing)
  const refreshProperties = async (filters?: any) => {
    setLoading(true);
    try {
      const resp = await apiClient.get('/properties', { params: filters });
      const props = resp?.data?.data?.properties || resp?.data?.properties || resp?.data || [];
      const normalized = Array.isArray(props) ? props.map((p: any) => normalizeProperty(p)) : [];

      // Merge and deduplicate with existing properties (preserve unknown local items)
      const dedupe = new Map<string, Property>();
      normalized.forEach((p: Property) => {
        const key = String(p.id || p._id || '');
        if (key) dedupe.set(key, p);
      });
      properties.forEach((p) => {
        const key = String(p.id || p._id || '');
        if (key && !dedupe.has(key)) dedupe.set(key, p);
      });

      const merged = Array.from(dedupe.values());
      setProperties(merged);
      return merged;
    } catch (e) {
      return properties;
    } finally {
      setLoading(false);
    }
  };

  // Extracted: fetch only favorites for the current user (or from localStorage fallback)
  const fetchFavorites = async (opts?: { skipAuthRedirect?: boolean }) => {
    try {
      const cfg: any = {};
      if (opts?.skipAuthRedirect) {
        cfg.skipAuthRedirect = true;
        cfg.headers = { 'X-Skip-Auth-Redirect': '1' };
      }
      // If there's no token, avoid calling the protected `/auth/me` endpoint to prevent
      // noisy 401 Unauthorized entries in the browser network console for visitors.
      const token = (() => {
        try { return localStorage.getItem('barrylandAuthToken'); } catch (e) { return null; }
      })();

      let me: any = null;
      if (!token) {
        // No token -> behave like the catch fallback: use local favorites only
        if (process.env.NODE_ENV === 'development') {
          console.debug('[fetchFavorites] no auth token present; skipping /auth/me call (visitor).');
        }
        const localIds = loadLocalFavoriteIds();
        const combined = Array.from(new Set([...localIds, ...pendingFavoriteIds]));
        if (combined.length > 0) {
          const favProps: Property[] = combined.map(id => {
            const found = properties.find(p => p.id === id || p._id === id);
            return found ? { ...found, isFavorite: true } : ({ _id: id, id, title: 'Annonce', description: '', images: [], location: '', price: 0, type: 'vente', category: 'maison', area: 0, bedrooms: 0, bathrooms: 0, features: [], owner: '', contact: { phone: '', email: '' }, status: 'validee', publisherType: 'particulier', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), favorites: 0, isFavorite: true } as unknown as Property);
          });
          setFavorites(favProps);
          return favProps;
        }
        setFavorites([]);
        return [];
      } else {
        me = await apiClient.get('/auth/me', cfg);
      }
      // Server returned favorites for authenticated user. Do NOT merge with localStorage favorites
      // because local favorites are per-browser and may belong to a different account.
      const favs = me?.data?.data?.favorites || me?.data?.favorites || [];
      const serverFavProps: Property[] = Array.isArray(favs)
        ? favs.map((f: any) => (typeof f === 'string' ? (properties.find(p => p.id === f || p._id === f) || { id: f, _id: f } as any) : normalizeProperty(f)))
        : [];

      // Merge server favorites with any local/pending favorites that weren't synced yet so visitor favorites don't disappear.
      const localIds = loadLocalFavoriteIds();
      const combinedLocal = Array.from(new Set([...localIds, ...pendingFavoriteIds]));

      if (process.env.NODE_ENV === 'development') {
        console.debug(`[dev] fetchFavorites: ${serverFavProps.length} favoris du serveur, ${combinedLocal.length} IDs locaux en attente.`);
      }

      // Build a set of ids already present in server favorites (consider both id and _id)
      const serverIdSet = new Set<string>();
      serverFavProps.forEach(p => { if ((p as any)._id) serverIdSet.add(String((p as any)._id)); if (p.id) serverIdSet.add(String(p.id)); });

      const remainingLocalProps: Property[] = combinedLocal
        .filter(id => !serverIdSet.has(String(id)))
        .map(id => {
          const found = properties.find(p => p.id === id || p._id === id);
          return found ? { ...found, isFavorite: true } : ({ _id: id, id, title: 'Annonce', description: '', images: [], location: '', price: 0, type: 'vente', category: 'maison', area: 0, bedrooms: 0, bathrooms: 0, features: [], owner: '', contact: { phone: '', email: '' }, status: 'validee', publisherType: 'particulier', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), favorites: 0, isFavorite: true } as unknown as Property);
        });
      
      if (process.env.NODE_ENV === 'development' && remainingLocalProps.length > 0) {
        console.debug(`[dev] fetchFavorites: Ajout de ${remainingLocalProps.length} favoris locaux non synchronisés à la liste.`);
      }

      const favProps = [...serverFavProps, ...remainingLocalProps];
      setFavorites(favProps);
      return favProps;
    } catch (meErr) {
      // If /auth/me fails (not authenticated or other), fallback to local favorites
      // Suppress noisy logs for 401 Unauthorized (visitor) — expected behavior for unauthenticated users
      const _err: any = meErr;
      if (_err && _err.response && _err.response.status && _err.response.status !== 401) {
        console.error('[fetchFavorites] erreur inattendue:', meErr);
      }
      const localIds = loadLocalFavoriteIds();
      // also include any pendingFavoriteIds still in memory
      const combined = Array.from(new Set([...localIds, ...pendingFavoriteIds]));
      if (combined.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[dev] fetchFavorites (fallback): Chargement de ${combined.length} favoris locaux.`);
        }
        const favProps: Property[] = combined.map(id => {
          const found = properties.find(p => p.id === id || p._id === id);
          return found ? { ...found, isFavorite: true } : ({ _id: id, id, title: 'Annonce', description: '', images: [], location: '', price: 0, type: 'vente', category: 'maison', area: 0, bedrooms: 0, bathrooms: 0, features: [], owner: '', contact: { phone: '', email: '' }, status: 'validee', publisherType: 'particulier', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), favorites: 0, isFavorite: true } as unknown as Property);
        });
        setFavorites(favProps);
        return favProps;
      }
      setFavorites([]);
      return [];
    }
  };

  const addProperty = async (propertyData: Partial<Property>) => {
    setLoading(true);
    setError(null);
    try {
      // If the backend returned a full property object, use it directly
      if (propertyData && (propertyData._id || propertyData.id)) {
        const p: Property = normalizeProperty(propertyData);
        // Only expose to global public properties if the item is validated/active
        const isPublic = (p.status === 'validee' || p.status === 'active');
        if (isPublic) setProperties(prev => [p, ...prev]);
        setMyProperties(prev => [p, ...prev]);
        return;
      }

      // Fallback: build a minimal property from partial data
      const id = Date.now().toString();
      const minimal = {
        ...propertyData,
        _id: id,
        id: id,
        createdAt: new Date().toISOString(),
        title: propertyData.title || 'Nouvelle annonce',
        description: propertyData.description || '',
  type: (propertyData.type as any) || ((propertyData as any).transactionType as any) || ((propertyData as any).propertyType as any) || 'vente',
        category: (propertyData.category as any) || 'maison',
        price: Number(propertyData.price) || 0,
        location: typeof propertyData.location === 'string' ? propertyData.location : (propertyData.location?.address || propertyData.location?.city || ''),
        area: Number(propertyData.area) || 0,
        bedrooms: Number(propertyData.bedrooms) || 0,
        bathrooms: Number(propertyData.bathrooms) || 0,
        images: Array.isArray(propertyData.images) ? propertyData.images.map((i: any) => (typeof i === 'string' ? i : (i?.url || ''))).filter(Boolean) : [],
        owner: (propertyData.owner as any) || 'Vous',
        publisherType: (propertyData.publisherType as any) || 'particulier',
        status: (propertyData.status as any) || 'pending',
        contact: (propertyData.contact as any) || { phone: '', email: '' }
      } as Property;
      const newProperty: Property = normalizeProperty(minimal);
      // When creating locally (before server validation) keep the property in myProperties
      // but do not expose it in the global public listing unless it's already validated.
      const isPublicLocal = (newProperty.status === 'validee' || newProperty.status === 'active');
      if (isPublicLocal) setProperties(prev => [newProperty, ...prev]);
      setMyProperties(prev => [newProperty, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout de la propriété");
    } finally {
      setLoading(false);
    }
  };

  const updateProperty = async (id: string, propertyData: Partial<Property>) => {
    setLoading(true);
    setError(null);
    try {
      // Call backend to update
      try {
        const resp = await apiClient.put(`/properties/${id}`, propertyData);
        const updated = resp?.data?.data?.property || resp?.data?.data || resp?.data;
        const normalized = updated ? normalizeProperty(updated) : null;
        if (normalized) {
          setProperties(prev => prev.map(property => (property.id === id || property._id === id) ? normalized : property));
          setMyProperties(prev => prev.map(property => (property.id === id || property._id === id) ? normalized : property));
          // Refresh user's properties list to ensure dashboard shows latest server state
            // Try a targeted fetch of the updated property to ensure server data (images, flags) is used
            try {
              apiClient.get(`/properties/${id}`).then((r) => {
                const serverProp = r?.data?.data?.property || r?.data?.data || r?.data;
                if (serverProp) {
                  const srvNorm = normalizeProperty(serverProp);
                  setProperties(prev => prev.map(property => (property.id === id || property._id === id) ? srvNorm : property));
                  setMyProperties(prev => prev.map(property => (property.id === id || property._id === id) ? srvNorm : property));
                }
              }).catch(() => {});
            } catch (_) { /* ignore */ }
          return;
        }

        // Fallback: merge locally
        setProperties(prev => 
          prev.map(property => 
            (property.id === id || property._id === id)
              ? { ...property, ...propertyData }
              : property
          )
        );
        setMyProperties(prev => 
          prev.map(property => 
            (property.id === id || property._id === id)
              ? { ...property, ...propertyData }
              : property
          )
        );
        return;
      } catch (apiErr: any) {
        // Rethrow original axios error so callers can inspect response.data (validation details)
        throw apiErr;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour de la propriété");
    } finally {
      setLoading(false);
    }
  };

  const deleteProperty = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Attempt to delete on server first
      try {
        await apiClient.delete(`/properties/${id}`);
      } catch (apiErr: any) {
        // If server returns an error, surface it to the user
        const msg = (apiErr && apiErr.response && apiErr.response.data && apiErr.response.data.message)
          ? apiErr.response.data.message
          : (apiErr instanceof Error ? apiErr.message : 'Erreur lors de la suppression');
        throw new Error(msg);
      }

      // Remove locally
      setProperties(prev => prev.filter(property => property.id !== id && property._id !== id));
      setMyProperties(prev => prev.filter(property => property.id !== id && property._id !== id));

      // Also remove from favorites (in-memory)
      setFavorites(prev => prev.filter(f => (f as any).id !== id && (f as any)._id !== id));

      // Remove any lingering local favorite ids (both pending and persisted)
      try {
        // persisted local ids
        const local = loadLocalFavoriteIds().filter(x => x !== id);
        saveLocalFavoriteIds(local);
      } catch (e) { /* ignore storage errors */ }
      try {
        // pending favorite ids in memory
        setPendingFavoriteIds(prev => prev.filter(x => x !== id));
      } catch (e) { /* ignore */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression de la propriété");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (id: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    // If id is not a Mongo ObjectId it is probably a local/mock property: handle locally without calling API
    if (!isValidObjectId(id)) {
      try {
        const prevProperties = properties;
        const prevMyProperties = myProperties;
        const prevFavorites = favorites;

        const currentlyFav = prevFavorites.some(f => f.id === id || f._id === id) || prevProperties.some(p => (p.id === id || p._id === id) && (p as any).isFavorite);
        const newFavState = !currentlyFav;

        // update properties/myProperties
        setProperties(prev => prev.map(p => (p.id === id || p._id === id) ? ({ ...p, isFavorite: newFavState, favorites: Math.max(0, ((p as any).favorites || 0) + (newFavState ? 1 : -1)) }) : p));
        setMyProperties(prev => prev.map(p => (p.id === id || p._id === id) ? ({ ...p, isFavorite: newFavState, favorites: Math.max(0, ((p as any).favorites || 0) + (newFavState ? 1 : -1)) }) : p));

        if (newFavState) {
          const found = prevProperties.find(p => p.id === id || p._id === id) || prevMyProperties.find(p => p.id === id || p._id === id);
          const toAdd = found ? { ...found, isFavorite: true } as Property : ({ _id: id, id, title: 'Annonce', description: '', images: [], location: '', price: 0, type: 'vente', category: 'maison', area: 0, bedrooms: 0, bathrooms: 0, features: [], owner: '', contact: { phone: '', email: '' }, status: 'validee', publisherType: 'particulier', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), favorites: 0, isFavorite: true } as unknown as Property);
          setFavorites(prev => [toAdd, ...prev.filter(f => f.id !== id && f._id !== id)]);
        } else {
          setFavorites(prev => prev.filter(f => f.id !== id && f._id !== id));
        }

        // persist ids using helper
        try {
          if (newFavState) addLocalFavoriteId(id);
          else removeLocalFavoriteId(id);
        } catch (_) { /* ignore storage errors */ }

        setLoading(false);
        return newFavState;
      } catch (err) {
        setLoading(false);
        setError('Erreur interne en gérant le favori localement');
        throw err;
      }
    }

    // snapshots for rollback
    const prevProperties = properties;
    const prevMyProperties = myProperties;
    const prevFavorites = favorites;

    // Determine current favorite state from favorites list or property flag (compute outside try so catch can react based on intent)
    const currentlyFav = prevFavorites.some(f => f.id === id || f._id === id) || prevProperties.some(p => (p.id === id || p._id === id) && (p as any).isFavorite);
    const newFavState = !currentlyFav;

    try {

      // Optimistic update: update properties and myProperties counts & isFavorite
      setProperties(prev => prev.map(p => {
        if (p.id === id || p._id === id) {
          const newCount = Math.max(0, (p as any).favorites ? (p as any).favorites + (newFavState ? 1 : -1) : (newFavState ? 1 : 0));
          return { ...p, favorites: newCount, isFavorite: newFavState } as Property;
        }
        return p;
      }));

      setMyProperties(prev => prev.map(p => {
        if (p.id === id || p._id === id) {
          const newCount = Math.max(0, (p as any).favorites ? (p as any).favorites + (newFavState ? 1 : -1) : (newFavState ? 1 : 0));
          return { ...p, favorites: newCount, isFavorite: newFavState } as Property;
        }
        return p;
      }));

      // Update favorites list optimistically
      if (newFavState) {
        // add to favorites: prefer the version from properties/myProperties
        const found = prevProperties.find(p => p.id === id || p._id === id) || prevMyProperties.find(p => p.id === id || p._id === id);
        const itemToAdd = found
          ? ({ ...found, isFavorite: true, favorites: (found as any).favorites ? (found as any).favorites + (currentlyFav ? 0 : 1) : 1 } as Property)
          : ({ _id: id, id, title: 'Annonce', description: '', images: [], location: '', price: 0, type: 'vente', category: 'maison', area: 0, bedrooms: 0, bathrooms: 0, features: [], owner: '', contact: { phone: '', email: '' }, status: 'validee', publisherType: 'particulier', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), favorites: 1, isFavorite: true } as Property);

        setFavorites(prev => [itemToAdd, ...prev.filter(f => f.id !== id && f._id !== id)]);
      } else {
        // remove from favorites
        setFavorites(prev => prev.filter(f => f.id !== id && f._id !== id));
      }

  // Call the API to persist
  const resp = await apiClient.post(`/properties/${id}/favorite`);
      const data = resp?.data?.data || resp?.data;

      // If server returned a full property, merge it into lists to ensure canonical data
      const returnedProp = data?.property;
      if (returnedProp) {
        const norm = normalizeProperty(returnedProp);
        setProperties(prev => prev.map(p => (p.id === id || p._id === id) ? norm : p));
        setMyProperties(prev => prev.map(p => (p.id === id || p._id === id) ? norm : p));
        // Update favorites list based on isFavorite
        if (data.isFavorite) {
          setFavorites(prev => [norm, ...prev.filter(f => f.id !== id && f._id !== id)]);
        } else {
          setFavorites(prev => prev.filter(f => f.id !== id && f._id !== id));
          // Ensure any local/pending storage does not reintroduce the removed favorite
          try { removeLocalFavoriteId(id); } catch (e) { /* ignore */ }
        }
      } else {
        // If no full prop returned, sync using counts/isFavorite
        const isFav = data?.isFavorite;
        const count = data?.favoritesCount;
        setProperties(prev => prev.map(p => (p.id === id || p._id === id) ? { ...p, favorites: count ?? p.favorites, isFavorite: typeof isFav === 'boolean' ? isFav : (p as any).isFavorite } : p));
        setMyProperties(prev => prev.map(p => (p.id === id || p._id === id) ? { ...p, favorites: count ?? p.favorites, isFavorite: typeof isFav === 'boolean' ? isFav : (p as any).isFavorite } : p));
        if (typeof data?.isFavorite === 'boolean') {
          if (data.isFavorite) {
            const found = properties.find(p => p.id === id || p._id === id) || myProperties.find(p => p.id === id || p._id === id);
            if (found) setFavorites(prev => [ { ...found, isFavorite: true, favorites: data?.favoritesCount ?? found.favorites }, ...prev.filter(f => f.id !== id && f._id !== id) ]);
          } else {
            setFavorites(prev => prev.filter(f => f.id !== id && f._id !== id));
            // Make sure we remove any lingering local/pending id so it won't be re-added by fetch/sync
            try { removeLocalFavoriteId(id); } catch (e) { /* ignore */ }
          }
        }
      }

      // Determine final favorite state to return to caller
      const finalFav = (data && typeof data?.isFavorite === 'boolean')
        ? data.isFavorite
        : (returnedProp ? (normalizeProperty(returnedProp) as any).isFavorite ?? newFavState : newFavState);
      setLoading(false);
      return finalFav;
    } catch (err: any) {
      // If server reports property not found, keep optimistic favorite locally and persist it so it doesn't disappear
      const serverMessage = err?.response?.data?.message || err?.message || '';
      const status = err?.response?.status;
      if (status === 404 && typeof serverMessage === 'string' && serverMessage.toLowerCase().includes('propriété non trouvée')) {
        try {
          // persist current favorites ids (ensures favorite added optimistically stays)
          const currentIds = (favorites || []).map(f => (f as any).id || (f as any)._id).filter(Boolean) as string[];
          if (!currentIds.includes(id)) currentIds.push(id);
          saveLocalFavoriteIds(currentIds);
        } catch (e) { /* ignore storage errors */ }
        setLoading(false);
        return newFavState;
      }

      // rollback for other errors
      setProperties(prevProperties);
      setMyProperties(prevMyProperties);
      setFavorites(prevFavorites);
      const message = err?.response?.data?.message || err?.message || 'Erreur lors de la mise à jour des favoris';
      setError(message);
      // log detailed server response when present
      try { console.error('toggleFavorite error response:', err?.response?.data || err); } catch(e) { void e; }
      setLoading(false);
      throw err;
    }
  };

  return (
    <PropertyContext.Provider value={{ 
      properties, 
      myProperties,
      favorites,
      loading,
      error,
      addProperty, 
      updateProperty, 
      deleteProperty,
      toggleFavorite,
      fetchMyProperties,
      fetchFavorites,
      refreshProperties
    }}>
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = (): PropertyContextType => {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};