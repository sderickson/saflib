import { describe, it, expect, vi, beforeEach } from "vitest";
import { withVueQuery } from "@saflib/vue-spa-dev/requests.ts";
import {
  useLogin,
  useLogout,
  useRegister,
  useForgotPassword,
  useResetPassword,
} from "./auth.ts";
import { client } from "../client.ts";

// Mock the client
vi.mock("../client.ts", () => ({ client: { POST: vi.fn() } }));

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
      const mockError = { message: "Invalid credentials" };
      mockPOST.mockResolvedValueOnce({ error: mockError });

      const [result, app] = withVueQuery(() => useLogin());
      await expect(result.mutateAsync(validCredentials)).rejects.toEqual(
        mockError,
      );
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

    it("should throw error when request fails", async () => {
      const mockError = { message: "Logout failed" };
      mockPOST.mockResolvedValueOnce({ error: mockError });

      const [result, app] = withVueQuery(() => useLogout());
      await expect(result.mutateAsync()).rejects.toEqual(mockError);
      app.unmount();
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
      const mockError = { message: "Registration failed" };
      mockPOST.mockResolvedValueOnce({ error: mockError });

      const [result, app] = withVueQuery(() => useRegister());
      await expect(result.mutateAsync(validRegistration)).rejects.toEqual(
        mockError,
      );
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
      const mockError = new Error("Invalid email format");
      mockPOST.mockResolvedValueOnce({ data: null, error: mockError });

      // Set up the mutation
      const [result, app] = withVueQuery(() => useForgotPassword());

      // Execute and expect error
      await expect(result.mutateAsync({ email: "invalid" })).rejects.toThrow(
        "Invalid email format",
      );
      expect(result.isError.value).toBe(true);

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
      const mockError = new Error("Invalid token");
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
});
