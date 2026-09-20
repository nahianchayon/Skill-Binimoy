import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  RefreshCw,
  UserRound,
  Volume2,
} from "lucide-react";
import { addDoc, collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { ProtectedView } from "@/components/common/ProtectedView";

type VideoCallSearch = {
  caller?: boolean | string;
};

export const Route = createFileRoute("/video-call/$callId")({
  validateSearch: (search: Record<string, unknown>): VideoCallSearch => {
    return {
      caller: search["caller"] === true || search["caller"] === "true",
    };
  },
  head: () => ({ meta: [{ title: "Video call · Skill Binimoy" }] }),
  component: VideoCallPage,
});

function createFallbackStream(label = "User"): MediaStream {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  let frame = 0;
  function draw() {
    if (!ctx) return;
    frame++;
    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, "#1e3a8a");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    const radius = 55 + Math.sin(frame * 0.05) * 6;
    ctx.beginPath();
    ctx.arc(320, 200, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(59, 130, 246, 0.35)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(320, 200, 46, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((label.slice(0, 1) || "U").toUpperCase(), 320, 200);

    ctx.font = "bold 20px sans-serif";
    ctx.fillText(label, 320, 280);
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#93c5fd";
    ctx.fillText("Virtual Camera Stream", 320, 310);
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("(Hardware camera denied or in use)", 320, 335);
  }
  draw();
  const intervalId = window.setInterval(draw, 1000 / 15);
  const stream = canvas.captureStream(15);

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.00001;
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    }
  } catch (e) {
    console.warn("Could not attach fallback audio track:", e);
  }

  stream.getVideoTracks()[0]?.addEventListener("ended", () => {
    window.clearInterval(intervalId);
  });

  return stream;
}

async function acquireMediaStream(userName = "User"): Promise<{ stream: MediaStream; warning?: string }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      stream: createFallbackStream(userName),
      warning: "Opening over non-secure HTTP or browser denied media. Virtual camera stream active.",
    };
  }

  // 1. Try both video and audio
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    return { stream };
  } catch (err: unknown) {
    console.warn("Could not get both video & audio, trying single device fallback:", err);

    // 2. Try video only
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      return {
        stream: videoStream,
        warning: "Microphone not detected or denied. Video only is active.",
      };
    } catch {
      // Continue
    }

    // 3. Try audio only
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      return {
        stream: audioStream,
        warning: "Camera not detected or denied. Audio only is active.",
      };
    } catch {
      // Both hardware devices failed
    }

    // 4. Graceful Fallback: Virtual Animated Stream so connection never crashes
    return {
      stream: createFallbackStream(userName),
      warning:
        "Camera & mic permission was denied or hardware is in use by another tab. Connected with virtual video stream.",
    };
  }
}

// Multi-network ICE servers with STUN and free TURN relays for symmetric NAT / cellular traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    {
      urls: [
        "stun:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelay",
      credential: "openrelay",
    },
  ],
  iceCandidatePoolSize: 10,
};

function VideoCallPage() {
  const { callId } = Route.useParams();
  const searchParams = Route.useSearch();
  const { user, profile } = useAuth();

  const isCallerParam = Boolean(
    searchParams?.caller ||
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("caller") === "true")
  );

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState("Preparing secure learning room...");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideo.current && activeStream) {
      localVideo.current.srcObject = activeStream;
      localVideo.current.muted = true;
      localVideo.current.playsInline = true;
      localVideo.current.play().catch((e) => console.warn("Local play error:", e));
    }
  }, [activeStream]);

  // Attach remote stream to remote video element with autoplay handling
  useEffect(() => {
    const videoEl = remoteVideo.current;
    if (videoEl && remoteStream) {
      videoEl.srcObject = remoteStream;
      videoEl.playsInline = true;
      videoEl.volume = 1.0;
      videoEl.muted = false;

      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Remote video play error (autoplay blocked):", err);
          setAudioBlocked(true);
        });
      }
    }
  }, [remoteStream]);

  const initCall = useCallback(async () => {
    if (!user || !db) {
      setStatus("Sign in required to start a live call.");
      return;
    }

    setMediaError(null);
    setAudioBlocked(false);
    setCallEnded(false);
    setStatus("Opening camera and microphone...");

    let stream: MediaStream;
    try {
      const mediaResult = await acquireMediaStream(
        profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Member",
      );
      stream = mediaResult.stream;
      localStream.current = stream;
      setActiveStream(stream);

      const vTrack = stream.getVideoTracks()[0];
      const aTrack = stream.getAudioTracks()[0];
      setCamera(Boolean(vTrack && vTrack.enabled));
      setMicrophone(Boolean(aTrack && aTrack.enabled));

      if (mediaResult.warning) {
        setStatus(mediaResult.warning);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Camera or microphone could not be opened.";
      setMediaError(msg);
      setStatus("Media access required.");
      return;
    }

    const room = doc(db, "calls", callId);
    const candidatesCol = collection(room, "candidates");

    const connection = new RTCPeerConnection(ICE_SERVERS);
    peer.current = connection;

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      connection.addTrack(track, stream);
    });

    // Handle incoming remote media tracks
    connection.ontrack = (event) => {
      setRemoteStream((prev) => {
        const next = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
        if (!next.getTracks().some((t) => t.id === event.track.id)) {
          next.addTrack(event.track);
        }
        return next;
      });

      if (event.track.kind === "video") {
        setHasRemoteVideo(true);
      }
    };

    // Update connection status
    const updateConnectionStatus = () => {
      const connState = connection.connectionState;
      const iceState = connection.iceConnectionState;

      if (connState === "connected" || iceState === "connected" || iceState === "completed") {
        setStatus("Connected · Live Video Active");
      } else if (connState === "connecting" || iceState === "checking") {
        setStatus("Connecting with partner...");
      } else if (connState === "disconnected" || iceState === "disconnected") {
        setStatus("Connection interrupted · Reconnecting...");
      } else if (connState === "failed" || iceState === "failed") {
        setStatus("Connection failed. Click Reconnect to restart.");
      }
    };

    connection.onconnectionstatechange = updateConnectionStatus;
    connection.oniceconnectionstatechange = updateConnectionStatus;

    // Send local ICE candidates to Firestore
    connection.onicecandidate = async (event) => {
      if (event.candidate && user) {
        try {
          await addDoc(candidatesCol, {
            candidate: event.candidate.toJSON(),
            sender: user.uid,
            createdAt: Date.now(),
          });
        } catch (e) {
          console.warn("Failed to write candidate:", e);
        }
      }
    };

    // Candidate Queueing to avoid InvalidStateError before remoteDescription is ready
    const queuedCandidates: RTCIceCandidateInit[] = [];
    const seenCandidates = new Set<string>();
    let remoteDescSet = false;

    const processCandidate = async (candidateInit: RTCIceCandidateInit) => {
      if (!candidateInit.candidate) return;
      const candKey = `${candidateInit.candidate}_${candidateInit.sdpMid}_${candidateInit.sdpMLineIndex}`;
      if (seenCandidates.has(candKey)) return;
      seenCandidates.add(candKey);

      if (remoteDescSet && connection.remoteDescription) {
        try {
          await connection.addIceCandidate(candidateInit);
        } catch (e) {
          console.warn("Failed to add ICE candidate:", e);
        }
      } else {
        queuedCandidates.push(candidateInit);
      }
    };

    const flushCandidates = async () => {
      remoteDescSet = true;
      while (queuedCandidates.length > 0) {
        const cand = queuedCandidates.shift();
        if (cand && cand.candidate) {
          try {
            await connection.addIceCandidate(cand);
          } catch (e) {
            console.warn("Failed to add queued candidate:", e);
          }
        }
      }
    };

    // Listen to remote ICE candidates
    const unsubCandidates = onSnapshot(candidatesCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const docData = change.doc.data();
          if (docData && user && docData["sender"] !== user.uid) {
            const candidateInit = docData["candidate"] as RTCIceCandidateInit | undefined;
            if (candidateInit && candidateInit.candidate) {
              void processCandidate(candidateInit);
            }
          }
        }
      });
    });

    // Signaling variables
    let offerCreated = false;
    let answerCreated = false;

    // Helper: Caller creates and publishes fresh offer
    const initiateAsCaller = async () => {
      if (offerCreated) return;
      offerCreated = true;
      try {
        const localOffer = await connection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await connection.setLocalDescription(localOffer);
        await setDoc(room, {
          callerId: user.uid,
          callerName: profile?.displayName || user.displayName || "Partner",
          offer: { type: localOffer.type, sdp: localOffer.sdp },
          answer: null,
          createdAt: Date.now(),
          ended: false,
        });
        setStatus("Waiting for partner to join...");
      } catch (e) {
        console.warn("Create offer failed:", e);
        setStatus("Failed to create call offer.");
      }
    };

    // Listen for room document updates (offer / answer / ended)
    const unsubRoom = onSnapshot(room, async (snapshot) => {
      const data = snapshot.data();

      // Check if partner ended call
      if (data?.["ended"]) {
        setCallEnded(true);
        setStatus("Call ended by partner.");
        return;
      }

      // If document does not exist yet
      if (!data) {
        if (isCallerParam) {
          void initiateAsCaller();
        } else {
          setStatus("Waiting for host to begin call...");
        }
        return;
      }

      const answer = data["answer"] as RTCSessionDescriptionInit | undefined;
      const offer = data["offer"] as RTCSessionDescriptionInit | undefined;
      const roomCallerId = data["callerId"] as string | undefined;

      // Determine role: caller if flagged or creator of room
      const isCaller = Boolean(isCallerParam || roomCallerId === user.uid);

      if (isCaller) {
        // If caller hasn't published offer yet
        if (!offerCreated && (!offer || roomCallerId === user.uid)) {
          void initiateAsCaller();
          return;
        }

        // Caller receives answer from callee
        if (
          answer &&
          !connection.currentRemoteDescription &&
          connection.signalingState === "have-local-offer"
        ) {
          try {
            await connection.setRemoteDescription(new RTCSessionDescription(answer));
            await flushCandidates();
            setStatus("Connected with partner!");
          } catch (e) {
            console.warn("Caller setRemoteDescription failed:", e);
          }
        }
      } else {
        // We are the Callee / Joiner
        if (!offer) {
          setStatus("Waiting for host to start video...");
          return;
        }

        // Callee receives offer and hasn't answered yet
        if (
          offer &&
          !answerCreated &&
          (connection.signalingState === "stable" || connection.signalingState === "have-local-pranswer") &&
          !connection.currentRemoteDescription
        ) {
          try {
            answerCreated = true;
            setStatus("Connecting with partner...");
            await connection.setRemoteDescription(new RTCSessionDescription(offer));
            await flushCandidates();

            const localAnswer = await connection.createAnswer();
            await connection.setLocalDescription(localAnswer);
            await setDoc(
              room,
              {
                answer: { type: localAnswer.type, sdp: localAnswer.sdp },
                answeredAt: Date.now(),
                calleeId: user.uid,
                calleeName: profile?.displayName || user.displayName || "Partner",
              },
              { merge: true },
            );
            setStatus("Connected with partner!");
          } catch (e) {
            console.warn("Joiner createAnswer failed:", e);
          }
        }
      }
    });

    return () => {
      unsubRoom();
      unsubCandidates();
      connection.close();
    };
  }, [callId, user, profile?.displayName, isCallerParam]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void initCall().then((c) => {
      cleanup = c;
    });

    return () => {
      cleanup?.();
      localStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, [initCall, retryCount]);

  // Duration timer
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function toggleTrack(kind: "video" | "audio") {
    const track = localStream.current?.getTracks().find((item) => item.kind === kind);
    if (track) {
      track.enabled = !track.enabled;
      if (kind === "video") setCamera(track.enabled);
      else setMicrophone(track.enabled);
    }
  }

  async function shareScreen() {
    if (!peer.current) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0] ?? null;
      const sender = peer.current.getSenders().find((item) => item.track?.kind === "video");
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
        setSharing(true);
        videoTrack.onended = () => {
          setSharing(false);
          const origTrack = localStream.current?.getVideoTracks()[0] ?? null;
          if (origTrack && sender) {
            void sender.replaceTrack(origTrack);
          }
        };
      }
    } catch (e) {
      console.warn("Screen sharing canceled or failed:", e);
    }
  }

  async function handleEndCall() {
    try {
      if (db) {
        await setDoc(
          doc(db, "calls", callId),
          { ended: true, endedBy: user?.uid, endedAt: Date.now() },
          { merge: true },
        );
      }
    } catch (e) {
      console.warn("Could not mark call ended:", e);
    }
    localStream.current?.getTracks().forEach((track) => track.stop());
    window.location.assign("/messages");
  }

  function handleEnableAudio() {
    if (remoteVideo.current) {
      remoteVideo.current.muted = false;
      remoteVideo.current
        .play()
        .then(() => setAudioBlocked(false))
        .catch(console.warn);
    }
  }

  return (
    <ProtectedView>
      <main className="min-h-dvh bg-slate-950 p-4 text-white sm:p-8">
        <div className="mx-auto max-w-6xl">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-400">Skill Binimoy Live</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Live Learning & Video Room</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-mono font-bold tabular-nums">
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </span>
              <button
                onClick={() => void handleEndCall()}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer"
              >
                Back to Messages
              </button>
            </div>
          </div>

          {/* Connection Status & Reconnect Button */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-block size-2.5 rounded-full ${
                  status.includes("Connected")
                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"
                    : status.includes("Waiting") || status.includes("Joining") || status.includes("Connecting")
                      ? "bg-amber-400 animate-pulse"
                      : "bg-rose-500"
                }`}
              />
              <p className="text-sm font-bold text-slate-200">{status}</p>
            </div>

            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 transition cursor-pointer"
              title="Restart connection and re-gather candidates"
            >
              <RefreshCw className="size-3.5" /> Reconnect Call
            </button>
          </div>

          {/* Autoplay Blocked Notice */}
          {audioBlocked && (
            <button
              type="button"
              onClick={handleEnableAudio}
              className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-950/60 p-3.5 text-xs font-bold text-amber-200 hover:bg-amber-900/60 shadow-lg transition cursor-pointer"
            >
              <Volume2 className="size-4 text-amber-400" />
              Tap here to enable partner audio (browser blocked background sound)
            </button>
          )}

          {/* Media Permission / Device Error Banner with Retry */}
          {mediaError && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-200">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="size-5 shrink-0 text-rose-400" />
                <span>{mediaError}</span>
              </div>
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 active:scale-95 transition cursor-pointer"
              >
                <RefreshCw className="size-3.5" /> Retry Camera & Mic
              </button>
            </div>
          )}

          {/* Video Grid */}
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {/* Remote Video Tile */}
            <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl flex items-center justify-center">
              <video
                ref={remoteVideo}
                autoPlay
                playsInline
                className={`size-full object-cover transition-opacity duration-300 ${
                  hasRemoteVideo ? "opacity-100" : "opacity-0 pointer-events-none absolute"
                }`}
              />
              {!hasRemoteVideo && (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <div className="flex size-16 items-center justify-center rounded-full bg-white/5 mb-3">
                    <UserRound className="size-8 text-slate-500" />
                  </div>
                  <p className="text-sm font-black text-slate-200">Waiting for your partner to connect...</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Their video feed will automatically display here once connected.
                  </p>
                </div>
              )}
              <span className="absolute bottom-3.5 left-3.5 rounded-xl bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-black text-white shadow-xs">
                Skill Partner
              </span>
            </div>

            {/* Local Video Tile */}
            <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl flex items-center justify-center">
              <video
                ref={localVideo}
                autoPlay
                muted
                playsInline
                className={`size-full object-cover transition-opacity duration-300 ${
                  camera && activeStream ? "opacity-100" : "opacity-0 pointer-events-none absolute"
                }`}
              />
              {(!camera || !activeStream) && (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <div className="flex size-16 items-center justify-center rounded-full bg-white/5 mb-3">
                    <CameraOff className="size-8 text-slate-500" />
                  </div>
                  <p className="text-sm font-black text-slate-200">
                    {mediaError ? "Camera unavailable" : "Camera is turned off"}
                  </p>
                  {mediaError && (
                    <button
                      onClick={() => setRetryCount((c) => c + 1)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-primary-hover transition cursor-pointer"
                    >
                      <RefreshCw className="size-3" /> Retry camera
                    </button>
                  )}
                </div>
              )}
              <span className="absolute bottom-3.5 left-3.5 rounded-xl bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-black text-white flex items-center gap-1.5 shadow-xs">
                <span>You</span>
                {!microphone && <MicOff className="size-3 text-rose-400" />}
              </span>
            </div>
          </div>

          {/* Call Controls */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              title={camera ? "Turn camera off" : "Turn camera on"}
              onClick={() => toggleTrack("video")}
              className={`grid size-13 place-items-center rounded-full transition active:scale-95 cursor-pointer shadow-md ${
                camera ? "bg-white/10 hover:bg-white/20 text-white" : "bg-rose-600 text-white"
              }`}
            >
              {camera ? <Camera className="size-5" /> : <CameraOff className="size-5" />}
            </button>
            <button
              title={microphone ? "Mute microphone" : "Unmute microphone"}
              onClick={() => toggleTrack("audio")}
              className={`grid size-13 place-items-center rounded-full transition active:scale-95 cursor-pointer shadow-md ${
                microphone ? "bg-white/10 hover:bg-white/20 text-white" : "bg-rose-600 text-white"
              }`}
            >
              {microphone ? <Mic className="size-5" /> : <MicOff className="size-5" />}
            </button>
            <button
              title="Share screen"
              onClick={() => void shareScreen()}
              className={`grid size-13 place-items-center rounded-full transition active:scale-95 cursor-pointer shadow-md ${
                sharing ? "bg-blue-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              <MonitorUp className="size-5" />
            </button>
            <button
              title="End call"
              onClick={() => void handleEndCall()}
              className="grid size-13 place-items-center rounded-full bg-red-600 hover:bg-red-500 text-white transition active:scale-95 shadow-lg shadow-red-600/40 cursor-pointer"
            >
              <PhoneOff className="size-5" />
            </button>
          </div>
        </div>

        {/* Partner Left Modal */}
        {callEnded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 text-center text-white shadow-2xl">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 mb-3">
                <PhoneOff className="size-6" />
              </div>
              <h3 className="text-lg font-black">Call Ended</h3>
              <p className="mt-1 text-xs text-slate-400">
                Your partner has ended the video session.
              </p>
              <Link
                to="/messages"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-hover transition"
              >
                Return to Messages
              </Link>
            </div>
          </div>
        )}
      </main>
    </ProtectedView>
  );
}
