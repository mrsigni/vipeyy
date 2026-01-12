import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        ALLOWED_ATTR: ['href'],
    });
}

export function sanitizeText(text: string): string {
    return text.replace(/[<>]/g, '');
}

export function sanitizeInput(input: unknown): string {
    if (typeof input !== 'string') return '';
    return sanitizeText(input.trim());
}
