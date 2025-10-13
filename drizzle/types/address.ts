import { text } from "drizzle-orm/sqlite-core";

/**
 * A shared address type that can be used across the platform.
 */
export interface Address {
  formatted: string | null;
  street_address: string | null;
  locality: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
}

/**
 * Drizzle schema for Address type.
 * Use this in your table definitions for address fields.
 */
export const addressSchema = {
  formatted: text("formatted"),
  street_address: text("street_address"),
  locality: text("locality"),
  region: text("region"),
  country: text("country"),
  postal_code: text("postal_code"),
};
