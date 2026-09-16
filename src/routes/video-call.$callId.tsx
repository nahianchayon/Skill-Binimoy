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
} from "lucide-react";
import { addDoc, collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { ProtectedView } from "@/components/common/ProtectedView";

export const Route = createFileRoute("/video-call/$callId")({
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
    ctx.fillText("(Hardware camera was denied or in use)", 320, 335);

    requestAnimationFrame(draw);
  }
  draw();
  const stream = canvas.captureStream(24);

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    }
  } catch (e) {
    console.warn("Could not attach fallback audio track:", e);
  }

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
      audio: { echoCancellation: true, noiseSuppression: true },
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

function VideoCallPage() {
  const { callId } = Route.useParams();
  const { user, profile } = useAuth();
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState("Preparing secure learning room...");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Attach local stream to video element whenever activeStream or element becomes available
  useEffect(() => {
    if (localVideo.current && activeStream) {
      localVideo.current.srcObject = activeStream;
      localVideo.current.muted = true;
      localVideo.current.playsInline = true;
      localVideo.current.play().catch((e) => console.warn("Local play error:", e));
    }
  }, [activeStream]);

  const initCall = useCallback(async () => {
    if (!user || !db) {
      setStatus("Configure Firebase to start a live call.");
      return;
    }

    setMediaError(null);
    setStatus("Opening camera and microphone...");

    let stream: MediaStream;
    try {
      const mediaResult = await acquireMediaStream(
        profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Member",
      );
      stream = mediaResult.stream;
      localStream.current = stream;
      setActiveStream(stream);

      // Inspect actual acquired tracks
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
    const isCallerParam = new URLSearchParams(window.location.search).get("caller") === "true";
    const callStartTime = Date.now();
    const currentSessionId = `${isCallerParam ? "caller" : "peer"}_${callStartTime}`;

    const connection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });
    peer.current = connection;

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => connection.addTrack(track, stream));

    // Handle remote tracks safely
    connection.ontrack = (event) => {
      let remote = event.streams[0];
      if (!remote) {
        remote = new MediaStream();
        remote.addTrack(event.track);
      }
      if (remoteVideo.current) {
        if (!remoteVideo.current.srcObject) {
          remoteVideo.current.srcObject = remote;
        } else {
          const currentStream = remoteVideo.current.srcObject as MediaStream;
          if (!currentStream.getTracks().some((t) => t.id === event.track.id)) {
            currentStream.addTrack(event.track);
          }
        }
        remoteVideo.current.playsInline = true;
        remoteVideo.current.play().catch((e) => console.warn("Remote play error:", e));
        setHasRemoteVideo(true);
      }
    };

    connection.onconnectionstatechange = () => {
      const st = connection.connectionState;
      if (st === "connected") {
        setStatus("Connected · Live Video Active");
      } else if (st === "connecting") {
        setStatus("Connecting with partner...");
      } else if (st === "disconnected" || st === "failed") {
        setStatus("Call disconnected. Reconnecting...");
      }
    };

    // Send ICE candidates to Firestore
    connection.onicecandidate = async (event) => {
      if (event.candidate && user) {
        try {
          await addDoc(collection(room, "candidates"), {
            candidate: event.candidate.toJSON(),
            sender: user.uid,
            sessionId: currentSessionId,
            createdAt: Date.now(),
          });
        } catch (e) {
          console.warn("Failed to write candidate:", e);
        }
      }
    };

    // Candidate Queueing to avoid InvalidStateError before remoteDescription
    const candidateQueue: RTCIceCandidateInit[] = [];
    let remoteDescriptionSet = false;

    const processCandidate = async (candidateInit: RTCIceCandidateInit) => {
      if (remoteDescriptionSet && connection.remoteDescription) {
        try {
          await connection.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (e) {
          console.warn("Failed to add ICE candidate:", e);
        }
      } else {
        candidateQueue.push(candidateInit);
      }
    };

    const flushCandidates = async () => {
      while (candidateQueue.length > 0) {
        const cand = candidateQueue.shift();
        if (cand) {
          try {
            await connection.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.warn("Failed to add queued candidate:", e);
          }
        }
      }
    };

    // Track initialization
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
          sessionId: currentSessionId,
        });
        setStatus("Waiting for partner to join...");
      } catch (e) {
        console.warn("Create offer failed:", e);
        setStatus("Failed to create call offer.");
      }
    };

    // If this peer is explicitly the caller, initiate immediately
    if (isCallerParam) {
      void initiateAsCaller();
    }

    // Listen for room offer / answer changes
    const unsubRoom = onSnapshot(room, async (snapshot) => {
      const data = snapshot.data();
      if (!data) {
        if (!isCallerParam && !offerCreated) {
          void initiateAsCaller();
        }
        return;
      }

      const answer = data["answer"] as RTCSessionDescriptionInit | undefined;
      const offer = data["offer"] as RTCSessionDescriptionInit | undefined;
      const roomCallerId = data["callerId"] as string | undefined;
      const offerCreatedAt = typeof data["createdAt"] === "number" ? data["createdAt"] : 0;
      const isRecentOffer = Boolean(offer && Date.now() - offerCreatedAt < 15 * 60 * 1000);

      // Caller receives answer from joiner
      if (
        answer &&
        !connection.currentRemoteDescription &&
        connection.signalingState === "have-local-offer" &&
        (isCallerParam || roomCallerId === user.uid)
      ) {
        try {
          await connection.setRemoteDescription(new RTCSessionDescription(answer));
          remoteDescriptionSet = true;
          await flushCandidates();
          setStatus("Connected with partner!");
        } catch (e) {
          console.warn("Caller setRemoteDescription failed:", e);
        }
      }

      // Joiner receives offer from caller
      if (
        isRecentOffer &&
        offer &&
        !connection.currentRemoteDescription &&
        connection.signalingState === "stable" &&
        roomCallerId !== user.uid &&
        !answerCreated
      ) {
        try {
          answerCreated = true;
          await connection.setRemoteDescription(new RTCSessionDescription(offer));
          remoteDescriptionSet = true;
          await flushCandidates();

          const localAnswer = await connection.createAnswer();
          await connection.setLocalDescription(localAnswer);
          await setDoc(
            room,
            {
              answer: { type: localAnswer.type, sdp: localAnswer.sdp },
              answeredAt: Date.now(),
            },
            { merge: true },
          );
          setStatus("Connected with partner!");
        } catch (e) {
          console.warn("Joiner createAnswer failed:", e);
        }
      }

      // If room has no recent offer and peer is not caller, initiate as caller
      if (!isRecentOffer && !offerCreated && !isCallerParam) {
        void initiateAsCaller();
      }
    });

    // Listen for ICE candidates (only from current session)
    const unsubCandidates = onSnapshot(collection(room, "candidates"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const docData = change.doc.data();
          const candidateCreatedAt = typeof docData["createdAt"] === "number" ? docData["createdAt"] : 0;
          if (
            user &&
            docData["sender"] !== user.uid &&
            candidateCreatedAt >= callStartTime - 5000
          ) {
            const candidateInit = docData["candidate"] as RTCIceCandidateInit | undefined;
            if (candidateInit) {
              void processCandidate(candidateInit);
            }
          }
        }
      });
    });

    return () => {
      unsubRoom();
      unsubCandidates();
      connection.close();
    };
  }, [callId, user, profile?.displayName]);

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

  // Call timer
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

  return (
    <ProtectedView>
      <main className="min-h-dvh bg-slate-950 p-5 text-white sm:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-blue-400">Skill Binimoy Live</p>
              <h1 className="mt-1 text-2xl font-black">Live Learning & Video Room</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-mono tabular-nums">
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </span>
              <Link
                to="/messages"
                className="rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
              >
                Back to Messages
              </Link>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-block size-2 rounded-full ${
                status.includes("Connected")
                  ? "bg-emerald-500 animate-pulse"
                  : status.includes("Waiting") || status.includes("Joining")
                    ? "bg-amber-400"
                    : "bg-blue-400"
              }`}
            />
            <p className="text-sm font-medium text-slate-300">{status}</p>
          </div>

          {/* Media Permission / Device Error Banner with Retry */}
          {mediaError && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-5 shrink-0 text-rose-400" />
                <span>{mediaError}</span>
              </div>
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 active:scale-95 transition"
              >
                <RefreshCw className="size-3.5" /> Retry Camera & Mic
              </button>
            </div>
          )}

          {/* Video Grid */}
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {/* Remote Video Tile */}
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl flex items-center justify-center">
              <video
                ref={remoteVideo}
                autoPlay
                playsInline
                className={`size-full object-cover ${hasRemoteVideo ? "block" : "hidden"}`}
              />
              {!hasRemoteVideo && (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <div className="flex size-16 items-center justify-center rounded-full bg-white/5 mb-3">
                    <UserRound className="size-8 text-slate-500" />
                  </div>
                  <p className="text-sm font-bold">Waiting for your partner to connect...</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Their video feed will automatically display here.
                  </p>
                </div>
              )}
              <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-white">
                Skill Partner
              </span>
            </div>

            {/* Local Video Tile */}
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl flex items-center justify-center">
              <video
                ref={localVideo}
                autoPlay
                muted
                playsInline
                className={`size-full object-cover ${camera && activeStream ? "block" : "hidden"}`}
              />
              {(!camera || !activeStream) && (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <div className="flex size-16 items-center justify-center rounded-full bg-white/5 mb-3">
                    <CameraOff className="size-8 text-slate-500" />
                  </div>
                  <p className="text-sm font-bold">
                    {mediaError ? "Camera unavailable" : "Camera is turned off"}
                  </p>
                  {mediaError && (
                    <button
                      onClick={() => setRetryCount((c) => c + 1)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-hover"
                    >
                      <RefreshCw className="size-3" /> Retry camera
                    </button>
                  )}
                </div>
              )}
              <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-white flex items-center gap-1.5">
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
              className={`grid size-12 place-items-center rounded-full transition active:scale-95 ${
                camera ? "bg-white/10 hover:bg-white/20 text-white" : "bg-rose-600 text-white"
              }`}
            >
              {camera ? <Camera className="size-5" /> : <CameraOff className="size-5" />}
            </button>
            <button
              title={microphone ? "Mute microphone" : "Unmute microphone"}
              onClick={() => toggleTrack("audio")}
              className={`grid size-12 place-items-center rounded-full transition active:scale-95 ${
                microphone ? "bg-white/10 hover:bg-white/20 text-white" : "bg-rose-600 text-white"
              }`}
            >
              {microphone ? <Mic className="size-5" /> : <MicOff className="size-5" />}
            </button>
            <button
              title="Share screen"
              onClick={() => void shareScreen()}
              className={`grid size-12 place-items-center rounded-full transition active:scale-95 ${
                sharing ? "bg-blue-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              <MonitorUp className="size-5" />
            </button>
            <button
              title="End call"
              onClick={() => {
                localStream.current?.getTracks().forEach((track) => track.stop());
                window.location.assign("/messages");
              }}
              className="grid size-12 place-items-center rounded-full bg-red-600 hover:bg-red-500 text-white transition active:scale-95 shadow-lg shadow-red-600/30"
            >
              <PhoneOff className="size-5" />
            </button>
          </div>
        </div>
      </main>
    </ProtectedView>
  );
}
