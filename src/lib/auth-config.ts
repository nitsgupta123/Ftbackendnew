export const BCRYPT_ROUNDS = 12;

export const AUTH_TOKEN_STORAGE_KEY = "ft_admin_token";
export const AUTH_USER_STORAGE_KEY = "ft_admin_user";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return secret;
  }

  // No fallback: `npm start` does not set NODE_ENV, so a "dev-only" default would leak into production.
  throw new Error(
    "JWT_SECRET must be set (e.g. in .env.local) and be at least 32 characters long. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}

export function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? "1d";
}
