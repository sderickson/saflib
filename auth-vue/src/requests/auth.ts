import { useMutation } from "@tanstack/vue-query";
import { client } from "../client.ts";
import type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "./types.ts";

export const useLogin = () => {
  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const { data, error } = await client.POST("/auth/login", { body });
      if (error) {
        throw error;
      }
      return data;
    },
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: async () => {
      const { error } = await client.POST("/auth/logout");
      if (error) {
        throw error;
      }
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: async (body: RegisterRequest) => {
      const { data, error } = await client.POST("/auth/register", {
        body,
      });
      if (error) {
        throw error;
      }

      return data;
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (body: ForgotPasswordRequest) => {
      const { data, error } = await client.POST("/auth/forgot-password", {
        body,
      });
      if (error) {
        throw error;
      }
      return data;
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (body: ResetPasswordRequest) => {
      const { data, error } = await client.POST("/auth/reset-password", {
        body,
      });
      console.log("data", data);
      console.log("error", error);
      if (error) {
        throw error;
      }
      return data;
    },
  });
};
