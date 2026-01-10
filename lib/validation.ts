import { z } from 'zod';

export const videoCreateSchema = z.object({
    videoId: z.string().min(1).max(100).trim(),
    title: z.string().max(255).optional().nullable(),
    description: z.string().max(5000).optional().nullable(),
    folderId: z.string().uuid().optional().nullable(),
    thumbnail: z.string().url().max(500).optional().nullable(),
    duration: z.number().int().positive().optional().nullable(),
    fileSize: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional().nullable(),
    mimeType: z.string().max(100).optional().nullable(),
    isPublic: z.boolean().default(true),
});

export const fileUploadSchema = z.object({
    file: z.instanceof(File)
        .refine((f) => f.size <= 5 * 1024 * 1024 * 1024, "Max file size 5GB")
        .refine(
            (f) => ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'].includes(f.type),
            "Invalid file type. Must be mp4, webm, mov, or avi"
        ),
});

export const viewTrackingSchema = z.object({
    videoId: z.string().min(1).max(100),
});
