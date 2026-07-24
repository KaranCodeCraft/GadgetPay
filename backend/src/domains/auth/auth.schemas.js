import { z } from "zod";

export const sendOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone must be a 10 digit Indian number"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  otp: z.string().regex(/^\d{4,6}$/),
  name: z.string().min(2).max(80).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(20),
});

export const adminDevLoginSchema = z.object({
  key: z.string().min(4),
  adminId: z.string().min(2).default("admin-1"),
});

export const verifyUserOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  otp: z.string().regex(/^\d{4,6}$/),
  name: z.string().min(2).max(80).optional(),
});
