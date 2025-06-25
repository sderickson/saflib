import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { client } from "./client.ts";
import type { AuthResponse, AuthRequest } from "./types.ts";
import { TanstackError, handleClientMethod } from "@saflib/vue-spa";
import type { Ref } from "vue";

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

export const useSetPassword = () => {
  return useMutation<
    AuthResponse["setPassword"][200],
    TanstackError,
    AuthRequest["setPassword"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/set-password", { body }));
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

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<
    AuthResponse["updateUserProfile"][200],
    TanstackError,
    AuthRequest["updateUserProfile"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.PUT("/auth/profile", { body }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useGetProfile = () => {
  return useQuery<AuthResponse["getUserProfile"][200], TanstackError>({
    queryKey: ["profile"],
    queryFn: async () => {
      return handleClientMethod(client.GET("/auth/profile"));
    },
  });
};

export const getSentAuthEmails = (email?: Ref<string | undefined>) => {
  return {
    queryKey: ["sent-emails", "auth", email],
    queryFn: async () => {
      return handleClientMethod(
        client.GET("/auth/email/sent", {
          params: { query: { userEmail: email?.value } },
        }),
      );
    },
  };
};
