import React, { createContext, useContext, useState, useEffect } from 'react';
import { getPublicContact } from '@/services/whatsappService';

interface WhatsAppContextType {
  whatsappNumber: string | null;
  whatsappNumberDisplay: string | null;
  whatsappUrl: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const WhatsAppContext = createContext<WhatsAppContextType>({
  whatsappNumber: null,
  whatsappNumberDisplay: null,
  whatsappUrl: null,
  loading: true,
  refetch: async () => {},
});

export const WhatsAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNumber = async () => {
    try {
      const { whatsapp } = await getPublicContact();
      setWhatsappNumber(whatsapp);
    } catch (error) {
      console.error('Failed to fetch public WhatsApp number', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumber();
  }, []);

  const whatsappNumberDisplay = whatsappNumber
    ? `+${whatsappNumber.slice(0, 2)} ${whatsappNumber.slice(2).replace(/(\d{4})/g, '$1-').replace(/-$/, '')}`
    : null;

  const message = 'Halo Toti Cakery! Saya ingin bertanya tentang...';
  const whatsappUrl = whatsappNumber 
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : null;

  return (
    <WhatsAppContext.Provider value={{ whatsappNumber, whatsappNumberDisplay, whatsappUrl, loading, refetch: fetchNumber }}>
      {children}
    </WhatsAppContext.Provider>
  );
};

export const useWhatsApp = () => useContext(WhatsAppContext);
