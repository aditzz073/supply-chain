import { useState, useCallback } from 'react';
import axios from 'axios';
import { SupplyChainData } from '../types/graph';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const HISTORY_KEY = 'pharmakg-search-history';

export function useGraphData() {
  const [data, setData] = useState<SupplyChainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const search = useCallback(
    async (medicineName: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.post<SupplyChainData>(`${API_BASE}/search`, {
          medicine_name: medicineName,
        });
        setData(res.data);

        const updated = [
          medicineName,
          ...searchHistory.filter(
            (h) => h.toLowerCase() !== medicineName.toLowerCase()
          ),
        ].slice(0, 5);
        setSearchHistory(updated);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (err: any) {
        setError(
          err?.response?.data?.detail || err.message || 'Search failed'
        );
      } finally {
        setLoading(false);
      }
    },
    [searchHistory]
  );

  const saveSupplier = useCallback(
    async (medicineName: string, supplierData: any) => {
      try {
        await axios.post(`${API_BASE}/graphs/suppliers`, {
          medicine_name: medicineName,
          supplier_data: supplierData,
        });
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, search, searchHistory, saveSupplier, clearData };
}
