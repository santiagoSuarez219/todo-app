import apiClient from "@/lib/api-client";
import { LoginDto, AuthUser } from "@/types";

export async function login(dto: LoginDto): Promise<AuthUser> {
  const response = await apiClient.post<any>("/auth/login", dto);
  return response.data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getMe(): Promise<AuthUser> {
  const response = await apiClient.get<any>("/auth/me");
  return response.data.data;
}
