
import { HistoryItem } from '../types';

const STORAGE_KEY = 'speakflow_history';

export const getHistory = (): HistoryItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveHistoryItem = (item: HistoryItem) => {
  try {
    const history = getHistory();
    // Limit to 20 items to prevent localStorage quota issues with full text results
    const updated = [item, ...history].slice(0, 20); 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save history", e);
  }
};
