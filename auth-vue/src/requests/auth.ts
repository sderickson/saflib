import { useMutation } from "@tanstack/vue-query";
import { client } from "./client.ts";
import type { AuthResponse, AuthRequest } from "./types.ts";
import { TanstackError, handleClientMethod } from "@saflib/vue-spa";

export const useLogin = () => {
  return useMutation<
    AuthResponse["loginUser"][200],
    TanstackError<keyof AuthResponse["loginUser"]>,
    AuthRequest["loginUser"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/login", { body }));
    },
  });
};

export const useLogout = () => {
  return useMutation<
    AuthResponse["logoutUser"][200],
    TanstackError<keyof AuthResponse["logoutUser"]>
  >({
    mutationFn: () => {
      return handleClientMethod(client.POST("/auth/logout"));
    },
  });
};

export const useRegister = () => {
  return useMutation<
    AuthResponse["registerUser"][200],
    TanstackError<keyof AuthResponse["registerUser"]>,
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
    TanstackError<keyof AuthResponse["forgotPassword"]>,
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
    TanstackError<keyof AuthResponse["resetPassword"]>,
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
    TanstackError<keyof AuthResponse["verifyEmail"]>,
    AuthRequest["verifyEmail"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/verify-email", { body }));
    },
  });
};

export const useResendVerification = () => {
  return useMutation<
    AuthResponse["resendVerification"][200],
    TanstackError<keyof AuthResponse["resendVerification"]>
  >({
    mutationFn: async () => {
      return handleClientMethod(client.POST("/auth/resend-verification"));
    },
  });
};
