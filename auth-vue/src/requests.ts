import { useMutation } from "@tanstack/vue-query";
import type { LoginRequest, UserResponse } from "@saflib/auth-spec";

const API_BASE_URL = "/api";

export const useLogin = () => {
  return useMutation<UserResponse, Error, LoginRequest>({
    mutationFn: async (data) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to login");
      }

      return response.json();
    },
  });
};
