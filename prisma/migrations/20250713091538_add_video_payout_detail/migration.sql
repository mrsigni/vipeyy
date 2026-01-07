-- DropForeignKey
ALTER TABLE `Session` DROP FOREIGN KEY `Session_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Video` DROP FOREIGN KEY `Video_userId_fkey`;

-- DropForeignKey
ALTER TABLE `VideoPayout` DROP FOREIGN KEY `VideoPayout_userId_fkey`;

-- DropIndex
DROP INDEX `Session_userId_fkey` ON `Session`;

-- CreateTable
CREATE TABLE `VideoPayoutDetail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payoutId` INTEGER NOT NULL,
    `videoId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VideoPayoutDetail_payoutId_idx`(`payoutId`),
    INDEX `VideoPayoutDetail_videoId_idx`(`videoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Video` ADD CONSTRAINT `Video_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VideoPayout` ADD CONSTRAINT `VideoPayout_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VideoPayoutDetail` ADD CONSTRAINT `VideoPayoutDetail_payoutId_fkey` FOREIGN KEY (`payoutId`) REFERENCES `VideoPayout`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VideoPayoutDetail` ADD CONSTRAINT `VideoPayoutDetail_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
