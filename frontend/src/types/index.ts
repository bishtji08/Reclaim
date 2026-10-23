export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'finder' | 'user';
  phone?: string;
  avatar?: string;
  avatar_url?: string;
  createdAt: Date;
  is_verified?: boolean;
  is_active?: boolean;
  is_blacklisted?: boolean;
  blacklist_reason?: string;
  blacklisted_at?: string;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  category_id?: number | string;
  category_name?: string;
  subcategory?: string;
  subcategory_id?: number | string;
  subcategory_name?: string;
  type: 'lost' | 'found';
  status: 'reported' | 'matched' | 'claimed' | 'returned' | 'closed';
  reportedBy: string;
  reported_by?: number | string;
  reportedByName: string;
  reported_by_name?: string;
  reportedAt: Date;
  reported_at?: string;
  location: {
    id?: number | string;
    name: string;
    coordinates?: { lat: number; lng: number };
  };
  location_id?: number | string;
  location_name?: string;
  specific_location?: string;
  images?: string[];
  tags: string[];
  color?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  serial_number?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  estimatedValue?: number;
  estimated_value?: number;
  rewardOffered?: number;
  reward_offered?: number;
  dateLostFound?: string;
  date_lost_found?: string;
  timeLostFound?: string;
  time_lost_found?: string;
  matchedWith?: string;
  matched_with?: number | string;
  claimedBy?: string;
  claimed_by?: number | string;
  claimedAt?: Date;
  claimed_at?: string;
  returnedAt?: Date;
  returned_at?: string;
  isUrgent?: boolean;
  is_urgent?: boolean;
  is_suspicious?: boolean;
  flag_reason?: string;
}

export interface Claim {
  id: string;
  itemId: string;
  item_id?: number | string;
  item_title?: string;
  item_type?: 'lost' | 'found';
  item_description?: string;
  claimerName: string;
  claimer_name?: string;
  claimerEmail: string;
  claimer_email?: string;
  claimerPhone?: string;
  claimer_phone?: string;
  description: string;
  proofImages?: Array<string | { id?: number; url: string; description?: string }>;
  proof_images?: Array<{ id?: number; url: string; description?: string }>;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  submittedAt: Date;
  submitted_at?: string;
  reviewedBy?: string;
  reviewed_by?: number | string;
  reviewer_name?: string;
  reviewedAt?: Date;
  reviewed_at?: string;
  reviewNotes?: string;
  review_notes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  user_id?: number | string;
  title: string;
  message: string;
  type: 'match' | 'claim' | 'system' | 'reminder' | 'status_update';
  isRead: boolean;
  is_read?: boolean;
  createdAt: Date;
  created_at?: string;
  relatedItemId?: string;
  related_item_id?: number | string;
  related_claim_id?: number | string;
  item_title?: string;
  claimer_name?: string;
}

export interface Analytics {
  total_lost_items?: number;
  total_found_items?: number;
  matched_items?: number;
  returned_items?: number;
  claimed_items?: number;
  urgent_items?: number;
  total_users?: number;
  active_users?: number;
  admin_users?: number;
  finder_users?: number;
  regular_users?: number;
  resolution_rate?: number;
  top_categories?: { category: string; count: string | number }[];
  top_locations?: { location: string; count: string | number }[];
  monthly_stats?: { month: string; lost: string | number; found: string | number; returned: string | number }[];
  totalLostItems?: number;
  totalFoundItems?: number;
  matchedItems?: number;
  returnedItems?: number;
  activeUsers?: number;
  topCategories?: { category: string; count: number }[];
  topLocations?: { location: string; count: number }[];
  resolutionRate?: number;
  monthlyStats?: { month: string; lost: number; found: number; returned: number }[];
  suspicious_items?: number;
  blacklisted_users?: number;
  pending_flags?: number;
  total_feedback?: number;
  avg_rating?: number;
  total_visitor_sessions?: number;
  live_active_visitors?: number;
  guest_visitors?: number;
  authenticated_visitors?: number;
}

export interface VisitorSessionSummary {
  total_visits: number;
  live_active_visitors: number;
  guest_visits: number;
  authenticated_visits: number;
  today_visits: number;
  week_visits: number;
  avg_pages_per_session?: number;
  avg_heartbeats_per_session?: number;
}

export interface VisitorTrendDay {
  date: string;
  formatted_date: string;
  total_visits: number;
  guest_visits: number;
  authenticated_visits: number;
}

export interface VisitorTrendWeek {
  week_label: string;
  week_start: string;
  total_visits: number;
  guest_visits: number;
  authenticated_visits: number;
}

export interface RecentVisitorSession {
  session_id: string;
  session_id_masked: string;
  visitor_type: 'guest' | 'authenticated';
  landing_path: string;
  last_path: string;
  device_type: string;
  browser_name: string;
  started_at: string;
  last_heartbeat_at: string;
  page_view_count: number;
  heartbeat_count: number;
  is_active: boolean;
  duration_seconds: number;
}

export interface VisitorDeviceStat {
  device_type: string;
  count: number;
}

export interface VisitorAnalyticsData {
  summary: VisitorSessionSummary;
  daily_trends: VisitorTrendDay[];
  weekly_trends: VisitorTrendWeek[];
  recent_sessions: RecentVisitorSession[];
  devices: VisitorDeviceStat[];
}

export interface Review {
  id: string | number;
  item_id: string | number;
  claim_id?: string | number;
  reviewer_id: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
  rating: number;
  comment?: string;
  was_returned: boolean;
  created_at: string;
  item_title?: string;
  item_type?: 'lost' | 'found';
}

export interface ItemFlag {
  id: string | number;
  item_id: string | number;
  flagged_by: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'resolved';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  item_title?: string;
  item_type?: 'lost' | 'found';
  item_status?: string;
  item_is_suspicious?: boolean;
  reporter_name?: string;
  flagger_name?: string;
  flagger_email?: string;
  reviewer_name?: string;
}

export interface CategoryItem {
  id: number | string;
  name: string;
  description?: string;
  icon?: string;
  subcategories?: Array<{ id: number | string; name: string; description?: string }>;
}
