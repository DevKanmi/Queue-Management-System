import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';

/**
 * JWT verification middleware.
 * Attaches user to request (without password_hash), rejects invalid/expired tokens.
 */
export async function auth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ status: 'error', message: 'Access token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        matric_number: true,
        email: true,
        full_name: true,
        phone: true,
        role: true,
        department_id: true,
        faculty: true,
        department: true,
        is_verified: true,
        created_at: true,
      },
    });

    if (!user) {
      res.status(401).json({ status: 'error', message: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === 'TokenExpiredError') {
      res.status(401).json({ status: 'error', message: 'Token expired' });
      return;
    }
    if (e.name === 'JsonWebTokenError') {
      res.status(401).json({ status: 'error', message: 'Invalid token' });
      return;
    }
    console.error('Auth middleware error:', e.message);
    res.status(500).json({ status: 'error', message: 'Authentication failed' });
  }
}
