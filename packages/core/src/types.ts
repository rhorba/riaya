import type { Money } from "./money.js";

export type Role = "family" | "caregiver" | "employer" | "admin";

export type CareType = "daya" | "nanny" | "after_school" | "nursery_assistant" | "babysitter";

export type VerificationLevel =
  | "unverified"
  | "id_checked"
  | "cin_verified"
  | "background_cleared"
  | "certified";

export type BookingStatus =
  | "requested"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export type DocumentType = "cin" | "health_cert" | "police_clearance" | "reference" | "certificate";

export type DocumentStatus = "pending" | "approved" | "rejected" | "expired";

export type EscrowStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "released"
  | "refunded"
  | "disputed";

export type AuditAction =
  | "create"
  | "update"
  | "cancel"
  | "verify"
  | "release"
  | "dispute"
  | "refund";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  city?: string;
  avatarUrl?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
};

export type CaregiverProfile = {
  id: string;
  userId: string;
  bio?: string;
  careTypes: CareType[];
  cities: string[];
  languages: string[];
  hourlyRate?: Money;
  dailyRate?: Money;
  monthlyRate?: Money;
  minAgeMonths?: number;
  maxAgeYears?: number;
  maxChildren: number;
  hasOwnSpace: boolean;
  verificationLevel: VerificationLevel;
  documents: VerificationDocument[];
  avgRating: number;
  reviewCount: number;
  completedBookings: number;
  responseRate: number;
  punctualityScore: number;
  skillVector?: number[];
  createdAt: Date;
  updatedAt: Date;
};

export type VerificationDocument = {
  id: string;
  caregiverId: string;
  type: DocumentType;
  fileUrl: string;
  status: DocumentStatus;
  expiresAt?: Date;
  adminNote?: string;
  uploadedAt: Date;
  reviewedAt?: Date;
};

export type FamilyProfile = {
  id: string;
  userId: string;
  address?: string;
  neighborhood?: string;
  city: string;
  children: ChildRecord[];
  savedCaregiverIds: string[];
  createdAt: Date;
};

export type ChildRecord = {
  id: string;
  name: string;
  ageMonths: number;
  specialNeeds?: string;
};

export type EmployerAccount = {
  id: string;
  userId: string;
  companyName: string;
  ice?: string;
  sector?: string;
  benefitBudgetPerEmployee: Money;
  enrolledEmployees: EnrolledEmployee[];
  totalBudgetUsed: Money;
  createdAt: Date;
};

export type EnrolledEmployee = {
  id: string;
  employerAccountId: string;
  employeeEmail: string;
  employeeName: string;
  monthlyBenefit: Money;
  userId?: string;
  active: boolean;
};

export type Booking = {
  id: string;
  caregiverId: string;
  familyId: string;
  employerAccountId?: string;
  careType: CareType;
  startTime: Date;
  endTime: Date;
  locationNote?: string;
  childrenCount: number;
  status: BookingStatus;
  familyNotes?: string;
  cancelReason?: string;
  urgent: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Escrow = {
  id: string;
  bookingId: string;
  familyId: string;
  caregiverId: string;
  grossAmount: Money;
  employerSubsidy: Money;
  familyPays: Money;
  platformFeeFromFamily: Money;
  platformFeeFromCaregiver: Money;
  caregiverPayout: Money;
  status: EscrowStatus;
  gatewayRef?: string;
  authorizedAt?: Date;
  capturedAt?: Date;
  releasedAt?: Date;
  disputeWindowEndsAt?: Date;
  createdAt: Date;
};

export type AvailabilitySlot = {
  id: string;
  caregiverId: string;
  dayOfWeek?: number;
  date?: Date;
  startTime: string;
  endTime: string;
  available: boolean;
};

export type Review = {
  id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  reviewerRole: "family" | "caregiver";
  createdAt: Date;
};

export type AuditLog = {
  id: string;
  actorUserId: string;
  entity: string;
  entityId: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  at: Date;
};
