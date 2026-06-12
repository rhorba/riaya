import { z } from "zod";

// ── Primitives ───────────────────────────────────────────────────────────────

export const RoleSchema = z.enum(["family", "caregiver", "employer", "admin"]);

export const CareTypeSchema = z.enum([
  "daya",
  "nanny",
  "after_school",
  "nursery_assistant",
  "babysitter",
]);

export const VerificationLevelSchema = z.enum([
  "unverified",
  "id_checked",
  "cin_verified",
  "background_cleared",
  "certified",
]);

export const BookingStatusSchema = z.enum([
  "requested",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "disputed",
]);

export const DocumentTypeSchema = z.enum([
  "cin",
  "health_cert",
  "police_clearance",
  "reference",
  "certificate",
]);

/** Money: integer centimes, non-negative */
export const MoneySchema = z.number().int().nonnegative();

// ── Auth ─────────────────────────────────────────────────────────────────────

export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(2).max(100),
  role: z.enum(["family", "caregiver", "employer"]),
});

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Caregiver ────────────────────────────────────────────────────────────────

export const CaregiverProfileCreateSchema = z.object({
  bio: z.string().max(1000).optional(),
  careTypes: z.array(CareTypeSchema).min(1),
  cities: z.array(z.string().max(100)).min(1),
  languages: z.array(z.string().max(50)).min(1),
  hourlyRate: MoneySchema.optional(),
  dailyRate: MoneySchema.optional(),
  monthlyRate: MoneySchema.optional(),
  minAgeMonths: z.number().int().min(0).max(240).optional(),
  maxAgeYears: z.number().int().min(0).max(18).optional(),
  maxChildren: z.number().int().min(1).max(10).default(1),
  hasOwnSpace: z.boolean().default(false),
});

export const CaregiverProfileUpdateSchema = CaregiverProfileCreateSchema.partial();

// ── Family ───────────────────────────────────────────────────────────────────

export const ChildRecordSchema = z.object({
  name: z.string().min(1).max(100),
  ageMonths: z.number().int().min(0).max(216),
  specialNeeds: z.string().max(500).optional(),
});

export const FamilyProfileCreateSchema = z.object({
  address: z.string().max(300).optional(),
  neighborhood: z.string().max(100).optional(),
  city: z.string().min(1).max(100),
  children: z.array(ChildRecordSchema).max(10).default([]),
});

export const FamilyProfileUpdateSchema = FamilyProfileCreateSchema.partial();

// ── Employer ─────────────────────────────────────────────────────────────────

export const EmployerAccountCreateSchema = z.object({
  companyName: z.string().min(2).max(200),
  ice: z
    .string()
    .regex(/^\d{15}$/)
    .optional(),
  sector: z.string().max(100).optional(),
  benefitBudgetPerEmployee: MoneySchema,
});

export const EnrolledEmployeeSchema = z.object({
  employeeEmail: z.string().email(),
  employeeName: z.string().min(2).max(100),
  monthlyBenefit: MoneySchema,
});

// ── Booking ──────────────────────────────────────────────────────────────────

export const BookingRequestSchema = z
  .object({
    caregiverId: z.string().cuid2(),
    careType: CareTypeSchema,
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    locationNote: z.string().max(300).optional(),
    childrenCount: z.number().int().min(1).max(10),
    familyNotes: z.string().max(1000).optional(),
    urgent: z.boolean().default(false),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export const BookingDeclineSchema = z.object({
  cancelReason: z.string().min(1).max(500),
});

// ── Search ───────────────────────────────────────────────────────────────────

export const CaregiverSearchSchema = z.object({
  careType: CareTypeSchema.optional(),
  city: z.string().optional(),
  minRating: z.number().min(1).max(5).optional(),
  maxHourlyRate: MoneySchema.optional(),
  verificationLevel: VerificationLevelSchema.optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

// ── Review ───────────────────────────────────────────────────────────────────

export const ReviewCreateSchema = z.object({
  bookingId: z.string().cuid2(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
