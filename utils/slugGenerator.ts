// utils/slugGenerator.ts

/**
 * Generate a short slug using lowercase letters and numbers
 * Similar to YouTube video IDs but shorter for folders
 */
export function generateFolderSlug(length: number = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generate a unique folder slug by checking against existing slugs
 */
export async function generateUniqueFolderSlug(
  checkExistence: (slug: string) => Promise<boolean>,
  length: number = 12,
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const slug = generateFolderSlug(length);
    const exists = await checkExistence(slug);
    
    if (!exists) {
      return slug;
    }
  }
  
  // If all attempts failed, use a longer slug
  return generateFolderSlug(length + 4);
}

/**
 * Validate folder slug format
 */
export function isValidFolderSlug(slug: string): boolean {
  return /^[a-z0-9]{8,20}$/.test(slug);
}

/**
 * Alternative: Generate slug from folder name + random suffix
 * This creates more readable URLs like "documents-k3m2n8p1"
 */
export function generateReadableSlug(name: string, suffixLength: number = 8): string {
  // Clean the name: lowercase, remove special chars, replace spaces with hyphens
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 20); // Limit length

  // Generate random suffix
  const suffix = generateFolderSlug(suffixLength);
  
  return `${cleanName}-${suffix}`;
}

/**
 * Extract readable name from slug (if using readable format)
 */
export function getNameFromReadableSlug(slug: string): string {
  const parts = slug.split('-');
  if (parts.length > 1) {
    // Remove the last part (random suffix) and join the rest
    const nameparts = parts.slice(0, -1);
    return nameparts.join('-').replace(/-/g, ' ');
  }
  return slug;
}