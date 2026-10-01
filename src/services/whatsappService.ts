import { apiClient } from '@/api/client';

export type WhatsAppState = 'tersambung' | 'menunggu_scan' | 'terputus';

export interface WhatsAppStatus {
  keadaan: WhatsAppState;
  nomor: string | null;
  profile_name: string | null;
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  const response = await apiClient.get('/admin/whatsapp/status');
  return response.data;
}

export async function getWhatsAppQr(): Promise<Blob> {
  const response = await apiClient.get('/admin/whatsapp/qr', {
    responseType: 'blob',
  });
  return response.data;
}

export async function resetWhatsAppNumber(): Promise<void> {
  await apiClient.post('/admin/whatsapp/ganti-nomor');
  clearPublicContactCache();
}

export function clearPublicContactCache(): void {
  publicContactPromise = null;
}

let publicContactPromise: Promise<{ whatsapp: string }> | null = null;

export async function getPublicContact(): Promise<{ whatsapp: string }> {
  if (!publicContactPromise) {
    publicContactPromise = apiClient.get('/public/kontak-toko')
      .then(res => res.data)
      .catch(err => {
        publicContactPromise = null; // Clear cache on error so it can be retried
        throw err;
      });
  }
  return publicContactPromise;
}
