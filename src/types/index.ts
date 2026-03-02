export interface Customer {
  id: string;
  name: string;
  contact: string | null;
  favoriteDrink: string;
  interestTags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PromoCampaign {
  id: string;
  theme: string;
  segment: string;
  customerCount: number;
  whyNow: string;
  message: string;
  timeWindow: string | null;
  createdAt: Date;
}

export interface DashboardStats {
  totalCustomers: number;
  totalTags: number;
  activeCampaigns: number;
  topInterests: Array<{ tag: string; count: number }>;
}
