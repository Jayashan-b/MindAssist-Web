'use client';

import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { useCallback, useEffect, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Room } from 'livekit-client';

interface LiveKitCallProps {
  roomName: string;
  participantName: string;
  isAudio: boolean;
  onDisconnected?: () => void;
}

export default function LiveKitCall({
  roomName,
  participantName,
  isAudio,
  onDisconnected,
}: LiveKitCallProps) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [roomReady, setRoomReady] = useState(false);

  // Create Room instance ONCE (E2EE disabled — Flutter macOS doesn't support
  // it, causing an encryption mismatch where web encrypts but Flutter can't
  // decrypt, resulting in black video and no audio).
  useEffect(() => {
    roomRef.current = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    setRoomReady(true);

    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
      setRoomReady(false);
    };
  }, [roomName]);

  // Fetch token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const getToken = httpsCallable(functions, 'getLivekitToken');
        const result = await getToken({
          roomName,
          participantName,
          role: 'doctor',
        });
        setToken((result.data as { token: string }).token);
      } catch (err) {
        setError('Failed to get call token');
        console.error('Token fetch failed:', err);
      }
    };

    fetchToken();
  }, [roomName, participantName]);

  const handleDisconnected = useCallback(() => {
    onDisconnected?.();
  }, [onDisconnected]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 rounded-xl">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!token || !roomReady) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        <p className="text-white ml-3">Connecting to call...</p>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl overflow-hidden">
      <LiveKitRoom
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        token={token}
        room={roomRef.current ?? undefined}
        connect={true}
        video={!isAudio}
        audio={true}
        onDisconnected={handleDisconnected}
        data-lk-theme="default"
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
