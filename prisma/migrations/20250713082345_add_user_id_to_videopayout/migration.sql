-- DropForeignKey
ALTER TABLE `VideoPayout` DROP FOREIGN KEY `VideoPayout_videoId_fkey`;

-- AlterTable
ALTER TABLE `VideoPayout` MODIFY `videoId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `VideoPayout` ADD CONSTRAINT `VideoPayout_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
