import axios from "axios";

// const apiClient = axios.create({
//   baseURL: '/api/v1',
//   headers: { 'Content-Type': 'application/json' },
// });

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api/v1",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "Error desconocido";
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
