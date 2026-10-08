export interface User {
  id: number;
  name: string;
  email: string;
  role: 'worker' | 'customer';
  phone?: string;
  created_at: string;
}

export interface WorkerProfile {
  id: number;
  user_id: number;
  skills: string[];
  location_text: string;
  lat: number | null;
  lng: number | null;
  availability_start: string;
  availability_end: string;
  available_days: string[];
  expected_payment: number;
  daily_goal: number;
  max_distance_km: number;
  bio?: string;
  user_name?: string;
  average_rating: number;
  review_count: number;
}

export interface Job {
  id: number;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  title: string;
  required_skill: string;
  description?: string;
  location_text: string;
  lat: number | null;
  lng: number | null;
  date: string;
  start_time: string;
  end_time: string;
  budget: number;
  status: 'available' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assigned_worker_id?: number | null;
  assigned_worker_name?: string | null;
  assigned_worker_phone?: string | null;
  start_code?: string | null;
  created_at: string;
  applications_count?: number;
}

export interface Application {
  id: number;
  job_id: number;
  worker_id: number;
  worker_name?: string;
  worker_skills?: string[];
  worker_rating?: number;
  worker_review_count?: number;
  worker_phone?: string;
  match_score: number;
  score_breakdown: Record<string, any>;
  status: 'applied' | 'accepted' | 'rejected' | 'withdrawn';
  applied_at: string;
  job?: Job;
}

export interface FactorBreakdownItem {
  raw: number;
  weight: number;
  points: number;
  reason: string;
  distance_km?: number | null;
}

export interface MatchEvaluation {
  worker_id: number;
  job_id: number;
  total_score: number;
  breakdown: {
    skill: FactorBreakdownItem;
    location: FactorBreakdownItem;
    availability: FactorBreakdownItem;
    rating: FactorBreakdownItem;
    payment: FactorBreakdownItem;
  };
  distance_km: number | null;
  flags: {
    approximate_location: boolean;
    schedule_conflict: boolean;
    new_worker: boolean;
    skill_mismatch: boolean;
    not_eligible: boolean;
  };
  reasons: string[];
  not_eligible: boolean;
  worker_summary?: {
    id: number;
    name: string;
    skills: string[];
    location_text: string;
    average_rating: number;
    review_count: number;
    expected_payment: number;
  };
  job_summary?: {
    id: number;
    title: string;
    required_skill: string;
    location_text: string;
    date: string;
    start_time: string;
    end_time: string;
    budget: number;
    status: string;
  };
  ai_explanation?: string | null;
}

export interface EarningPlan {
  date: string;
  daily_goal: number;
  chosen_jobs: Array<{
    job_id: number;
    title: string;
    required_skill: string;
    location_text: string;
    start_time: string;
    end_time: string;
    budget: number;
    match_score: number;
  }>;
  total_earnings: number;
  goal_progress_percent: number;
  remaining_gap: number;
  message: string;
}

export interface Review {
  id: number;
  job_id: number;
  reviewer_id: number;
  reviewer_name?: string;
  reviewee_id: number;
  stars: number;
  comment?: string;
  created_at: string;
}

export interface Payment {
  id: number;
  job_id: number;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  payload: Record<string, any>;
  read: boolean;
  created_at: string;
}

export interface WorkerStats {
  jobs_available: number;
  jobs_applied: number;
  jobs_accepted: number;
  jobs_completed: number;
  total_earned: number;
  potential_earnings: number;
  daily_goal: number;
  goal_progress_percent: number;
}

export interface CustomerStats {
  jobs_posted: number;
  applications_received: number;
  jobs_assigned: number;
  jobs_completed: number;
  total_spent: number;
}

export interface GeocodeSuggestion {
  name: string;
  formatted: string;
  lat: number;
  lng: number;
}
