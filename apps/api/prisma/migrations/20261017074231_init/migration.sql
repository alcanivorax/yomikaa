-- CreateEnum
CREATE TYPE "NoteKind" AS ENUM ('Essay', 'Snippet', 'Note', 'Link');

-- CreateEnum
CREATE TYPE "JournalPart" AS ENUM ('life', 'work');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('todo', 'prog', 'rev', 'block', 'done');

-- CreateTable
CREATE TABLE "Note" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "NoteKind" NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT[],
    "margin" TEXT,
    "url" TEXT,
    "date" DATE NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalDay" (
    "id" SERIAL NOT NULL,
    "ownerId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" SERIAL NOT NULL,
    "dayId" INTEGER NOT NULL,
    "part" "JournalPart" NOT NULL,
    "position" INTEGER NOT NULL,
    "startTime" VARCHAR(5) NOT NULL DEFAULT '',
    "endTime" VARCHAR(5) NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "key" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "status" "TicketStatus" NOT NULL DEFAULT 'todo',
    "workedOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "ownerId" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("ownerId")
);

-- CreateTable
CREATE TABLE "_NoteToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_NoteToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Note_date_id_idx" ON "Note"("date" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "JournalDay_ownerId_date_key" ON "JournalDay"("ownerId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_dayId_part_position_idx" ON "JournalEntry"("dayId", "part", "position");

-- CreateIndex
CREATE INDEX "Ticket_ownerId_createdAt_idx" ON "Ticket"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "_NoteToTag_B_index" ON "_NoteToTag"("B");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "JournalDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteToTag" ADD CONSTRAINT "_NoteToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteToTag" ADD CONSTRAINT "_NoteToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
