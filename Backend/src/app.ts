import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { initSocket } from './config/socket';
import { startScheduler } from './services/scheduler.service';
import { authRateLimiter } from './middleware/rateLimit';
import authRoutes from './routes/auth.routes';
import sessionsRoutes from './routes/sessions.routes';
import adminRoutes from './routes/admin.routes';
import notificationsRoutes from './routes/notifications.routes';
import departmentsRoutes from './routes/departments.routes';
import coursesRoutes from './routes/courses.routes';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/v1/auth', authRateLimiter, authRoutes);
app.use('/api/v1/sessions', sessionsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/departments', departmentsRoutes);
app.use('/api/v1/courses', coursesRoutes);

// 404 — unknown routes return clean JSON
app.use((_req, _res, next) => {
  next(Object.assign(new Error('Not found'), { statusCode: 404 }));
});

app.use(errorHandler);

initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startScheduler();
});
