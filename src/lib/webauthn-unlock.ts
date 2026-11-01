const CRED_KEY = 'nexcrm-webauthn-cred'

function bufferToBase64(buf: ArrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function base64ToBuffer(b64: string) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

export function hasWebAuthnCredential() {
    return !!localStorage.getItem(CRED_KEY)
}

/** Optional device unlock after password login — does not replace password auth. */
export async function registerWebAuthnUnlock(userId: string, userName: string) {
    if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported')
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const userIdBytes = new TextEncoder().encode(userId)
    const cred = await navigator.credentials.create({
        publicKey: {
            challenge,
            rp: { name: 'Nexprism CRM', id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname },
            user: { id: userIdBytes, name: userName, displayName: userName },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
            timeout: 60000,
        }
    }) as PublicKeyCredential | null
    if (!cred) throw new Error('Registration cancelled')
    localStorage.setItem(CRED_KEY, JSON.stringify({
        rawId: bufferToBase64(cred.rawId),
        userId,
        userName
    }))
    return cred.id
}

export async function unlockWithWebAuthn(): Promise<{ userId: string; userName: string } | null> {
    const raw = localStorage.getItem(CRED_KEY)
    if (!raw || !window.PublicKeyCredential) return null
    if (!localStorage.getItem('token')) return null
    const stored = JSON.parse(raw)
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    await navigator.credentials.get({
        publicKey: {
            challenge,
            allowCredentials: [{ type: 'public-key', id: base64ToBuffer(stored.rawId) }],
            userVerification: 'required',
            timeout: 60000,
        }
    })
    return { userId: stored.userId, userName: stored.userName }
}
