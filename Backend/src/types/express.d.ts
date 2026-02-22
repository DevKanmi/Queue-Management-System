declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        matric_number: string | null;
        email: string;
        full_name: string;
        phone: string | null;
        role: string;
        department_id: string | null;
        faculty: string | null;
        department: string | null;
        is_verified: boolean;
        created_at: Date;
      };
    }
  }
}

export {};
