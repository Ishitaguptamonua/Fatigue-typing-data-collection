-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mentalFatigue" INTEGER NOT NULL,
    "focusLevel" INTEGER NOT NULL,
    "fatigueLabel" INTEGER NOT NULL,
    "wpm" REAL NOT NULL,
    "errorRate" REAL NOT NULL,
    "targetText" TEXT NOT NULL,
    "typedText" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Keystroke" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "pressTime" REAL NOT NULL,
    "releaseTime" REAL NOT NULL,
    CONSTRAINT "Keystroke_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
