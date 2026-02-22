import rateLimit from 'express-rate-limit';

/**
 * Auth routes: limit requests per IP to reduce brute force on login/register.
 * 100 requests per 15 minutes per IP (adjust as needed).
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
