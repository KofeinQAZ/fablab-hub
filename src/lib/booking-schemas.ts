import { z } from "zod";

// HTML tag detection regex - matches any HTML tag pattern
const HTML_TAG_PATTERN = /<[^>]*>/;

// Reusable schema validators aligned with PostgreSQL constraints
export const bookingTimeSchema = z.object({
  startTime: z
    .date()
    .refine(
      (date) => date > new Date(),
      "start_time must be in the future"
    )
    .refine(
      (date) => {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return date <= sevenDaysFromNow;
      },
      "start_time cannot be more than 7 days in the future"
    ),
  
  endTime: z.date(),
  
  durationHours: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 hour")
    .max(3, "Duration cannot exceed 3 hours"),
}).refine(
  (data) => data.endTime > data.startTime,
  {
    message: "end_time must be strictly after start_time",
    path: ["endTime"],
  }
).refine(
  (data) => {
    const durationMs = data.endTime.getTime() - data.startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    return Math.abs(durationHours - data.durationHours) < 0.1; // Account for floating point
  },
  {
    message: "Duration mismatch between calculated and specified duration",
    path: ["durationHours"],
  }
);

export const bookingMaterialSchema = z.object({
  materialUsed: z
    .string()
    .max(120, "material_used cannot exceed 120 characters")
    .refine(
      (value) => !HTML_TAG_PATTERN.test(value),
      "material_used cannot contain HTML tags"
    ),
});

// Complete booking creation schema
export const createBookingSchema = z.object({
  startTime: z
    .date()
    .refine(
      (date) => date > new Date(),
      "start_time must be in the future"
    )
    .refine(
      (date) => {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return date <= sevenDaysFromNow;
      },
      "start_time cannot be more than 7 days in the future"
    ),
  
  endTime: z.date(),
  
  durationHours: z
    .number()
    .int()
    .positive()
    .max(3, "Duration cannot exceed 3 hours"),
  
  materialUsed: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.length <= 120,
      "material_used cannot exceed 120 characters"
    )
    .refine(
      (value) => !value || !HTML_TAG_PATTERN.test(value),
      "material_used cannot contain HTML tags"
    ),
}).refine(
  (data) => data.endTime > data.startTime,
  {
    message: "end_time must be strictly after start_time",
    path: ["endTime"],
  }
).refine(
  (data) => {
    const durationMs = data.endTime.getTime() - data.startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    return Math.abs(durationHours - data.durationHours) < 0.1;
  },
  {
    message: "Duration mismatch between calculated and specified duration",
    path: ["durationHours"],
  }
);

// Type exports for use in components
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingTimeInput = z.infer<typeof bookingTimeSchema>;
export type BookingMaterialInput = z.infer<typeof bookingMaterialSchema>;
