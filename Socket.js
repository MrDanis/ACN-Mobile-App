import { NEXT_PUBLIC_BACKEND_SOCKET } from '@env';
import { io } from 'socket.io-client';

let socket;

export const connectionSocket = async () => {
  console.log('Connecting sockets...', socket);

  if (socket?.connected) {
    console.log('Socket already connected');
    return socket;
  } else {
    const backendSocketUrl = NEXT_PUBLIC_BACKEND_SOCKET;

    if (!backendSocketUrl) {
      throw new Error('Backend socket URL is missing. Check your environment variables.');
    }
    socket = await io(backendSocketUrl, {
      transports: ['websocket'],
    });
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
    return socket;
  }
};

export default connectionSocket;

