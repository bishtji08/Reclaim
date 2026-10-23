import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { apiService } from '../../lib/api/client';
import { useToast } from '../../context/ToastContext';
import { 
  Camera, 
  MapPin, 
  Tag, 
  Upload, 
  X, 
  Palette, 
  Crosshair, 
  Loader2
} from 'lucide-react';

interface SubcategoryOption {
  id: number | string;
  name: string;
  description?: string;
}

interface CategoryOption {
  id: number | string;
  name: string;
  description?: string;
  icon?: string;
  subcategories?: SubcategoryOption[];
}

interface LocationOption {
  id: number | string;
  name: string;
  building?: string;
  floor?: string;
  room?: string;
  latitude?: number | string;
  longitude?: number | string;
}

interface ReportItemFormProps {
  type: 'lost' | 'found';
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel: () => void;
}

interface PinnedCoords {
  lat: number;
  lng: number;
}

// Graphic Era University campus coordinates
const CAMPUS_DEFAULT_CENTER: [number, number] = [30.2687, 77.9945];

// Custom Leaflet marker pin icon (pure CSS/SVG, prevents missing asset issues)
const createPickerPinIcon = () => {
  return L.divIcon({
    className: 'custom-location-pin',
    html: `
      <div style="position: relative; top: -30px; left: -14px;">
        <div style="
          background: #ef4444;
          color: white;
          border: 2px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

const pickerPinIcon = createPickerPinIcon();

// Leaflet map click listener
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (coords: PinnedCoords) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Leaflet center adjuster
function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [center, map]);
  return null;
}

export const ReportItemForm: React.FC<ReportItemFormProps> = ({ type, onSubmit, onCancel }) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    location: '',
    color: '',
    isUrgent: false,
    tags: [] as string[],
  });

  // Manual location state
  const [locationMode, setLocationMode] = useState<'select' | 'manual'>('select');
  const [manualLocation, setManualLocation] = useState('');
  const [specificLocation, setSpecificLocation] = useState('');

  // Map pin state
  const [pinnedCoords, setPinnedCoords] = useState<PinnedCoords | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(CAMPUS_DEFAULT_CENTER);

  // Subcategories state
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);

  const [newTag, setNewTag] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCategoriesAndLocations();
  }, []);

  const fetchCategoriesAndLocations = async () => {
    try {
      const [categoriesResponse, locationsResponse] = await Promise.all([
        apiService.getCategories(),
        apiService.getLocations()
      ]);
      
      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data.categories || []);
      }
      
      if (locationsResponse.success && locationsResponse.data) {
        setLocations(locationsResponse.data.locations || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories and locations:', error);
    }
  };

  // Dynamic subcategories fetching on category change
  useEffect(() => {
    if (!formData.category) {
      setSubcategories([]);
      return;
    }

    const selected = categories.find(c => String(c.id) === String(formData.category));
    if (selected?.subcategories && selected.subcategories.length > 0) {
      setSubcategories(selected.subcategories);
    }

    let isMounted = true;
    setSubcategoriesLoading(true);

    apiService.getSubcategories(formData.category)
      .then(res => {
        if (isMounted && res.success && res.data?.subcategories) {
          setSubcategories(res.data.subcategories);
        }
      })
      .catch(err => {
        console.warn('Could not fetch subcategories for category', formData.category, err);
      })
      .finally(() => {
        if (isMounted) setSubcategoriesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [formData.category, categories]);

  // Handle location selection from dropdown
  const handleLocationSelect = (locId: string) => {
    setFormData(prev => ({ ...prev, location: locId }));
    if (!locId) return;

    const matched = locations.find(l => String(l.id) === String(locId));
    if (matched && matched.latitude && matched.longitude) {
      const lat = Number(matched.latitude);
      const lng = Number(matched.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setPinnedCoords({ lat, lng });
        setMapCenter([lat, lng]);
      }
    }
  };

  // Handle map click
  const handleMapPin = (coords: PinnedCoords) => {
    setPinnedCoords(coords);
    setMapCenter([coords.lat, coords.lng]);
  };

  const clearMapPin = () => {
    setPinnedCoords(null);
    setMapCenter(CAMPUS_DEFAULT_CENTER);
  };

  const colors = [
    'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 
    'Purple', 'Orange', 'Pink', 'Brown', 'Gray', 'Silver', 'Gold'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Item title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Please provide a descriptive explanation of at least 10 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a campus category';
    }

    if (locationMode === 'select' && !formData.location) {
      newErrors.location = 'Please select a campus recovery point or switch to custom location';
    }

    if (locationMode === 'manual' && !manualLocation.trim()) {
      newErrors.location = 'Please enter the specific campus location name';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      toast.error('Please resolve the highlighted form fields before submitting.');
      return;
    }

    setLoading(true);
    
    const submitData = new FormData();
    submitData.append('title', formData.title.trim());
    submitData.append('description', formData.description.trim());
    submitData.append('type', type);
    submitData.append('category_id', formData.category);
    if (formData.subcategory) {
      submitData.append('subcategory_id', formData.subcategory);
    }

    // Location payload
    if (locationMode === 'select') {
      submitData.append('location_id', formData.location);
    } else {
      submitData.append('custom_location', manualLocation.trim());
      submitData.append('location_name', manualLocation.trim());
    }

    if (specificLocation.trim()) {
      submitData.append('specific_location', specificLocation.trim());
    }

    // Pinned map coordinates
    if (pinnedCoords) {
      submitData.append('coordinates', JSON.stringify({
        lat: Number(pinnedCoords.lat.toFixed(6)),
        lng: Number(pinnedCoords.lng.toFixed(6))
      }));
    }

    if (formData.color) {
      submitData.append('color', formData.color);
    }

    submitData.append('is_urgent', formData.isUrgent.toString());
    
    if (formData.tags.length > 0) {
      submitData.append('tags', JSON.stringify(formData.tags));
    }
    
    images.forEach((image) => {
      submitData.append('images', image);
    });

    onSubmit(submitData)
      .then(() => {
        toast.success(`Your ${type} item report has been published successfully!`);
      })
      .catch((err: unknown) => {
        const msg = (err as Error)?.message || 'Failed to submit report. Please try again.';
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    if (images.length + files.length > 5) {
      toast.error('You can upload a maximum of 5 images per report.');
      return;
    }

    const validFiles: File[] = [];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`"${file.name}" is not a supported format. Please upload JPG, PNG, WEBP, or GIF images.`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        toast.error(`"${file.name}" exceeds the 5MB file size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setImages(prev => [...prev, ...validFiles]);
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviewUrls(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
      toast.info(`Added ${validFiles.length} image${validFiles.length > 1 ? 's' : ''} for cloud upload.`);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto p-3.5 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
        
        {/* Header with Graphic Era University Styling */}
        <div className="p-4.5 sm:p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white relative">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className={`inline-block px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                type === 'lost' 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {type === 'lost' ? 'Lost Property Filing' : 'Discovered Asset Log'}
              </span>

              <h2 className="text-xl sm:text-3xl font-black tracking-tight">
                Report {type === 'lost' ? 'Lost' : 'Found'} Item
              </h2>

              <p className="text-slate-300 text-xs sm:text-sm max-w-xl font-medium leading-relaxed">
                Provide accurate characteristics, campus location details, and photographs. The automated matching engine will immediately scan for potential recoveries.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4.5 sm:p-8 space-y-6 sm:space-y-8 text-xs sm:text-sm">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column: Core Asset Identity & Campus Location */}
            <div className="space-y-6">
              
              {/* Title Input */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                  Item Name / Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, title: e.target.value }));
                    if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                  }}
                  className={`w-full px-4 py-3 text-xs sm:text-sm border rounded-2xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all ${
                    fieldErrors.title ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
                  }`}
                  placeholder="e.g. Dell Inspiron 15 Laptop, Black Leather Wallet"
                />
                {fieldErrors.title && <p className="mt-1 text-xs text-red-600 font-bold">{fieldErrors.title}</p>}
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: '' }));
                  }}
                  className={`w-full px-4 py-3 text-xs sm:text-sm border rounded-2xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all ${
                    fieldErrors.description ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
                  }`}
                  placeholder="Describe unique characteristics, keychains, stickers, contents, or circumstances..."
                />
                {fieldErrors.description && <p className="mt-1 text-xs text-red-600 font-bold">{fieldErrors.description}</p>}
              </div>

              {/* Category & Subcategory Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    Primary Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, category: e.target.value, subcategory: '' }));
                      if (fieldErrors.category) setFieldErrors(prev => ({ ...prev, category: '' }));
                    }}
                    className={`w-full px-3.5 py-3 text-xs sm:text-sm border rounded-2xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium ${
                      fieldErrors.category ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
                    }`}
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category && <p className="mt-1 text-xs text-red-600 font-bold">{fieldErrors.category}</p>}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    Subcategory
                  </label>
                  <select
                    value={formData.subcategory}
                    onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                    disabled={!formData.category || subcategoriesLoading}
                    className="w-full px-3.5 py-3 text-xs sm:text-sm border border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium disabled:opacity-50"
                  >
                    <option value="">Select Subcategory (Optional)</option>
                    {subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location Picker Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" /> Campus Location *
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setLocationMode('select')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        locationMode === 'select' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      Campus Buildings
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationMode('manual')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        locationMode === 'manual' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      Custom Landmark
                    </button>
                  </div>
                </div>

                {locationMode === 'select' ? (
                  <select
                    value={formData.location}
                    onChange={(e) => {
                      handleLocationSelect(e.target.value);
                      if (fieldErrors.location) setFieldErrors(prev => ({ ...prev, location: '' }));
                    }}
                    className={`w-full px-3.5 py-3 text-xs sm:text-sm border rounded-2xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium ${
                      fieldErrors.location ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
                    }`}
                  >
                    <option value="">Choose Campus Facility / Desk...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.building ? `— ${loc.building}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={manualLocation}
                    onChange={(e) => {
                      setManualLocation(e.target.value);
                      if (fieldErrors.location) setFieldErrors(prev => ({ ...prev, location: '' }));
                    }}
                    className={`w-full px-3.5 py-3 text-xs sm:text-sm border rounded-2xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.location ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
                    }`}
                    placeholder="e.g. Near Basketball Court, Ground Floor Washroom"
                  />
                )}
                {fieldErrors.location && <p className="text-xs text-red-600 font-bold">{fieldErrors.location}</p>}

                {/* Specific Floor or Room */}
                <input
                  type="text"
                  value={specificLocation}
                  onChange={(e) => setSpecificLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white"
                  placeholder="Specific room / desk / seat number (e.g. Lab 3, Row 4)"
                />
              </div>

              {/* Interactive Campus Map Pinpoint */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5 text-blue-600" /> Interactive Campus Map Pin
                  </span>
                  {pinnedCoords && (
                    <button
                      type="button"
                      onClick={clearMapPin}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      Clear Pin
                    </button>
                  )}
                </div>

                <div className="h-48 rounded-2xl overflow-hidden border border-slate-200 relative">
                  <MapContainer
                    center={mapCenter}
                    zoom={16}
                    scrollWheelZoom={false}
                    className="w-full h-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onLocationSelect={handleMapPin} />
                    <MapCenterController center={mapCenter} />
                    {pinnedCoords && (
                      <Marker position={[pinnedCoords.lat, pinnedCoords.lng]} icon={pickerPinIcon} />
                    )}
                  </MapContainer>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Click on the Graphic Era campus map to pin exact recovery coordinates.</p>
              </div>

            </div>

            {/* Right Column: Physical Attributes, Tags & Cloud Storage Photo Upload */}
            <div className="space-y-6">
              
              {/* Color Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-indigo-600" /> Primary Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setFormData(prev => ({ ...prev, color: prev.color === c ? '' : c }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formData.color === c
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Builder */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-blue-600" /> Keywords & Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="e.g. Leather, Silver, Keychain, Water Bottle..."
                    className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Add Tag
                  </button>
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {formData.tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 rounded-xl text-xs font-bold border border-blue-200/60">
                        #{t}
                        <button type="button" onClick={() => removeTag(t)} className="text-blue-500 hover:text-rose-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Urgent Priority Flag */}
              <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isUrgent"
                  checked={formData.isUrgent}
                  onChange={(e) => setFormData(prev => ({ ...prev, isUrgent: e.target.checked }))}
                  className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="isUrgent" className="text-xs font-bold text-amber-950 cursor-pointer">
                  Mark as Urgent Priority (critical cards, IDs, keys, or prescription devices)
                </label>
              </div>

              {/* Photographic Evidence (Supabase Cloud Storage) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" /> Photographs (Max 5)
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">
                    {images.length}/5 uploaded
                  </span>
                </div>

                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-3xl p-6 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-colors">
                  <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Drag & drop item photos, or browse</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WEBP, or GIF up to 5MB each (Saved in Supabase Cloud Storage)</p>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="mt-3 text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>

                {/* Upload Preview Thumbnails */}
                {imagePreviewUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
                    {imagePreviewUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded-full transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-xl font-extrabold text-xs text-white shadow-md transition-all cursor-pointer ${
                type === 'lost'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
              } ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5 active:scale-98'}`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Publishing Report...' : `Submit ${type === 'lost' ? 'Lost' : 'Found'} Item Report`}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
