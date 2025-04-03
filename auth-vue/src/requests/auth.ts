import { useMutation } from "@tanstack/vue-query";
import { type FetchResponse } from "openapi-fetch";
import { client } from "./client.ts";
import type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from "./types.ts";

const handleResponse = async (
  request: Promise<FetchResponse<any, any, any>>,
) => {
  const { data, error } = await request;
  if (error) {
    if (error.error) {
      throw new Error(error.error);
    }
    throw new Error("Unknown error");
  }
  return data;
};

export const useLogin = () => {
  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      return handleResponse(client.POST("/auth/login", { body }));
    },
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: async () => {
      return handleResponse(client.POST("/auth/logout"));
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: async (body: RegisterRequest) => {
      return handleResponse(client.POST("/auth/register", { body }));
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (body: ForgotPasswordRequest) => {
      return handleResponse(client.POST("/auth/forgot-password", { body }));
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (body: ResetPasswordRequest) => {
      return handleResponse(client.POST("/auth/reset-password", { body }));
    },
  });
};

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: async (body: VerifyEmailRequest) => {
      return handleResponse(client.POST("/auth/verify-email", { body }));
    },
  });
};

export const useResendVerification = () => {
  return useMutation({
    mutationFn: async () => {
      return handleResponse(client.POST("/auth/resend-verification"));
    },
  });
};
