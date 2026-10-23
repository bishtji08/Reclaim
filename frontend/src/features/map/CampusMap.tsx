import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { apiService } from '../../lib/api/client';
import { Item } from '../../types';
import {
  MapPin,
  Search,
  ChevronRight,
  Navigation
} from 'lucide-react';

interface CampusLocation {
  id: number | string;
  name: string;
  building?: string;
  floor?: string | number;
  type?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

// Graphic Era University (GEU) Dehradun coordinates
const GEU_CAMPUS_CENTER = {
  lat: 30.2687,
  lng: 77.9945,
};

// Default coordinates for campus buildings if not set in DB
const LOCATION_COORDINATES_MAP: Record<string, { lat: number; lng: number }> = {
  'Central Library - Main Desk': { lat: 30.2691, lng: 77.9948 },
  'Student Center Cafeteria': { lat: 30.2682, lng: 77.9952 },
  'Science Complex Lab 3': { lat: 30.2698, lng: 77.9939 },
  'Engineering Hallway A': { lat: 30.2679, lng: 77.9941 },
  'Campus Sports Complex': { lat: 30.2673, lng: 77.9959 },
};

// Custom SVG map icons
const createPinIcon = (color: string, count: number) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background: ${color};
        color: white;
        border: 2px solid white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 11px;
        box-shadow: 0 6px 12px rgba(15, 23, 42, 0.35);
      ">
        ${count > 0 ? count : '•'}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

interface CampusMapProps {
  items: Item[];
  onSelectItem?: (item: Item) => void;
}

export const CampusMap: React.FC<CampusMapProps> = ({ items, onSelectItem }) => {
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'lost' | 'found'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'directory'>('map');

  useEffect(() => {
    const fetchLocs = async () => {
      try {
        setLoading(true);
        const res = await apiService.getLocations();
        if (res.success && res.data) {
          setLocations(res.data.locations || []);
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLocs();
  }, []);

  const locationCounts = locations.map((loc) => {
    const matchingItems = items.filter((i) => {
      const matchLoc =
        (i.location?.name || '').toLowerCase() === loc.name.toLowerCase() ||
        String(i.location_id) === String(loc.id);
      if (!matchLoc) return false;
      if (filterType !== 'all' && i.type !== filterType) return false;
      return true;
    });

    const fallbackCoord = LOCATION_COORDINATES_MAP[loc.name] || {
      lat: GEU_CAMPUS_CENTER.lat + (Math.random() - 0.5) * 0.003,
      lng: GEU_CAMPUS_CENTER.lng + (Math.random() - 0.5) * 0.003,
    };

    return {
      ...loc,
      latitude: loc.latitude || fallbackCoord.lat,
      longitude: loc.longitude || fallbackCoord.lng,
      count: matchingItems.length,
      items: matchingItems,
    };
  });

  const filteredLocations = locationCounts.filter((loc) => {
    if (search.trim()) {
      return (
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        (loc.building || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  const activeLocationData = selectedLocation
    ? locationCounts.find((l) => String(l.id) === String(selectedLocation))
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Navigation className="w-3 h-3" /> GEU Campus GIS Explorer
            </span>
            <span className="text-xs text-slate-400 font-semibold">•</span>
            <span className="text-xs text-slate-500 font-bold">{locations.length} Campus Covered Areas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Campus Hotspots & Spatial Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Explore lost & found property density across Graphic Era University lecture halls, laboratories, and recreation areas.
          </p>
        </div>

        {/* View & Type Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${viewMode === 'map' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Interactive Map
            </button>
            <button
              onClick={() => setViewMode('directory')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${viewMode === 'directory' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Building List
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['all', 'lost', 'found'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${filterType === t ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl shadow-xs border border-slate-200/90">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campus buildings, Central Library, Cafeteria, Sports Complex..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-slate-500 font-bold">Querying PostGIS spatial coordinates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Map or Directory Cards (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            {viewMode === 'map' ? (
              <div className="h-[520px] rounded-3xl overflow-hidden border border-slate-200/90 shadow-md relative z-0">
                <MapContainer
                  center={[GEU_CAMPUS_CENTER.lat, GEU_CAMPUS_CENTER.lng]}
                  zoom={16}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {filteredLocations.map((loc) => {
                    const pinColor = loc.count > 0 ? '#2563eb' : '#64748b';
                    return (
                      <Marker
                        key={loc.id}
                        position={[loc.latitude!, loc.longitude!]}
                        icon={createPinIcon(pinColor, loc.count)}
                        eventHandlers={{
                          click: () => setSelectedLocation(String(loc.id)),
                        }}
                      >
                        <Popup>
                          <div className="p-3 text-xs space-y-1">
                            <h4 className="font-extrabold text-slate-900">{loc.name}</h4>
                            <p className="text-slate-500 text-[11px]">{loc.building || 'Graphic Era Facility'}</p>
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="font-bold text-blue-600">
                                {loc.count} {filterType} item(s)
                              </span>
                              <button
                                onClick={() => setSelectedLocation(String(loc.id))}
                                className="text-[11px] text-blue-700 underline font-bold"
                              >
                                View items
                              </button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto">
                {filteredLocations.map((loc) => {
                  const isSelected = String(loc.id) === String(selectedLocation);
                  return (
                    <div
                      key={loc.id}
                      onClick={() => setSelectedLocation(String(loc.id))}
                      className={`p-4 rounded-3xl border transition-all cursor-pointer ${isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:bg-slate-50/80 shadow-2xs'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900 truncate">{loc.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${loc.count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                          {loc.count}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{loc.building || 'Campus Grounds'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Facility Inspector Column */}
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/90 p-5 sm:p-6 space-y-4 flex flex-col justify-between">
            {activeLocationData ? (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                    Selected Facility
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">{activeLocationData.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{activeLocationData.building || 'Graphic Era Campus'}</p>
                  {activeLocationData.description && (
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed font-medium">
                      {activeLocationData.description}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">
                    Items Logged at this Location ({activeLocationData.items?.length || 0}):
                  </h4>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {(!activeLocationData.items || activeLocationData.items.length === 0) ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No active reports for this facility.</p>
                    ) : (
                      activeLocationData.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => onSelectItem && onSelectItem(item)}
                          className="p-3 bg-slate-50 hover:bg-blue-50/60 rounded-2xl border border-slate-200/70 transition-all cursor-pointer flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${item.type === 'lost' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
                              }`}>
                              {item.type}
                            </span>
                            <p className="text-xs font-bold text-slate-900 truncate mt-1">{item.title}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 space-y-2 text-slate-400">
                <MapPin className="w-12 h-12 mx-auto text-slate-300 stroke-[1.25]" />
                <h4 className="text-sm font-black text-slate-700">Select a Location</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Click any campus pin on the map or select from the directory to inspect its active lost & found items.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
