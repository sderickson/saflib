console.log("email mocker called");
import { vi } from "vitest";

vi.mock("nodemailer", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("nodemailer")>();
  return {
    ...originalModule,
    createTransport: vi.fn().mockReturnValue({
      // Define the mock function directly within the returned object
      sendMail: vi.fn(),
    }),
  };
});

export * from "../index.ts";
