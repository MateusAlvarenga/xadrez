import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomStateEvent, ServerEvent } from '../../shared/events';

type ChatMessage = { author: string; text: string; system?: boolean };
type RoomState = RoomStateEvent;
type Identity = { id: string; color: 'w' | 'b' | null; role: string };

function socketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function useRoomSocket(roomCode: string, nickname: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const sessionTokenRef = useRef<string>(crypto.randomUUID());
  const stoppedRef = useRef(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    stoppedRef.current = false;
    let retryDelay = 1000;

    const connect = () => {
      if (stoppedRef.current) return;
      setConnection('connecting');
      const socket = new WebSocket(socketUrl());
      socketRef.current = socket;
      socket.onopen = () => {
        retryDelay = 1000;
        setConnection('connected');
        setError('');
        socket.send(JSON.stringify({
          type: 'JOIN_ROOM',
          roomCode,
          nickname,
          sessionToken: sessionTokenRef.current,
        }));
      };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as ServerEvent;
        if (message.type === 'CONNECTED') {
          sessionTokenRef.current = message.sessionToken;
          setIdentity({ id: message.playerId, color: message.color, role: message.role });
        }
        if (message.type === 'ROOM_STATE') setRoom(message);
        if (message.type === 'TOURNAMENT_UPDATED') {
          setRoom((current) => current ? { ...current, tournament: message.tournament } : current);
        }
        if (message.type === 'CLOCK_UPDATE') {
          setRoom((current) => current ? { ...current, clock: message.clock } : current);
        }
        if (message.type === 'CHAT_MESSAGE') {
          setMessages((current) => [...current, { author: message.author, text: message.text }]);
        }
        if (message.type === 'SYSTEM_MESSAGE') {
          setMessages((current) => [...current, { author: 'Sistema', text: message.text, system: true }]);
        }
        if (message.type === 'ERROR' || message.type === 'MOVE_REJECTED') setError(message.message);
      };
      socket.onclose = () => {
        if (stoppedRef.current) return;
        setConnection('offline');
        reconnectTimerRef.current = window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 5000);
      };
      socket.onerror = () => setConnection('offline');
    };

    connect();
    return () => {
      stoppedRef.current = true;
      if (reconnectTimerRef.current !== null) window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [nickname, roomCode]);

  const send = useCallback((message: Record<string, unknown>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(message));
  }, []);
  const makeMove = useCallback((from: string, to: string, promotion: 'q' | 'r' | 'b' | 'n' = 'q'): 'snapback' | void => {
    if (connection !== 'connected' || room?.status !== 'playing') return 'snapback';
    send({ type: 'MAKE_MOVE', from, to, promotion });
  }, [connection, room?.status, send]);
  const sendChat = useCallback((text: string) => send({ type: 'CHAT_MESSAGE', text }), [send]);
  const resign = useCallback(() => send({ type: 'RESIGN_GAME' }), [send]);
  const reset = useCallback(() => send({ type: 'RESET_GAME' }), [send]);
  const createTournament = useCallback((timeMinutes: number | null) => {
    send({ type: 'CREATE_TOURNAMENT', timeMinutes: timeMinutes === null ? 'none' : timeMinutes });
  }, [send]);
  const endTournament = useCallback(() => send({ type: 'END_TOURNAMENT' }), [send]);

  return { connection, room, identity, messages, error, makeMove, sendChat, resign, reset, createTournament, endTournament };
}
