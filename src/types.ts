export interface UserProfile {
  id: string;
  email: string;
  nivel: string;
  cra: number;
  display_name: string;
  onboarding_complete?: boolean;
  active_subjects?: string[];
  total_points?: number;
}
