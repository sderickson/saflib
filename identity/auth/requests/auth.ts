import { useMutation, useQueryClient, queryOptions } from "@tanstack/vue-query";
import { client, emailClient } from "./client.ts";
import type {
  IdentityResponseBody,
  IdentityRequestBody,
} from "@saflib/identity-spec";
import { TanstackError, handleClientMethod } from "@saflib/vue-spa";
import type { Ref } from "vue";

export const useLogin = () => {
  return useMutation<
    IdentityResponseBody["loginUser"][200],
    TanstackError,
    IdentityRequestBody["loginUser"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/login", { body }));
    },
  });
};

export const useLogout = () => {
  return useMutation<IdentityResponseBody["logoutUser"][200], TanstackError>({
    mutationFn: () => {
      return handleClientMethod(client.POST("/auth/logout"));
    },
  });
};

export const useRegister = () => {
  return useMutation<
    IdentityResponseBody["registerUser"][200],
    TanstackError,
    IdentityRequestBody["registerUser"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/register", { body }));
    },
  });
};

export const useForgotPassword = () => {
  return useMutation<
    IdentityResponseBody["forgotPassword"][200],
    TanstackError,
    IdentityRequestBody["forgotPassword"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/forgot-password", { body }));
    },
  });
};

export const useResetPassword = () => {
  return useMutation<
    IdentityResponseBody["resetPassword"][200],
    TanstackError,
    IdentityRequestBody["resetPassword"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/reset-password", { body }));
    },
  });
};

export const useSetPassword = () => {
  return useMutation<
    IdentityResponseBody["setPassword"][200],
    TanstackError,
    IdentityRequestBody["setPassword"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/set-password", { body }));
    },
  });
};

export const useVerifyEmail = () => {
  return useMutation<
    IdentityResponseBody["verifyEmail"][200],
    TanstackError,
    IdentityRequestBody["verifyEmail"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/auth/verify-email", { body }));
    },
  });
};

export const useResendVerification = () => {
  return useMutation<
    IdentityResponseBody["resendVerification"][200],
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
    IdentityResponseBody["updateUserProfile"][200],
    TanstackError,
    IdentityRequestBody["updateUserProfile"]
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
