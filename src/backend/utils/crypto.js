const encoder = new TextEncoder();
const passwordHashIterations = 1e5;
async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToBase64(saltBytes);
  const hash = await derivePasswordHash(password, saltBytes);
  return { hash, salt };
}
async function verifyPassword(password, salt, expectedHash) {
  const actualHash = await derivePasswordHash(password, base64ToBytes(salt));
  return timingSafeEqual(actualHash, expectedHash);
}
async function derivePasswordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: passwordHashIterations },
    key,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64(new Uint8Array(digest));
}
function timingSafeEqual(a, b) {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}
function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
export {
  bytesToBase64,
  hashPassword,
  sha256,
  verifyPassword
};
