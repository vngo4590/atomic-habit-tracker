/**
 * Shared Zod building blocks used by more than one feature's contracts: a
 * calendar day written as "YYYY-MM-DD" and a list of non-empty strings
 * (tags, values, accountability partners). Keeping them here means every
 * feature validates dates and lists the same way.
 */

import { z } from "zod";

export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date key.");
export const stringListSchema = z.array(z.string().trim().min(1)).default([]);
