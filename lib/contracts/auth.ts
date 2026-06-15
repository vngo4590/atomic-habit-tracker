import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254, "Email address is too long.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[A-Za-z]/, "Password must include a letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.")
  // bcrypt only hashes the first 72 bytes of input and silently ignores the
  // rest, so a longer password would have its tail truncated — weakening it and
  // letting two different long passwords collide. Reject anything over 72 bytes
  // (UTF-8) up front so what the user types is exactly what gets hashed.
  .refine((value) => new TextEncoder().encode(value).length <= 72, {
    message: "Password is too long (max 72 bytes).",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Name is too long."),
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export interface AuthFormState {
  ok: boolean;
  message: string;
  errors?: Partial<Record<keyof RegisterInput, string[]>>;
}

export const initialAuthFormState: AuthFormState = {
  ok: false,
  message: "",
};
