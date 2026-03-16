'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExternalE2EEKeyProvider, Room } from 'livekit-client';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import type { Appointment } from '@/lib/types';

// ── Types ───────────────────────────────────────────────────────────

interface StartCallParams {
  appointmentId: string;
  appointment: Appointment;
  token: string;
  e2eeKey?: string | null;
  sessionE2ee?: boolean;
}

interface CallSessionState {
  activeAppointmentId: string | null;
  activeAppointment: Appointment | null;
  isConnected: boolean;
  room: Room | null;
  callToken: string | null;
  e2eeKey: string | null;
  sessionE2ee: boolean;
  videoPortalHost: HTMLDivElement | null;
  startCall: (params: StartCallParams) => Promise<void>;
  endCall: () => void;
  handleDisconnected: () => void;
  hasBeenInSession: (appointmentId: string) => boolean;
  hasUserLeft: () => boolean;
  resetUserLeft: () => void;
}

// ── Context ─────────────────────────────────────────────────────────

const CallSessionContext = createContext<CallSessionState | null>(null);

export function useCallSession(): CallSessionState {
  const ctx = useContext(CallSessionContext);
  if (!ctx) throw new Error('useCallSession must be used within CallSessionProvider');
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function CallSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [callToken, setCallToken] = useState<string | null>(null);
  const [e2eeKey, setE2eeKey] = useState<string | null>(null);
  const [sessionE2ee, setSessionE2ee] = useState(false);

  // Stable DOM element for VideoConference — created once, never destroyed.
  // React renders into it via createPortal, consultation page moves it into its container.
  const [videoPortalHost] = useState<HTMLDivElement | null>(() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div');
    el.setAttribute('data-lk-theme', 'default');
    return el;
  });

  // Hidden container keeps the portal host always in the DOM — even during navigation.
  // Without this, host.remove() detaches LiveKit's <video>/<canvas> elements,
  // causing frozen frames and 100% CPU when reattaching.
  const hiddenContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoPortalHost && hiddenContainerRef.current) {
      if (!videoPortalHost.parentElement) {
        hiddenContainerRef.current.appendChild(videoPortalHost);
      }
    }
  }, [videoPortalHost]);

  // Track the current room to avoid stale closures
  const roomRef = useRef<Room | null>(null);

  // Track which appointments the doctor has connected to (persists across navigation).
  // Used to distinguish "doctor never connected" from "doctor connected then disconnected".
  const connectedIdsRef = useRef(new Set<string>());

  // Track whether the doctor intentionally left (clicked LiveKit's leave button).
  // Distinguishes intentional leave from unexpected disconnect (network drop, HMR reload).
  const userLeftRef = useRef(false);

  const hasBeenInSession = useCallback((appointmentId: string) => {
    return connectedIdsRef.current.has(appointmentId);
  }, []);

  const hasUserLeft = useCallback(() => userLeftRef.current, []);

  const resetUserLeft = useCallback(() => { userLeftRef.current = false; }, []);

  const startCall = useCallback(async (params: StartCallParams) => {
    // Reset intentional-leave flag on new connection
    userLeftRef.current = false;

    // Disconnect any existing room first
    if (roomRef.current) {
      try { await roomRef.current.disconnect(); } catch {}
    }

    try {
      const useE2EE = params.sessionE2ee ?? false;
      const keyProvider = useE2EE && params.e2eeKey
        ? new ExternalE2EEKeyProvider()
        : undefined;

      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1920, height: 1080, frameRate: 30 },
        },
        publishDefaults: {
          videoCodec: 'h264',
        },
        ...(keyProvider && {
          e2ee: {
            keyProvider,
            worker: new Worker(
              new URL('livekit-client/e2ee-worker', import.meta.url),
            ),
          },
        }),
      });

      if (keyProvider && params.e2eeKey) {
        await keyProvider.setKey(params.e2eeKey);
        await newRoom.setE2EEEnabled(true);
      }

      roomRef.current = newRoom;
      connectedIdsRef.current.add(params.appointmentId);
      setRoom(newRoom);
      setCallToken(params.token);
      setE2eeKey(params.e2eeKey ?? null);
      setSessionE2ee(useE2EE);
      setActiveAppointmentId(params.appointmentId);
      setActiveAppointment(params.appointment);
      setIsConnected(true);
    } catch (err) {
      console.error('CallSession: Room init failed:', err);
    }
  }, []);

  const endCall = useCallback(() => {
    const currentRoom = roomRef.current;
    roomRef.current = null;
    if (currentRoom) {
      try { currentRoom.disconnect(); } catch {}
    }
    setRoom(null);
    setCallToken(null);
    setE2eeKey(null);
    setSessionE2ee(false);
    setActiveAppointmentId(null);
    setActiveAppointment(null);
    setIsConnected(false);
  }, []);

  const handleDisconnected = useCallback(() => {
    const currentRoom = roomRef.current;
    roomRef.current = null;
    if (currentRoom) {
      try { currentRoom.disconnect(); } catch {}
    }
    setRoom(null);
    setCallToken(null);
    setE2eeKey(null);
    setIsConnected(false);
  }, []);

  const handleLiveKitDisconnected = useCallback(() => {
    // Mark as intentional leave — LiveKit's onDisconnected fires when the
    // user clicks the built-in "Leave" button in VideoConference.
    userLeftRef.current = true;
    handleDisconnected();
  }, [handleDisconnected]);

  const isAudio = activeAppointment?.consultationType === 'audio';

  const contextValue = useMemo<CallSessionState>(() => ({
    activeAppointmentId,
    activeAppointment,
    isConnected,
    room,
    callToken,
    e2eeKey,
    sessionE2ee,
    videoPortalHost,
    startCall,
    endCall,
    handleDisconnected,
    hasBeenInSession,
    hasUserLeft,
    resetUserLeft,
  }), [
    activeAppointmentId,
    activeAppointment,
    isConnected,
    room,
    callToken,
    e2eeKey,
    sessionE2ee,
    videoPortalHost,
    startCall,
    endCall,
    handleDisconnected,
    hasBeenInSession,
    hasUserLeft,
    resetUserLeft,
  ]);

  return (
    <CallSessionContext.Provider value={contextValue}>
      {/* Hidden parking container — portal host lives here when not visible.
          Keeps LiveKit video/canvas elements in the DOM across page navigations. */}
      <div
        ref={hiddenContainerRef}
        data-portal-parking
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden', pointerEvents: 'none' }}
        aria-hidden="true"
      />
      {/* LiveKitRoom rendered separately — NEVER wraps {children}.
          Wrapping children conditionally causes React to unmount/remount the
          entire child tree when isConnected changes, resetting all local state
          and refs in child components (the root cause of the rejoin loop). */}
      {isConnected && room && callToken && (
        <LiveKitRoom
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          token={callToken}
          room={room}
          connect={true}
          video={!isAudio}
          audio={true}
          onDisconnected={handleLiveKitDisconnected}
          data-lk-theme="default"
        >
          {videoPortalHost && createPortal(<VideoConference />, videoPortalHost)}
        </LiveKitRoom>
      )}
      {children}
    </CallSessionContext.Provider>
  );
}
