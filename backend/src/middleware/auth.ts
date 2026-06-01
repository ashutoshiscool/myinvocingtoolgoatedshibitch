import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lumor_pay_super_secret_jwt_key_12345';

export interface AuthenticatedRequest extends Request {
  admin?: {
    username: string;
    id: number;
  };
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
      }

      (req as AuthenticatedRequest).admin = decoded as { username: string; id: number };
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header is missing.' });
  }
}
