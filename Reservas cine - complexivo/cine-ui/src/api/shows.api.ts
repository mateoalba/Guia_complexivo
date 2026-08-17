import { http } from "./http";
    
export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Show = {
  id: number;
  title: string;
  genre: string;
  duration_minutes: number;
  rating: string;
  is_active: boolean;
  created_at: string;
};

export async function listShowsApi() {
  const { data } = await http.get<Paginated<Show>>("/api/shows/");
  return data; // { ... , results: [] }
}


export async function createShowApi(payload: Omit<Show, "id" | "created_at">) {
  const { data } = await http.post<Show>("/api/shows/", payload);
  return data;
}

export async function updateShowApi(id: number, payload: Partial<Show>) {
  const { data } = await http.put<Show>(`/api/shows/${id}/`, payload);
  return data;
}

export async function deleteShowApi(id: number) {
  await http.delete(`/api/shows/${id}/`);
}