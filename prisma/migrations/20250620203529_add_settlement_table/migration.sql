-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "initatedBy" TEXT NOT NULL DEFAULT 'user';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isFunded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "settledByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_transactionId_key" ON "Settlement"("transactionId");

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
