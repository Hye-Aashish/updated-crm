const crypto = require('crypto');

const ENC_PREFIX = 'enc:v1:';

function getEncryptionKey() {
    const rawKey = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!rawKey) {
        throw new Error('Missing JWT_SECRET or CREDENTIAL_ENCRYPTION_KEY for encryption');
    }
    return crypto.createHash('sha256').update(String(rawKey)).digest();
}

/**
 * Encrypts sensitive plaintext (e.g., project credentials) using AES-256-GCM.
 */
function encryptSecret(plaintext) {
    if (plaintext === undefined || plaintext === null || plaintext === '') return '';
    const str = String(plaintext);
    if (str.startsWith(ENC_PREFIX)) return str;

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${ENC_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts AES-256-GCM ciphertext. Legacy plaintext values pass through transparently.
 */
function decryptSecret(value) {
    if (value === undefined || value === null || value === '') return '';
    const str = String(value);
    if (!str.startsWith(ENC_PREFIX)) return str;

    try {
        const parts = str.slice(ENC_PREFIX.length).split(':');
        if (parts.length !== 3) return '';
        const [ivHex, tagHex, dataHex] = parts;
        const key = getEncryptionKey();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(dataHex, 'hex')),
            decipher.final()
        ]);
        return decrypted.toString('utf8');
    } catch (err) {
        return '';
    }
}

/**
 * Escapes RegExp metacharacters to prevent ReDoS on user search inputs.
 */
function escapeRegex(input, maxLength = 120) {
    return String(input || '')
        .slice(0, maxLength)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generates a cryptographically strong temporary password.
 */
function generateSecurePassword(prefix = 'Nex@') {
    const token = crypto.randomBytes(6).toString('base64url');
    return `${prefix}${token}!9`;
}

/**
 * Computes an HMAC capability token for private uploaded files.
 */
function signFileAccess(filename) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is required to sign file URLs');
    return crypto
        .createHmac('sha256', secret)
        .update(`private-file:${String(filename)}`)
        .digest('hex');
}

/**
 * Verifies an HMAC capability token using constant-time comparison.
 */
function verifyFileAccess(filename, providedSig) {
    if (!providedSig || typeof providedSig !== 'string') return false;
    const expected = signFileAccess(filename);
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(providedSig.trim(), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

/**
 * Constant-time string comparison helper for webhook signatures and secrets.
 */
function timingSafeEqualStr(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
    encryptSecret,
    decryptSecret,
    escapeRegex,
    generateSecurePassword,
    signFileAccess,
    verifyFileAccess,
    timingSafeEqualStr
};

