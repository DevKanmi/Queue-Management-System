import { getIO } from '../config/socket';

export function emitToSession(sessionId: string, event: string, payload: unknown): void {
  const io = getIO();
  if (!io) return;
  io.to(`session_${sessionId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  const io = getIO();
  if (!io) return;
  io.to(`user_${userId}`).emit(event, payload);
}

export function emitToAdminRoom(departmentId: string, event: string, payload: unknown): void {
  const io = getIO();
  if (!io) return;
  io.to(`admin_${departmentId}`).emit(event, payload);
}

export function queueUpdate(
  sessionId: string,
  data: { currentServing: number; totalWaiting: number; estimatedWaitMinutes?: number; message?: string }
): void {
  emitToSession(sessionId, 'queue_update', data);
}

export function yourTurnSoon(sessionId: string, userId: string, data: { positionsAhead: number; message?: string; estimatedMinutes?: number }): void {
  emitToUser(userId, 'your_turn_soon', { sessionId, ...data });
}

export function slotAssigned(userId: string, data: { queueNumber: number; assignedTime: string }): void {
  emitToUser(userId, 'slot_assigned', data);
}

export function sessionStateChanged(sessionId: string, newState: string): void {
  emitToSession(sessionId, 'session_state_changed', { sessionId, newState });
}

export function studentNoShow(departmentId: string, data: { sessionId: string; queueNumber: number; studentId: string }): void {
  emitToAdminRoom(departmentId, 'student_no_show', data);
}
