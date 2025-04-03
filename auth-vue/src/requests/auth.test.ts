import { describe, it, expect, vi, beforeEach } from "vitest";
import { withVueQuery } from "@saflib/vue-spa-dev/requests.ts";
import {
  useLogin,
  useLogout,
  useRegister,
  useForgotPassword,
  useResetPassword,
  useVerifyEmail,
  useResendVerification,
} from "./auth.ts";
import { client } from "./client.ts";

// Mock the client
vi.mock("./client.ts", () => ({ client: { POST: vi.fn() } }));

describe("auth requests", () => {
  const mockPOST = client.POST as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPOST.mockClear();
  });

  describe("useLogin", () => {
    const validCredentials = {
      email: "test@example.com",
      password: "password123",
    };

    it("should make a POST request to /auth/login with credentials", async () => {
      const mockResponse = {
        data: { id: 1, email: "test@example.com" },
        error: null,
      };
      mockPOST.mockResolvedValueOnce(mockResponse);

      const [result, app] = withVueQuery(() => useLogin());
      await result.mutateAsync(validCredentials);
      app.unmount();

      expect(mockPOST).toHaveBeenCalledWith("/auth/login", {
        body: validCredentials,
      });
    });

    it("should throw error when request fails", async () => {
      const mockError = { error: "Invalid credentials" };
      mockPOST.mockResolvedValueOnce({ error: mockError });

      const [result, app] = withVueQuery(() => useLogin());
      try {
        await result.mutateAsync(validCredentials);
        expect(true).toBe(false); // should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toEqual(mockError.error);
        }
      }
      app.unmount();
    });
  });

  describe("useLogout", () => {
    it("should make a POST request to /auth/logout", async () => {
      mockPOST.mockResolvedValueOnce({ error: null });

      const [result, app] = withVueQuery(() => useLogout());
      await result.mutateAsync();
      app.unmount();

      expect(mockPOST).toHaveBeenCalledWith("/auth/logout");
    });
  });

  describe("useRegister", () => {
    const validRegistration = {
      email: "test@example.com",
      password: "password123",
    };

    it("should make a POST request to /auth/register with user data", async () => {
      const mockResponse = {
        data: { id: 1, email: "test@example.com" },
        error: null,
      };
      mockPOST.mockResolvedValueOnce(mockResponse);

      const [result, app] = withVueQuery(() => useRegister());
      await result.mutateAsync(validRegistration);
      app.unmount();

      expect(mockPOST).toHaveBeenCalledWith("/auth/register", {
        body: validRegistration,
      });
    });

    it("should throw error when request fails", async () => {
      const mockError = { error: "Registration failed" };
      mockPOST.mockResolvedValueOnce({ error: mockError });

      const [result, app] = withVueQuery(() => useRegister());
      await result
        .mutateAsync(validRegistration)
        .then(() => {
          expect(true).toBe(false);
        })
        .catch((error) => {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.message).toEqual(mockError.error);
          }
        });
      app.unmount();
    });
  });

  describe("useForgotPassword", () => {
    it("should send forgot password request", async () => {
      // Mock the response
      const mockResponse = {
        success: true,
        message: "If the user exists, a recovery email was sent",
      };
      mockPOST.mockResolvedValueOnce({ data: mockResponse, error: null });

      // Set up the mutation
      const [result, app] = withVueQuery(() => useForgotPassword());

      // Execute the mutation
      await result.mutateAsync({ email: "test@example.com" });

      // Assert
      expect(mockPOST).toHaveBeenCalledWith("/auth/forgot-password", {
        body: { email: "test@example.com" },
      });
      expect(result.data.value).toEqual(mockResponse);

      // Clean up
      app.unmount();
    });

    it("should handle errors", async () => {
      // Mock the error response
      const mockError = { error: "Invalid email format" };
      mockPOST.mockResolvedValueOnce({ data: null, error: mockError });

      // Set up the mutation
      const [result, app] = withVueQuery(() => useForgotPassword());

      // Execute and expect error
      await result
        .mutateAsync({ email: "invalid" })
        .then(() => {
          expect(true).toBe(false);
        })
        .catch((error) => {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.message).toEqual(mockError.error);
          }
        });
      // Clean up
      app.unmount();
    });
  });

  describe("useResetPassword", () => {
    it("should send reset password request", async () => {
      // Mock the response
      const mockResponse = { success: true };
      mockPOST.mockResolvedValueOnce({ data: mockResponse, error: null });

      // Set up the mutation
      const [result, app] = withVueQuery(() => useResetPassword());

      // Execute the mutation
      await result.mutateAsync({
        token: "valid-token",
        newPassword: "new-password123",
      });

      // Assert
      expect(mockPOST).toHaveBeenCalledWith("/auth/reset-password", {
        body: {
          token: "valid-token",
          newPassword: "new-password123",
        },
      });
      expect(result.data.value).toEqual(mockResponse);

      // Clean up
      app.unmount();
    });

    it("should handle errors", async () => {
      // Mock the error response
      const mockError = { error: "Invalid token" };
      mockPOST.mockResolvedValueOnce({ data: null, error: mockError });

      // Set up the mutation
      const [result, app] = withVueQuery(() => useResetPassword());

      // Execute and expect error
      await expect(
        result.mutateAsync({
          token: "invalid-token",
          newPassword: "new-password123",
        }),
      ).rejects.toThrow("Invalid token");
      expect(result.isError.value).toBe(true);

      // Clean up
      app.unmount();
    });
  });

  describe("useVerifyEmail", () => {
    it("should send verify email request", async () => {
      // Mock the response
      const mockResponse = {
        id: 1,
        email: "test@example.com",
        verified: true,
      };
      mockPOST.mockResolvedValueOnce({ data: mockResponse, error: null });

      // Set up the mutation
      const [result, app] = withVueQuery(() => useVerifyEmail());

      // Execute the mutation
      await result.mutateAsync({ token: "valid-token" });

      // Assert
      expect(mockPOST).toHaveBeenCalledWith("/auth/verify-email", {
        body: { token: "valid-token" },
      });
      expect(result.data.value).toEqual(mockResponse);

      // Clean up
      app.unmount();
    });

    it("should handle errors", async () => {
      // Mock the error response
      const mockError = { error: "Invalid token" };
      mockPOST.mockResolvedValueOnce({ data: null, error: mockError });

      // Set up the mutation
      const [result, app] = withVueQuery(() => useVerifyEmail());

      // Execute and expect error
      await result
        .mutateAsync({ token: "invalid-token" })
        .then(() => {
          expect(true).toBe(false);
        })
        .catch((error) => {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.message).toEqual(mockError.error);
          }
        });
      // Clean up
      app.unmount();
    });
  });

  describe("useResendVerification", () => {
    it("should send resend verification request", async () => {
      // Mock the response
      const mockResponse = {
        success: true,
        message: "Verification email sent successfully",
      };
      mockPOST.mockResolvedValueOnce({ data: mockResponse, error: null });

      // Set up the mutation
      const [result, app] = withVueQuery(() => useResendVerification());

      // Execute the mutation
      await result.mutateAsync();

      // Assert
      expect(mockPOST).toHaveBeenCalledWith("/auth/resend-verification");
      expect(result.data.value).toEqual(mockResponse);

      // Clean up
      app.unmount();
    });

    it("should handle errors", async () => {
      // Mock the error response
      const mockError = { error: "User not logged in" };
      mockPOST.mockResolvedValueOnce({ data: null, error: mockError });

      // Set up the mutation
      const [result, app] = withVueQuery(() => useResendVerification());

      // Execute and expect error
      await result
        .mutateAsync()
        .then(() => {
          expect(true).toBe(false);
        })
        .catch((error) => {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.message).toEqual(mockError.error);
          }
        });

      // Clean up
      app.unmount();
    });
  });
});
