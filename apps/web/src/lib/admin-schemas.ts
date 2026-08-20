import { z } from "zod";

export const ROLE_SLUGS = ["admin", "editor", "viewer"] as const;

export const inviteMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  roleSlug: z.enum(ROLE_SLUGS),
});

export const updateMemberSchema = z.object({
  roleSlug: z.enum(ROLE_SLUGS).optional(),
  status: z.enum(["active", "invited", "inactive"]).optional(),
});
