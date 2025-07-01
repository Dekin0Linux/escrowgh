/*
  Warnings:

  - You are about to drop the column `method` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `settledByAdmin` on the `Settlement` table. All the data in the column will be lost.
  - You are about to drop the column `toUserId` on the `Settlement` table. All the data in the column will be lost.
  - Added the required column `status` to the `Settlement` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_toUserId_fkey";

-- AlterTable
ALTER TABLE "Settlement" DROP COLUMN "method",
DROP COLUMN "note",
DROP COLUMN "settledByAdmin",
DROP COLUMN "toUserId",
ADD COLUMN     "recipientId" TEXT,
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "recipientPhone" TEXT,
ADD COLUMN     "status" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
