"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type VideoSession = {
  id: string;
  status: string;
  expiresAt: string;
  startedAt: string | null;
  role: "INITIATOR" | "PARTICIPANT";
  localAlias: string | null;
  remoteAlias: string | null;
  remoteOffer: RTCSessionDescriptionInit | null;
  remoteAnswer: RTCSessionDescriptionInit | null;
  remoteCandidates: RTCIceCandidateInit[];
  iceServers: RTCIceServer[];
};

export default function TrustedVideoRoom({ presentationId }: { presentationId: string }) {
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const seenCandidates = useRef(new Set<string>());
  const [session, setSession] = useState<VideoSession | null>(null);
  const [state, setState] = useState("Préparation de la salle sécurisée…");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const api = useCallback(async (method: string, body?: unknown) => {
    const response = await fetch("/api/video/sessions", {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Service vidéo indisponible.");
    return data.session as VideoSession;
  }, []);

  const stop = useCallback(async () => {
    localStream.current?.getTracks().forEach((track) => track.stop());
    peer.current?.close();
    peer.current = null;
    if (session) {
      try { await api("POST", { action: "end", sessionId: session.id }); } catch {}
    }
    setState("Session terminée");
  }, [api, session]);

  const postCandidate = useCallback(async (sessionId: string, candidate: RTCIceCandidate) => {
    try {
      await api("POST", { action: "candidate", sessionId, candidate: candidate.toJSON() });
    } catch {}
  }, [api]);

  const initialize = useCallback(async (s: VideoSession) => {
    if (peer.current || !s.iceServers?.length) return;
    const connection = new RTCPeerConnection({
      iceServers: s.iceServers,
      iceTransportPolicy: "relay",
      bundlePolicy: "max-bundle",
    });
    peer.current = connection;
    connection.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteVideo.current && stream) remoteVideo.current.srcObject = stream;
    };
    connection.onicecandidate = (event) => {
      if (event.candidate) void postCandidate(s.id, event.candidate);
    };
    connection.onconnectionstatechange = () => {
      const value = connection.connectionState;
      if (value === "connected") setState("Connexion vidéo sécurisée établie");
      else if (value === "failed") setState("Connexion vidéo impossible");
      else if (value === "disconnected") setState("Connexion interrompue");
    };

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStream.current = stream;
    stream.getTracks().forEach((track) => connection.addTrack(track, stream));
    if (localVideo.current) localVideo.current.srcObject = stream;

    if (s.role === "INITIATOR") {
      await api("POST", { action: "start", sessionId: s.id });
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      const published = await api("POST", { action: "offer", sessionId: s.id, offer: { type: offer.type, sdp: offer.sdp } });
      setSession(published);
      setState("En attente du second interlocuteur…");
    } else {
      setState("Connexion au premier interlocuteur…");
    }
  }, [api, postCandidate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api("PUT", { presentationId });
        if (!cancelled) {
          setSession(s);
          await initialize(s);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Impossible d'ouvrir la salle.");
      }
    })();
    return () => { cancelled = true; };
  }, [api, initialize, presentationId]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(async () => {
      try {
        const fresh = await api("GET", undefined);
        // GET requires sessionId as query parameter; use the direct fetch below to keep the API explicit.
        void fresh;
      } catch {}
      try {
        const response = await fetch("/api/video/sessions?sessionId=" + encodeURIComponent(session.id), { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.session) return;
        const s = data.session as VideoSession;
        setSession(s);
        const connection = peer.current;
        if (!connection) return;

        if (s.role === "PARTICIPANT" && s.remoteOffer && connection.signalingState === "stable") {
          await connection.setRemoteDescription(s.remoteOffer);
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          const published = await api("POST", { action: "answer", sessionId: s.id, answer: { type: answer.type, sdp: answer.sdp } });
          setSession(published);
        }

        if (s.role === "INITIATOR" && s.remoteAnswer && connection.signalingState === "have-local-offer") {
          await connection.setRemoteDescription(s.remoteAnswer);
        }

        for (const candidate of s.remoteCandidates || []) {
          const key = JSON.stringify(candidate);
          if (seenCandidates.current.has(key) || !connection.remoteDescription) continue;
          seenCandidates.current.add(key);
          await connection.addIceCandidate(candidate);
        }
      } catch {}
    }, 1500);
    return () => window.clearInterval(timer);
  }, [api, session]);

  useEffect(() => () => {
    localStream.current?.getTracks().forEach((track) => track.stop());
    peer.current?.close();
  }, []);

  const toggleMic = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };
  const toggleCamera = () => {
    const track = localStream.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOff(!track.enabled);
  };

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-12 md:py-20">
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c7a15a]">Recrutement Privé · visioconférence sécurisée</p>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Échange confidentiel</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">
          {session ? <>Vous êtes <strong className="text-white">{session.localAlias || "Interlocuteur autorisé"}</strong>. Votre interlocuteur apparaît sous l'alias <strong className="text-white">{session.remoteAlias || "Interlocuteur autorisé"}</strong>.</> : "Initialisation de la salle."}
        </p>
      </div>

      {error ? (
        <div className="border border-red-400/30 bg-red-400/5 p-6 text-sm text-red-200">{error}</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative overflow-hidden border border-white/10 bg-black aspect-video">
              <video ref={localVideo} autoPlay muted playsInline className="h-full w-full object-cover" />
              <span className="absolute bottom-3 left-3 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.15em]">{session?.localAlias || "Vous"}</span>
            </div>
            <div className="relative overflow-hidden border border-white/10 bg-black aspect-video">
              <video ref={remoteVideo} autoPlay playsInline className="h-full w-full object-cover" />
              <span className="absolute bottom-3 left-3 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.15em]">{session?.remoteAlias || "Interlocuteur"}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button onClick={toggleMic} className="border border-white/15 px-5 py-3 text-[10px] uppercase tracking-[0.15em]">{muted ? "Réactiver micro" : "Couper micro"}</button>
            <button onClick={toggleCamera} className="border border-white/15 px-5 py-3 text-[10px] uppercase tracking-[0.15em]">{cameraOff ? "Réactiver caméra" : "Couper caméra"}</button>
            <button onClick={() => void stop()} className="border border-red-400/40 px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-red-200">Quitter la session</button>
            <span className="ml-auto text-xs text-white/40">{state}</span>
          </div>

          <div className="mt-8 border border-white/10 p-6 text-xs leading-6 text-white/45">
            <strong className="text-white/70">Protection active :</strong> salle accessible uniquement aux deux utilisateurs liés à la présentation, durée limitée, accès authentifié, signalisation contrôlée côté serveur, transport média en mode <code className="text-white/70">relay</code> via TURN obligatoire, et journalisation des événements de création/démarrage/fin.
            <br />Les médias audio/vidéo ne sont pas enregistrés par Recrutement Privé dans cette V1.
          </div>
        </>
      )}
    </section>
  );
}
