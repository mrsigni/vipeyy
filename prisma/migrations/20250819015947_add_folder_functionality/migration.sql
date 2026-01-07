-- AlterTable
ALTER TABLE `video` ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `duration` INTEGER NULL,
    ADD COLUMN `fileSize` BIGINT NULL,
    ADD COLUMN `folderId` VARCHAR(191) NULL,
    ADD COLUMN `isPublic` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `mimeType` VARCHAR(100) NULL,
    ADD COLUMN `thumbnail` VARCHAR(500) NULL,
    ADD COLUMN `title` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `Folder` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `color` VARCHAR(7) NULL,
    `isShared` BOOLEAN NOT NULL DEFAULT false,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Folder_userId_idx`(`userId`),
    INDEX `Folder_parentId_idx`(`parentId`),
    INDEX `Folder_userId_parentId_idx`(`userId`, `parentId`),
    INDEX `Folder_userId_name_idx`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Video_folderId_idx` ON `Video`(`folderId`);

-- CreateIndex
CREATE INDEX `Video_userId_folderId_idx` ON `Video`(`userId`, `folderId`);

-- CreateIndex
CREATE INDEX `Video_createdAt_idx` ON `Video`(`createdAt`);

-- AddForeignKey
ALTER TABLE `Folder` ADD CONSTRAINT `Folder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Folder` ADD CONSTRAINT `Folder_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Folder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Video` ADD CONSTRAINT `Video_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `Folder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
