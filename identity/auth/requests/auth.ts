import { useMutation, useQueryClient, queryOptions } from "@tanstack/vue-query";
import { getClient, getEmailClient } from "./client.ts";
import type {
  IdentityResponseBody,
  IdentityRequestBody,
} from "@saflib/identity-spec";
import { TanstackError, handleClientMethod } from "@saflib/sdk";
import type { Ref } from "vue";

export const useLogin = () => {
  return useMutation({
    mutationFn: (body: IdentityRequestBody["loginUser"]) => {
      return handleClientMethod(getClient().POST("/auth/login", { body }));
    },
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: () => {
      return handleClientMethod(getClient().POST("/auth/logout"));
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: (body: IdentityRequestBody["registerUser"]) => {
      return handleClientMethod(getClient().POST("/auth/register", { body }));
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (body: IdentityRequestBody["forgotPassword"]) => {
      return handleClientMethod(
        getClient().POST("/auth/forgot-password", { body }),
      );
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (body: IdentityRequestBody["resetPassword"]) => {
      return handleClientMethod(
        getClient().POST("/auth/reset-password", { body }),
      );
    },
  });
};

export const useSetPassword = () => {
  return useMutation({
    mutationFn: (body: IdentityRequestBody["setPassword"]) => {
      return handleClientMethod(
        getClient().POST("/auth/set-password", { body }),
      );
    },
  });
};

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: (body: IdentityRequestBody["verifyEmail"]) => {
      return handleClientMethod(
        getClient().POST("/auth/verify-email", { body }),
      );
    },
  });
};

export const useResendVerification = () => {
  return useMutation<
    IdentityResponseBody["resendVerification"][200],
    TanstackError
  >({
    mutationFn: async () => {
      return handleClientMethod(getClient().POST("/auth/resend-verification"));
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: IdentityRequestBody["updateUserProfile"]) => {
      return handleClientMethod(getClient().PUT("/auth/profile", { body }));
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
      return handleClientMethod(getClient().GET("/auth/profile"));
    },
  });
};

export const getSentAuthEmails = (email?: Ref<string | undefined>) => {
  return {
    queryKey: ["sent-emails", "auth", email],
    queryFn: async () => {
      return handleClientMethod(
        getEmailClient().GET("/email/sent", {
          params: { query: { userEmail: email?.value } },
        }),
      );
    },
  };
};
