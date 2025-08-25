import { useMutation, useQueryClient, queryOptions } from "@tanstack/vue-query";
import { client, emailClient } from "./client.ts";
import type { AuthResponseBody, AuthRequestBody } from "@saflib/identity-spec";
import { TanstackError, handleClientMethod } from "@saflib/vue-spa";
import type { Ref } from "vue";

export const useLogin = () => {
  return useMutation<
    AuthResponseBody["loginUser"][200],
    TanstackError,
    AuthRequestBody["loginUser"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/login", { body }));
    },
  });
};

export const useLogout = () => {
  return useMutation<AuthResponseBody["logoutUser"][200], TanstackError>({
    mutationFn: () => {
      return handleClientMethod(client.POST("/auth/logout"));
    },
  });
};

export const useRegister = () => {
  return useMutation<
    AuthResponseBody["registerUser"][200],
    TanstackError,
    AuthRequestBody["registerUser"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/register", { body }));
    },
  });
};

export const useForgotPassword = () => {
  return useMutation<
    AuthResponseBody["forgotPassword"][200],
    TanstackError,
    AuthRequestBody["forgotPassword"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/forgot-password", { body }));
    },
  });
};

export const useResetPassword = () => {
  return useMutation<
    AuthResponseBody["resetPassword"][200],
    TanstackError,
    AuthRequestBody["resetPassword"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/reset-password", { body }));
    },
  });
};

export const useSetPassword = () => {
  return useMutation<
    AuthResponseBody["setPassword"][200],
    TanstackError,
    AuthRequestBody["setPassword"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/set-password", { body }));
    },
  });
};

export const useVerifyEmail = () => {
  return useMutation<
    AuthResponseBody["verifyEmail"][200],
    TanstackError,
    AuthRequestBody["verifyEmail"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/verify-email", { body }));
    },
  });
};

export const useResendVerification = () => {
  return useMutation<
    AuthResponseBody["resendVerification"][200],
    TanstackError
  >({
    mutationFn: async () => {
      return handleClientMethod(client.POST("/auth/resend-verification"));
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<
    AuthResponseBody["updateUserProfile"][200],
    TanstackError,
    AuthRequestBody["updateUserProfile"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.PUT("/auth/profile", { body }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const getProfile = () => {
  return queryOptions({
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
        emailClient.GET("/email/sent", {
          params: { query: { userEmail: email?.value } },
        }),
      );
    },
  };
};
