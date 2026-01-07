/*
  Warnings:

  - Added the required column `userId` to the `VideoPayout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `VideoPayout` ADD COLUMN `userId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `VideoPayout_userId_idx` ON `VideoPayout`(`userId`);

-- AddForeignKey
ALTER TABLE `VideoPayout` ADD CONSTRAINT `VideoPayout_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
