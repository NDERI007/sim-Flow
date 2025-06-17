import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "", // empty = same origin
  withCredentials: true, // required for session cookies with NextAuth
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || "Something went wrong. Try again.";
    // Optionally toast here
    console.error("API Error:", message);
    return Promise.reject(error);
  }
);

export default api;
