import { useMutation } from "@tanstack/vue-query";
import { client } from "./client.ts";
import type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from "./types.ts";

export const useLogin = () => {
  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const { data, error } = await client.POST("/auth/login", { body });
      if (error) {
        throw new Error(error.error);
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
      if (error) {
        throw error;
      }
      return data;
    },
  });
};

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: async (body: VerifyEmailRequest) => {
      const { data, error } = await client.POST("/auth/verify-email", {
        body,
      });
      if (error) {
        throw error;
      }
      return data;
    },
  });
};

export const useResendVerification = () => {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST("/auth/resend-verification");
      if (error) {
        throw error;
      }
      return data;
    },
  });
};
