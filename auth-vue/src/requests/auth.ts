import { useMutation, useQuery } from "@tanstack/vue-query";
import { client } from "./client.ts";
import type { AuthResponse, AuthRequest } from "./types.ts";
import { TanstackError, handleClientMethod } from "@saflib/vue-spa";

export const useLogin = () => {
  return useMutation<
    AuthResponse["loginUser"][200],
    TanstackError,
    AuthRequest["loginUser"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/login", { body }));
    },
  });
};

export const useLogout = () => {
  return useMutation<AuthResponse["logoutUser"][200], TanstackError>({
    mutationFn: () => {
      return handleClientMethod(client.POST("/auth/logout"));
    },
  });
};

export const useRegister = () => {
  return useMutation<
    AuthResponse["registerUser"][200],
    TanstackError,
    AuthRequest["registerUser"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/register", { body }));
    },
  });
};

export const useForgotPassword = () => {
  return useMutation<
    AuthResponse["forgotPassword"][200],
    TanstackError,
    AuthRequest["forgotPassword"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/forgot-password", { body }));
    },
  });
};

export const useResetPassword = () => {
  return useMutation<
    AuthResponse["resetPassword"][200],
    TanstackError,
    AuthRequest["resetPassword"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/reset-password", { body }));
    },
  });
};

export const useVerifyEmail = () => {
  return useMutation<
    AuthResponse["verifyEmail"][200],
    TanstackError,
    AuthRequest["verifyEmail"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/verify-email", { body }));
    },
  });
};

export const useResendVerification = () => {
  return useMutation<AuthResponse["resendVerification"][200], TanstackError>({
    mutationFn: async () => {
      return handleClientMethod(client.POST("/auth/resend-verification"));
    },
  });
};

export const useVerify = () => {
  return useQuery<AuthResponse["verifyAuth"][200], TanstackError>({
    queryKey: ["verify"],
    queryFn: async () => {
      return handleClientMethod(client.GET("/auth/verify"));
    },
  });
};
