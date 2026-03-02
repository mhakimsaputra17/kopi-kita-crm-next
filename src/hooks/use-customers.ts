import { useQuery } from "@tanstack/react-query";

interface Customer {
  id: string;
  name: string;
  contact: string | null;
  favoriteDrink: string;
  interestTags: string[];
  createdAt: string;
}

interface CustomersResponse {
  customers: Customer[];
  total: number;
  totalPages: number;
  page: number;
}

interface UseCustomersParams {
  search?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

async function fetchCustomers(params: UseCustomersParams): Promise<CustomersResponse> {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.tags) {
    for (const tag of params.tags) {
      searchParams.append("tags", tag);
    }
  }

  const res = await fetch(`/api/customers?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
}

export function useCustomers(params: UseCustomersParams = {}) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => fetchCustomers(params),
  });
}
