import { http } from "./http";
    
export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Reservation = {
  id: number;
  show: number;
  show_title?: string;
  customer_name: string;
  total: number;
  status: string;
  show_time: string;
  created_at: string;
};

export async function listReservationsPublicApi() {
  const { data } = await http.get<Paginated<Reservation>>("/api/reservations/");
  return data; // { ... , results: [] }
}

export async function listReservationsAdminApi() {
  const { data } = await http.get<Paginated<Reservation>>("/api/reservations/");
  return data;
}

export async function createReservationApi(payload: Omit<Reservation, "id" | "show_title" | "created_at" >) {
  const { data } = await http.post<Reservation>("/api/reservations/", payload);
  return data;
}

export async function updateReservationApi(id: number, payload: Partial<Reservation>) {
  const { data } = await http.put<Reservation>(`/api/reservations/${id}/`, payload);
  return data;
}

export async function deleteReservationApi(id: number) {
  await http.delete(`/api/reservations/${id}/`);
}