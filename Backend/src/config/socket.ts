import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let io: Server | null = null;

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] },
  });
  io.on('connection', (socket) => {
    socket.on('join_session_room', (data: { sessionId: string }) => {
      if (data?.sessionId) socket.join(`session_${data.sessionId}`);
    });
    socket.on('join_user_room', (data: { userId: string }) => {
      if (data?.userId) socket.join(`user_${data.userId}`);
    });
    socket.on('join_admin_room', (data: { departmentId: string }) => {
      if (data?.departmentId) socket.join(`admin_${data.departmentId}`);
    });
  });
  return io;
}

export function getIO(): Server | null {
  return io;
}
