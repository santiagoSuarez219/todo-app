import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "Error desconocido";

    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;

      if (currentPath !== "/login" && !currentPath.startsWith("/auth")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(new Error(message));
  },
);

export default apiClient;
