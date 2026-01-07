-- AlterTable
ALTER TABLE `Video` ADD COLUMN `lastViewedAt` DATETIME(3) NULL,
    ADD COLUMN `totalViews` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `withdrawnEarnings` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `VideoView` ADD COLUMN `isValid` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `WebSettings` MODIFY `cpm` DOUBLE NOT NULL DEFAULT 2.0;

-- CreateTable
CREATE TABLE `VideoPayout` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `videoId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VideoPayout_videoId_idx`(`videoId`),
    INDEX `VideoPayout_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `User_email_idx` ON `User`(`email`);

-- CreateIndex
CREATE INDEX `User_totalEarnings_idx` ON `User`(`totalEarnings`);

-- CreateIndex
CREATE INDEX `Video_videoId_idx` ON `Video`(`videoId`);

-- CreateIndex
CREATE INDEX `VideoView_videoId_createdAt_idx` ON `VideoView`(`videoId`, `createdAt`);

-- CreateIndex
CREATE INDEX `VideoView_ip_createdAt_idx` ON `VideoView`(`ip`, `createdAt`);

-- AddForeignKey
ALTER TABLE `VideoPayout` ADD CONSTRAINT `VideoPayout_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
-- Remove foreign key constraint first
ALTER TABLE `Video` DROP FOREIGN KEY `Video_userId_fkey`;

-- Now drop the index
ALTER TABLE `Video` DROP INDEX `Video_userId_fkey`;

-- Add the new index
ALTER TABLE `Video` ADD INDEX `Video_userId_idx` (`userId`);

-- (Optional) Re-add the foreign key if needed
ALTER TABLE `Video` ADD CONSTRAINT `Video_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;