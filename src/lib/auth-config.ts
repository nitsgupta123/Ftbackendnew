export const BCRYPT_ROUNDS = 12;

export const AUTH_TOKEN_STORAGE_KEY = "ft_admin_token";
export const AUTH_USER_STORAGE_KEY = "ft_admin_user";

const DEV_JWT_SECRET =
  "ftadmin-dev-jwt-secret-do-not-use-in-production";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET must be set in the environment and be at least 32 characters long"
    );
  }

  console.warn(
    "[auth] JWT_SECRET is missing or shorter than 32 characters. Using a development-only fallback. Set JWT_SECRET in .env.local before production."
  );
  return DEV_JWT_SECRET;
}

export function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? "7d";
}
