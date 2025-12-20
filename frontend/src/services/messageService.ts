import apiClient from '../utils/apiClient';

export type MessageItem = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  property?: { _id?: string; title?: string } | string | null;
  message: string;
  createdAt: string;
  status: string;
};

export const getMessages = async (opts: { page?: number; limit?: number; propertyId?: string; status?: string }) => {
  const { page = 1, limit = 20, propertyId, status } = opts;
  const params: any = { page, limit };
  if (propertyId) params.propertyId = propertyId;
  if (status) params.status = status;
  const resp = await apiClient.get('/messages', { params });
  return resp.data;
};

export const getMessage = async (id: string) => {
  const resp = await apiClient.get(`/messages/${id}`);
  return resp.data;
};

export const updateMessage = async (id: string, data: { status?: string; read?: boolean }) => {
  const resp = await apiClient.patch(`/messages/${id}`, data);
  return resp.data;
};

export default { getMessages, getMessage, updateMessage };
