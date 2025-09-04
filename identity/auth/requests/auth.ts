import { useMutation, useQueryClient, queryOptions } from "@tanstack/vue-query";
import { client, emailClient } from "./client.ts";
import type {
  IdentityResponseBody,
  IdentityRequestBody,
} from "@saflib/identity-spec";
import { TanstackError, handleClientMethod } from "@saflib/sdk";
import type { Ref } from "vue";

export const useLogin = () => {
  return useMutation({
    mutationFn: (body: IdentityRequestBody["loginUser"]) => {
      return handleClientMethod(client.POST("/auth/login", { body }));
    },
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: () => {
      return handleClientMethod(client.POST("/auth/logout"));
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: (body: IdentityRequestBody["registerUser"]) => {
      return handleClientMethod(client.POST("/auth/register", { body }));
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (body: IdentityRequestBody["forgotPassword"]) => {
      return handleClientMethod(client.POST("/auth/forgot-password", { body }));
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (body: IdentityRequestBody["resetPassword"]) => {
      return handleClientMethod(client.POST("/auth/reset-password", { body }));
    },
  });
};

export const useSetPassword = () => {
  return useMutation({
    mutationFn: (body: IdentityRequestBody["setPassword"]) => {
      return handleClientMethod(client.POST("/auth/set-password", { body }));
    },
  });
};

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: (body: IdentityRequestBody["verifyEmail"]) => {
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
  return useMutation({
    mutationFn: (body: IdentityRequestBody["updateUserProfile"]) => {
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
