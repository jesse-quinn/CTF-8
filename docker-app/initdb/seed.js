// Seed data for the NodeGrid portal. Runs once, on first container start,
// against the database named by MONGO_INITDB_DATABASE.

db.users.insertMany([
  {
    username: "admin",
    password: "LPvUyvp8o34lhT4NSg66Jq",
    role: "admin",
  },
  {
    username: "auditor",
    password: "kZ2m9wq7Tf0aXbN1",
    role: "viewer",
  },
]);

db.notes.insertMany([
  {
    title: "Ops handover",
    body:
      "Reminder for the on-call rotation.\n" +
      "The portal host still keeps the shared maintenance account.\n" +
      "SSH user: leo\n" +
      "SSH password: IgHxliQsdTloKHhpNTC1QA\n" +
      "Rotate this once the vault migration lands.",
  },
]);
