import { pgTable, serial, text, integer, jsonb, timestamp, primaryKey, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").notNull().primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    byUser: index("sessions_by_user").on(t.userId),
  })
);

export const saves = pgTable(
  "saves",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    classId: text("class_id").notNull(),
    level: integer("level").notNull().default(1),
    xp: integer("xp").notNull().default(0),
    gold: integer("gold").notNull().default(0),
    resources: integer("resources").notNull().default(0),
    unlockedMaps: integer("unlocked_maps").notNull().default(1),
    defeatedBosses: jsonb("defeated_bosses").notNull().default([]),
    equippedWeapon: text("equipped_weapon").notNull(),
    ownedWeapons: jsonb("owned_weapons").notNull().default([]),
    skillLevels: jsonb("skill_levels").notNull().default({}),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.classId] }),
  })
);

export type UserRow = typeof users.$inferSelect;
export type SaveRow = typeof saves.$inferSelect;
