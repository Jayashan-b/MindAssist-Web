'use client';

import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { useCallback, useEffect, useState } from 'react';
import { ExternalE2EEKeyProvider, Room } from 'livekit-client';

interface LiveKitCallProps {
  roomName: string;
  participantName: string;
  isAudio: boolean;
  onDisconnected?: () => void;
  token: string;
  e2eeEnabled?: boolean;
  e2eeKey?: string;
}

export default function LiveKitCall({
  roomName,
  // participantName is used by the parent for token generation
  isAudio,
  onDisconnected,
  token,
  e2eeEnabled = false,
  e2eeKey,
}: LiveKitCallProps) {
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);

  // Create Room instance with optional E2EE configuration
  useEffect(() => {
    let cancelled = false;
    let currentRoom: Room | null = null;

    const initRoom = async () => {
      try {
        // E2EE config must be set via Room constructor options
        const keyProvider = e2eeEnabled && e2eeKey
          ? new ExternalE2EEKeyProvider()
          : undefined;

        currentRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          ...(keyProvider && {
            e2ee: {
              keyProvider,
              worker: new Worker(
                new URL('livekit-client/e2ee-worker', import.meta.url),
              ),
            },
          }),
        });

        if (keyProvider && e2eeKey) {
          await keyProvider.setKey(e2eeKey);
          await currentRoom.setE2EEEnabled(true);
        }

        if (!cancelled) {
          setRoom(currentRoom);
        }
      } catch (err) {
        console.error('Room init failed:', err);
        if (!cancelled) setError('Failed to initialise call');
      }
    };

    initRoom();

    return () => {
      cancelled = true;
      currentRoom?.disconnect();
      setRoom(null);
    };
  }, [roomName, e2eeEnabled, e2eeKey]);

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

  if (!room) {
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
        room={room}
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
