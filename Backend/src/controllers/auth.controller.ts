import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';

const SALT_ROUNDS = 12;

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { matric_number, email, password, full_name, phone, faculty, department } = req.body as {
      matric_number?: string;
      email?: string;
      password?: string;
      full_name?: string;
      phone?: string;
      faculty?: string;
      department?: string;
    };
    if (!email?.trim() || !password || !full_name?.trim()) {
      res.status(400).json({ status: 'error', message: 'Email, password and full name are required' });
      return;
    }
    if (!matric_number?.trim()) {
      res.status(400).json({ status: 'error', message: 'Matric number is required for student registration' });
      return;
    }
    const departmentTrimmed = department?.trim();
    if (!departmentTrimmed) {
      res.status(400).json({ status: 'error', message: 'Course / programme is required for student registration' });
      return;
    }
    const validCourse = await prisma.course.findFirst({
      where: { name: departmentTrimmed },
      select: { name: true },
    });
    if (!validCourse) {
      res.status(400).json({
        status: 'error',
        message: 'Course must be one of the listed options. Please select from the dropdown.',
      });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: email ?? '' }, { matric_number: matric_number ?? '' }],
      },
    });
    if (existing) {
      res.status(400).json({
        status: 'error',
        message: 'Email or matric number already registered',
      });
      return;
    }

    const password_hash = await bcrypt.hash(password!, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        matric_number: matric_number ?? null,
        email: email!,
        password_hash,
        full_name: full_name ?? '',
        phone: phone ?? null,
        role: 'student',
        faculty: faculty?.trim() || null,
        department: departmentTrimmed,
      },
      select: {
        id: true,
        matric_number: true,
        email: true,
        full_name: true,
        phone: true,
        role: true,
        faculty: true,
        department: true,
        is_verified: true,
        created_at: true,
      },
    });

    res.status(201).json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, matric_number, password } = req.body as {
      email?: string;
      matric_number?: string;
      password?: string;
    };

    const emailTrimmed = typeof email === 'string' ? email.trim() : '';
    const matricTrimmed = typeof matric_number === 'string' ? matric_number.trim() : '';

    if (!emailTrimmed && !matricTrimmed) {
      res.status(400).json({ status: 'error', message: 'Email or matric number required' });
      return;
    }
    if (!password || typeof password !== 'string') {
      res.status(400).json({ status: 'error', message: 'Password is required' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: emailTrimmed
        ? { email: emailTrimmed.toLowerCase() }
        : { matric_number: matricTrimmed },
      select: { id: true, email: true, password_hash: true, role: true },
    });

    if (!user) {
      res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      return;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      return;
    }

    const access_token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
    const refresh_token = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    res.json({
      status: 'success',
      data: {
        access_token,
        refresh_token,
        expires_in: process.env.JWT_EXPIRES_IN || '1h',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refresh_token: token } = req.body as { refresh_token?: string };
    if (!token) {
      res.status(400).json({ status: 'error', message: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true },
    });
    if (!user) {
      res.status(401).json({ status: 'error', message: 'Invalid refresh token' });
      return;
    }

    const access_token = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({
      status: 'success',
      data: {
        access_token,
        expires_in: process.env.JWT_EXPIRES_IN || '1h',
      },
    });
  } catch (err) {
    const e = err as { name?: string };
    if (e.name === 'TokenExpiredError' || e.name === 'JsonWebTokenError') {
      res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
      return;
    }
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ status: 'success', data: { user: req.user } });
  } catch (err) {
    next(err);
  }
}
