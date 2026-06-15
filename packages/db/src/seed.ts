import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { authDb } from "./client.js";
import {
  availabilitySlots,
  caregiverProfiles,
  employerAccounts,
  enrolledEmployees,
  familyProfiles,
  users,
} from "./schema/index.js";

/**
 * Idempotent demo seed (CLAUDE.md §8). Run with: pnpm --filter @riaya/db db:seed
 *
 * Uses the privileged (authDb) connection — seeding is a system operation that
 * legitimately runs without a per-user RLS context. Re-running is safe: users are
 * keyed by unique email, profiles by unique userId (onConflictDoNothing).
 *
 * Demo logins (all password: demo1234):
 *   family:    sara@demo.riaya.ma
 *   caregiver: fatima@demo.riaya.ma
 *   employer:  drh@demo-corp.riaya.ma
 */

const ARGON2ID_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

const DEMO_PASSWORD = "demo1234";

// 1 dirham = 100 centimes
const mad = (dirhams: number) => dirhams * 100;

type Seedling = {
  email: string;
  name: string;
  role: "family" | "caregiver" | "employer";
  city: string;
  phone?: string;
};

// ── Users ────────────────────────────────────────────────────────────────────
const caregiverUsers: Seedling[] = [
  {
    email: "fatima@demo.riaya.ma",
    name: "Fatima Zahra Bennani",
    role: "caregiver",
    city: "Casablanca",
  },
  { email: "khadija@demo.riaya.ma", name: "Khadija El Amrani", role: "caregiver", city: "Rabat" },
  { email: "amina@demo.riaya.ma", name: "Amina Tazi", role: "caregiver", city: "Casablanca" },
  { email: "naima@demo.riaya.ma", name: "Naima Ouazzani", role: "caregiver", city: "Marrakech" },
  { email: "samira@demo.riaya.ma", name: "Samira El Fassi", role: "caregiver", city: "Fès" },
  { email: "zahra@demo.riaya.ma", name: "Zahra Benjelloun", role: "caregiver", city: "Rabat" },
  { email: "malika@demo.riaya.ma", name: "Malika Idrissi", role: "caregiver", city: "Marrakech" },
  { email: "hafida@demo.riaya.ma", name: "Hafida Cherkaoui", role: "caregiver", city: "Fès" },
];

const familyUsers: Seedling[] = [
  { email: "sara@demo.riaya.ma", name: "Sara Lahlou", role: "family", city: "Casablanca" },
  { email: "leila@demo.riaya.ma", name: "Leila Berrada", role: "family", city: "Rabat" },
  { email: "nadia@demo.riaya.ma", name: "Nadia Sefrioui", role: "family", city: "Marrakech" },
  { email: "houda@demo.riaya.ma", name: "Houda Alaoui", role: "family", city: "Fès" },
];

const employerUsers: Seedling[] = [
  {
    email: "drh@demo-corp.riaya.ma",
    name: "RH — Atlas Industries",
    role: "employer",
    city: "Casablanca",
  },
  {
    email: "drh@demo-bank.riaya.ma",
    name: "RH — Banque du Maghreb",
    role: "employer",
    city: "Rabat",
  },
];

// ── Profile data keyed by user email ──────────────────────────────────────────
type CaregiverSeed = Omit<typeof caregiverProfiles.$inferInsert, "userId">;

const caregiverProfilesByEmail: Record<string, CaregiverSeed> = {
  "fatima@demo.riaya.ma": {
    bio: "Daya expérimentée à domicile, 12 ans d'expérience. Espace de jeu sécurisé et chaleureux.",
    careTypes: ["daya"],
    cities: ["Maârif", "Gauthier", "Bourgogne"],
    languages: ["ar", "fr"],
    hourlyRate: mad(40),
    dailyRate: mad(280),
    monthlyRate: mad(5000),
    minAgeMonths: 6,
    maxAgeYears: 6,
    maxChildren: 4,
    hasOwnSpace: true,
    verificationLevel: "certified",
    avgRating: 480,
    reviewCount: 37,
    completedBookings: 42,
    responseRate: 98,
    punctualityScore: 96,
  },
  "khadija@demo.riaya.ma": {
    bio: "Nounou à domicile, douce et patiente. Spécialisée petite enfance.",
    careTypes: ["nanny"],
    cities: ["Agdal", "Hassan", "Hay Riad"],
    languages: ["ar", "fr"],
    hourlyRate: mad(45),
    monthlyRate: mad(5500),
    minAgeMonths: 3,
    maxAgeYears: 8,
    maxChildren: 2,
    hasOwnSpace: false,
    verificationLevel: "certified",
    avgRating: 470,
    reviewCount: 24,
    completedBookings: 29,
    responseRate: 95,
    punctualityScore: 94,
  },
  "amina@demo.riaya.ma": {
    bio: "Soutien scolaire et garde après l'école. Primaire et collège.",
    careTypes: ["after_school"],
    cities: ["Aïn Diab", "Maârif"],
    languages: ["ar", "fr", "en"],
    hourlyRate: mad(60),
    minAgeMonths: 72,
    maxAgeYears: 15,
    maxChildren: 3,
    hasOwnSpace: false,
    verificationLevel: "cin_verified",
    avgRating: 450,
    reviewCount: 12,
    completedBookings: 15,
    responseRate: 90,
    punctualityScore: 92,
  },
  "naima@demo.riaya.ma": {
    bio: "Assistante en crèche agréée. Éveil et activités d'épanouissement.",
    careTypes: ["nursery_assistant"],
    cities: ["Guéliz", "Hivernage"],
    languages: ["ar", "fr"],
    hourlyRate: mad(35),
    monthlyRate: mad(4200),
    minAgeMonths: 12,
    maxAgeYears: 4,
    maxChildren: 5,
    hasOwnSpace: false,
    verificationLevel: "cin_verified",
    avgRating: 440,
    reviewCount: 9,
    completedBookings: 11,
    responseRate: 88,
    punctualityScore: 90,
  },
  "samira@demo.riaya.ma": {
    bio: "Babysitting occasionnel, soirées et week-ends. Fiable et ponctuelle.",
    careTypes: ["babysitter"],
    cities: ["Ville Nouvelle", "Saiss"],
    languages: ["ar", "fr"],
    hourlyRate: mad(50),
    minAgeMonths: 12,
    maxAgeYears: 10,
    maxChildren: 2,
    hasOwnSpace: false,
    verificationLevel: "cin_verified",
    avgRating: 430,
    reviewCount: 7,
    completedBookings: 8,
    responseRate: 85,
    punctualityScore: 88,
  },
  "zahra@demo.riaya.ma": {
    bio: "Daya à domicile, ambiance familiale. Repas maison inclus.",
    careTypes: ["daya"],
    cities: ["Yacoub El Mansour", "Akkari"],
    languages: ["ar"],
    hourlyRate: mad(30),
    dailyRate: mad(220),
    monthlyRate: mad(3800),
    minAgeMonths: 6,
    maxAgeYears: 5,
    maxChildren: 3,
    hasOwnSpace: true,
    verificationLevel: "id_checked",
    avgRating: 0,
    reviewCount: 0,
    completedBookings: 0,
    responseRate: 0,
    punctualityScore: 0,
  },
  "malika@demo.riaya.ma": {
    bio: "Nounou à domicile, disponible journée complète.",
    careTypes: ["nanny", "babysitter"],
    cities: ["Daoudiate", "M'hamid"],
    languages: ["ar", "fr"],
    hourlyRate: mad(38),
    monthlyRate: mad(4500),
    minAgeMonths: 3,
    maxAgeYears: 7,
    maxChildren: 2,
    hasOwnSpace: false,
    verificationLevel: "id_checked",
    avgRating: 0,
    reviewCount: 0,
    completedBookings: 0,
    responseRate: 0,
    punctualityScore: 0,
  },
  "hafida@demo.riaya.ma": {
    bio: "Babysitter, étudiante en éducation. Énergique et créative.",
    careTypes: ["babysitter"],
    cities: ["Agdal", "Narjiss"],
    languages: ["ar", "fr"],
    hourlyRate: mad(35),
    minAgeMonths: 24,
    maxAgeYears: 10,
    maxChildren: 2,
    hasOwnSpace: false,
    verificationLevel: "unverified",
    avgRating: 0,
    reviewCount: 0,
    completedBookings: 0,
    responseRate: 0,
    punctualityScore: 0,
  },
};

type ChildSeed = { name: string; ageMonths: number; specialNeeds?: string };

const familyProfilesByEmail: Record<
  string,
  { address?: string; neighborhood?: string; city: string; children: ChildSeed[] }
> = {
  "sara@demo.riaya.ma": {
    neighborhood: "Gauthier",
    city: "Casablanca",
    children: [
      { name: "Yassine", ageMonths: 30 },
      { name: "Lina", ageMonths: 60 },
    ],
  },
  "leila@demo.riaya.ma": {
    neighborhood: "Agdal",
    city: "Rabat",
    children: [{ name: "Adam", ageMonths: 18 }],
  },
  "nadia@demo.riaya.ma": {
    neighborhood: "Guéliz",
    city: "Marrakech",
    children: [
      { name: "Sofia", ageMonths: 48, specialNeeds: "Allergie aux arachides — EpiPen requis." },
    ],
  },
  "houda@demo.riaya.ma": {
    neighborhood: "Ville Nouvelle",
    city: "Fès",
    children: [
      { name: "Rayan", ageMonths: 36 },
      { name: "Malak", ageMonths: 72 },
    ],
  },
};

const employerAccountsByEmail: Record<
  string,
  {
    account: Omit<typeof employerAccounts.$inferInsert, "userId">;
    employees: Omit<typeof enrolledEmployees.$inferInsert, "employerAccountId">[];
  }
> = {
  "drh@demo-corp.riaya.ma": {
    account: {
      companyName: "Atlas Industries SARL",
      ice: "001234567000089",
      sector: "Industrie manufacturière",
      benefitBudgetPerEmployee: mad(1500),
      totalBudgetUsed: 0,
    },
    employees: [
      {
        employeeEmail: "sara@demo.riaya.ma",
        employeeName: "Sara Lahlou",
        monthlyBenefit: mad(1500),
        active: true,
      },
      {
        employeeEmail: "imane.k@atlas.example",
        employeeName: "Imane Kabbaj",
        monthlyBenefit: mad(1500),
        active: true,
      },
    ],
  },
  "drh@demo-bank.riaya.ma": {
    account: {
      companyName: "Banque du Maghreb",
      ice: "002345678000091",
      sector: "Services financiers",
      benefitBudgetPerEmployee: mad(2000),
      totalBudgetUsed: 0,
    },
    employees: [
      {
        employeeEmail: "leila@demo.riaya.ma",
        employeeName: "Leila Berrada",
        monthlyBenefit: mad(2000),
        active: true,
      },
    ],
  },
};

// ── Availability slots keyed by caregiver email ───────────────────────────────
// Weekly recurring hours (dayOfWeek 0=Sun … 6=Sat). Caregivers WITHOUT an entry
// here stay open (no calendar set) so the marketplace works either way.
const availabilityByEmail: Record<string, { dayOfWeek: number; start: string; end: string }[]> = {
  // Fatima — daya, mornings + afternoons Mon–Fri.
  "fatima@demo.riaya.ma": [1, 2, 3, 4, 5].map((d) => ({
    dayOfWeek: d,
    start: "08:00",
    end: "18:00",
  })),
  // Khadija — nanny, weekday afternoons.
  "khadija@demo.riaya.ma": [1, 2, 3, 4, 5].map((d) => ({
    dayOfWeek: d,
    start: "13:00",
    end: "19:00",
  })),
};

async function upsertUser(s: Seedling, passwordHash: string): Promise<string> {
  await authDb
    .insert(users)
    .values({
      email: s.email,
      name: s.name,
      role: s.role,
      city: s.city,
      passwordHash,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    })
    .onConflictDoNothing({ target: users.email });

  const [row] = await authDb
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, s.email))
    .limit(1);
  if (!row) throw new Error(`Failed to upsert user ${s.email}`);
  return row.id;
}

async function seed() {
  console.log("Seeding demo data...");
  const passwordHash = await hash(DEMO_PASSWORD, ARGON2ID_OPTIONS);

  // Caregivers
  for (const u of caregiverUsers) {
    const userId = await upsertUser(u, passwordHash);
    const profile = caregiverProfilesByEmail[u.email];
    if (profile) {
      await authDb
        .insert(caregiverProfiles)
        .values({ userId, displayName: u.name, ...profile })
        .onConflictDoNothing({ target: caregiverProfiles.userId });
    }

    // Availability slots (idempotent: only seed when none exist for this caregiver).
    const slots = availabilityByEmail[u.email];
    if (slots) {
      const [cg] = await authDb
        .select({ id: caregiverProfiles.id })
        .from(caregiverProfiles)
        .where(eq(caregiverProfiles.userId, userId))
        .limit(1);
      if (cg) {
        const existing = await authDb
          .select({ id: availabilitySlots.id })
          .from(availabilitySlots)
          .where(eq(availabilitySlots.caregiverId, cg.id))
          .limit(1);
        if (existing.length === 0) {
          await authDb.insert(availabilitySlots).values(
            slots.map((s) => ({
              caregiverId: cg.id,
              dayOfWeek: s.dayOfWeek,
              specificDate: null,
              startTime: s.start,
              endTime: s.end,
              available: true,
            }))
          );
        }
      }
    }
  }
  console.log(`  ✓ ${caregiverUsers.length} caregivers`);

  // Families
  for (const u of familyUsers) {
    const userId = await upsertUser(u, passwordHash);
    const profile = familyProfilesByEmail[u.email];
    if (profile) {
      await authDb
        .insert(familyProfiles)
        .values({
          userId,
          address: profile.address,
          neighborhood: profile.neighborhood,
          city: profile.city,
          children: profile.children.map((c) => ({ id: crypto.randomUUID(), ...c })),
        })
        .onConflictDoNothing({ target: familyProfiles.userId });
    }
  }
  console.log(`  ✓ ${familyUsers.length} families`);

  // Employers + enrolled employees
  for (const u of employerUsers) {
    const userId = await upsertUser(u, passwordHash);
    const data = employerAccountsByEmail[u.email];
    if (!data) continue;

    await authDb
      .insert(employerAccounts)
      .values({ userId, ...data.account })
      .onConflictDoNothing({ target: employerAccounts.userId });

    const [account] = await authDb
      .select({ id: employerAccounts.id })
      .from(employerAccounts)
      .where(eq(employerAccounts.userId, userId))
      .limit(1);
    if (!account) continue;

    // Skip if employees already enrolled (idempotency without a unique constraint).
    const existing = await authDb
      .select({ id: enrolledEmployees.id })
      .from(enrolledEmployees)
      .where(eq(enrolledEmployees.employerAccountId, account.id))
      .limit(1);
    if (existing.length === 0) {
      await authDb
        .insert(enrolledEmployees)
        .values(data.employees.map((e) => ({ employerAccountId: account.id, ...e })));
    }
  }
  console.log(`  ✓ ${employerUsers.length} employers`);

  console.log("Demo seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
