import { http } from "./http";
    
export async function loginApi(username: string, password: string) {
  const { data } = await http.post("/api/auth/login/", { username, password });
  return data as { access: string; refresh: string };
}