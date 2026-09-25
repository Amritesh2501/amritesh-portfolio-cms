-- What is in the drawer of the side table in the room through the book.
--
-- On profiles rather than in a table of its own: it is the same person every
-- other column here describes, and there is only ever one of him.
ALTER TABLE "profiles" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN "hobbies" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "profiles" ADD COLUMN "diaryNote" TEXT;
