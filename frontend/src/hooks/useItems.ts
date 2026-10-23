import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../lib/api/client';
import { API_BASE_URL } from '../lib/api/config';
import { Item } from '../types';

export function normalizeItem(raw: Record<string, unknown>): Item {
  if (!raw) return raw as unknown as Item;

  // Resolve images: if array of objects with url or string
  let images: string[] = [];
  if (Array.isArray(raw.images)) {
    images = (raw.images as unknown[]).map((img: unknown) => {
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object') {
        const obj = img as { url?: string; image_url?: string };
        return obj.url || obj.image_url || '';
      }
      return '';
    }).filter(Boolean);
  }

  // Ensure absolute upload URLs if relative
  const backendBase = API_BASE_URL.replace(/\/api$/, '');
  images = images.map(url => {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
  });

  const reportedAt = raw.reported_at || raw.reportedAt;
  const parsedDate = typeof reportedAt === 'string' ? new Date(reportedAt) : (reportedAt instanceof Date ? reportedAt : new Date());

  const locObj = (raw.location && typeof raw.location === 'object') ? (raw.location as Record<string, unknown>) : null;

  return {
    id: String(raw.id),
    title: String(raw.title || 'Untitled Item'),
    description: String(raw.description || ''),
    category: String(raw.category_name || raw.category || 'General'),
    category_id: raw.category_id as number | string | undefined,
    category_name: raw.category_name as string | undefined,
    subcategory: raw.subcategory_name as string || raw.subcategory as string || undefined,
    subcategory_id: raw.subcategory_id as number | string | undefined,
    subcategory_name: raw.subcategory_name as string | undefined,
    type: raw.type === 'found' ? 'found' : 'lost',
    status: (raw.status as Item['status']) || 'reported',
    reportedBy: String(raw.reported_by ?? raw.reportedBy ?? ''),
    reported_by: raw.reported_by as number | string | undefined,
    reportedByName: String(raw.reported_by_name || raw.reportedByName || 'Campus Member'),
    reported_by_name: raw.reported_by_name as string | undefined,
    reportedAt: parsedDate,
    reported_at: raw.reported_at as string | undefined,
    location: {
      id: raw.location_id as number | string | undefined,
      name: String(raw.location_name || locObj?.name || 'Campus Grounds'),
      coordinates: (locObj?.coordinates || raw.coordinates) as { lat: number; lng: number } | undefined,
    },
    location_id: raw.location_id as number | string | undefined,
    location_name: (raw.location_name || locObj?.name) as string | undefined,
    specific_location: raw.specific_location as string | undefined,
    images: images.length > 0 ? images : undefined,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    color: raw.color as string | undefined,
    brand: raw.brand as string | undefined,
    model: raw.model as string | undefined,
    serialNumber: (raw.serial_number || raw.serialNumber) as string | undefined,
    serial_number: raw.serial_number as string | undefined,
    dimensions: raw.dimensions as Item['dimensions'],
    estimatedValue: (raw.estimated_value || raw.estimatedValue) as number | undefined,
    estimated_value: raw.estimated_value as number | undefined,
    rewardOffered: (raw.reward_offered || raw.rewardOffered) as number | undefined,
    reward_offered: raw.reward_offered as number | undefined,
    dateLostFound: (raw.date_lost_found || raw.dateLostFound) as string | undefined,
    date_lost_found: raw.date_lost_found as string | undefined,
    timeLostFound: (raw.time_lost_found || raw.timeLostFound) as string | undefined,
    time_lost_found: raw.time_lost_found as string | undefined,
    matchedWith: (raw.matched_with || raw.matchedWith) as string | undefined,
    matched_with: raw.matched_with as number | string | undefined,
    claimedBy: (raw.claimed_by || raw.claimedBy) as string | undefined,
    claimed_by: raw.claimed_by as number | string | undefined,
    claimedAt: raw.claimed_at ? new Date(raw.claimed_at as string) : undefined,
    claimed_at: raw.claimed_at as string | undefined,
    returnedAt: raw.returned_at ? new Date(raw.returned_at as string) : undefined,
    returned_at: raw.returned_at as string | undefined,
    isUrgent: Boolean(raw.is_urgent ?? raw.isUrgent),
    is_urgent: Boolean(raw.is_urgent ?? raw.isUrgent),
  };
}

export const useItems = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async (params?: Record<string, unknown>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getItems(params);
      if (response.success && response.data) {
        const rawItems = (response.data.items || []) as unknown as Record<string, unknown>[];
        setItems(rawItems.map(normalizeItem));
      } else {
        setError(response.message || 'Failed to fetch items');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (itemData: FormData | Record<string, unknown>) => {
    const response = await apiService.createItem(itemData);
    if (response.success && response.data) {
      const newItem = normalizeItem(response.data.item as unknown as Record<string, unknown>);
      setItems(prev => [newItem, ...prev]);
      return newItem;
    } else {
      throw new Error(response.message || 'Failed to create item');
    }
  };

  const updateItemStatus = async (itemId: string, status: Item['status'], data?: Record<string, unknown>) => {
    const response = await apiService.updateItemStatus(itemId, status, data);
    if (response.success && response.data) {
      const updatedItem = normalizeItem(response.data.item as unknown as Record<string, unknown>);
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updatedItem } : item
      ));
      return updatedItem;
    } else {
      throw new Error(response.message || 'Failed to update item status');
    }
  };

  const deleteItem = async (itemId: string) => {
    const response = await apiService.deleteItem(itemId);
    if (response.success) {
      setItems(prev => prev.filter(item => item.id !== itemId));
      return true;
    } else {
      throw new Error(response.message || 'Failed to delete item');
    }
  };

  const getMatchingSuggestions = async (itemId: string) => {
    const response = await apiService.getItemMatches(itemId);
    if (response.success && response.data) {
      return response.data.matches;
    } else {
      throw new Error(response.message || 'Failed to get matches');
    }
  };

  return {
    items,
    loading,
    error,
    addItem,
    fetchItems,
    updateItemStatus,
    deleteItem,
    getMatchingSuggestions,
  };
};
