-- DropForeignKey
ALTER TABLE `VideoView` DROP FOREIGN KEY `VideoView_videoId_fkey`;

-- DropIndex
DROP INDEX `VideoView_videoId_fkey` ON `VideoView`;

-- AddForeignKey
ALTER TABLE `VideoView` ADD CONSTRAINT `VideoView_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
