import { useEffect, useMemo, useRef, useState } from "react";

type Track = {
  id: string;
  kind: "url" | "youtube";
  src?: string; 
  videoId?: string; 
};

function uid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isDirectAudioUrl(url: string): boolean {
  const u = url.trim();
  return /^https?:\/\//i.test(u) && /\.(mp3|wav|ogg)(\?.*)?$/i.test(u);
}

function isYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    return (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtu.be"
    );
  } catch {
    return false;
  }
}

function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return u.pathname.split("/").filter(Boolean)[0] || null;
    }
    if (u.pathname === "/watch") {
      return u.searchParams.get("v") || null;
    }
    const shorts = u.pathname.match(/^\/shorts\/([^/]+)/);
    if (shorts?.[1]) return shorts[1];

    const embed = u.pathname.match(/^\/embed\/([^/]+)/);
    if (embed?.[1]) return embed[1];

    return null;
  } catch {
    return null;
  }
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ytPlayerRef = useRef<any>(null);
  const ytReadyRef = useRef<boolean>(false);

  const [inputVal, setInputVal] = useState<string>("");
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8); // 0.0 to 1.0

  const currentIndex = useMemo(() => {
    if (!currentId) return -1;
    return playlist.findIndex((t) => t.id === currentId);
  }, [playlist, currentId]);

  const currentTrack = useMemo(() => {
    if (currentIndex < 0) return null;
    return playlist[currentIndex];
  }, [playlist, currentIndex]);

  // ---------- YouTube API loader ----------
  useEffect(() => {
    if (window.YT?.Player) {
      ytReadyRef.current = true;
      return;
    }

    const existing = document.querySelector('script[data-yt-iframe="1"]');
    if (existing) return;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.dataset.ytIframe = "1";

    window.onYouTubeIframeAPIReady = () => {
      ytReadyRef.current = true;
    };

    document.body.appendChild(tag);
  }, []);

  useEffect(() => {
    const id = "yt-secret-player";

    const ensurePlayer = () => {
      if (!ytReadyRef.current || !window.YT?.Player) return;
      if (ytPlayerRef.current) return;

      ytPlayerRef.current = new window.YT.Player(id, {
        height: "0",
        width: "0",
        videoId: "",
        playerVars: { controls: 0, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            // Set initial volume when player is ready
            try { ytPlayerRef.current?.setVolume(Math.round(volume * 100)); } catch {}
          },
          onStateChange: (e: any) => {
            if (e?.data === 0) {
              setPlaying(false);
              next();
            }
            if (e?.data === 1) setPlaying(true);
            if (e?.data === 2) setPlaying(false);
          },
        },
      });
    };

    ensurePlayer();
    const t = window.setInterval(() => {
      ensurePlayer();
      if (ytPlayerRef.current) window.clearInterval(t);
    }, 100);

    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync volume to both players whenever it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    try {
      if (ytPlayerRef.current?.setVolume) {
        ytPlayerRef.current.setVolume(Math.round(volume * 100));
      }
    } catch {}
  }, [volume, currentTrack]);

  const stopHtmlAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  };

  const stopYouTube = () => {
    try { ytPlayerRef.current?.stopVideo?.(); } catch {}
  };

  // Load track
  useEffect(() => {
    if (!currentTrack) {
      stopHtmlAudio();
      stopYouTube();
      setPlaying(false);
      return;
    }

    if (currentTrack.kind === "youtube") {
      stopHtmlAudio();
      const vid = currentTrack.videoId;
      if (!vid) return;
      try {
        if (playing) ytPlayerRef.current?.loadVideoById?.(vid);
        else ytPlayerRef.current?.cueVideoById?.(vid);
      } catch {}
      return;
    }

    stopYouTube();
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = currentTrack.src || "";
    audio.load();

    if (playing) {
      audio.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, playing]);

  // HTML audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => next();
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist, currentId]);

  const next = () => {
    if (playlist.length === 0) return;
    if (currentIndex < 0) {
      setCurrentId(playlist[0].id);
      return;
    }
    const ni = currentIndex + 1;
    if (ni >= playlist.length) {
      setPlaying(false);
      return;
    }
    setCurrentId(playlist[ni].id);
    setPlaying(true);
  };

  const processInput = (u: string) => {
    if (isDirectAudioUrl(u)) {
      const track: Track = { id: uid(), src: u, kind: "url" };
      setPlaylist((p) => {
        const nextList = [...p, track];
        if (!currentId) setCurrentId(track.id);
        return nextList;
      });
      setPlaying(true);
    } else if (isYouTubeUrl(u)) {
      const vid = extractYouTubeVideoId(u);
      if (vid) {
        const track: Track = { id: uid(), kind: "youtube", videoId: vid };
        setPlaylist((p) => {
          const nextList = [...p, track];
          if (!currentId) setCurrentId(track.id);
          return nextList;
        });
        setPlaying(true);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = inputVal.trim();
      if (!val) return;

      const lowerVal = val.toLowerCase();

      // Secret Commands
      if (lowerVal === "/pause") {
        setPlaying(false);
        if (currentTrack?.kind === "youtube") ytPlayerRef.current?.pauseVideo?.();
        else audioRef.current?.pause();
      } else if (lowerVal === "/play") {
        setPlaying(true);
        if (currentTrack?.kind === "youtube") ytPlayerRef.current?.playVideo?.();
        else audioRef.current?.play();
      } else if (lowerVal === "/skip" || lowerVal === "/next") {
        next();
      } else if (lowerVal === "/clear") {
        setPlaylist([]);
        setCurrentId(null);
        setPlaying(false);
      } else if (lowerVal.startsWith("/vol ") || lowerVal.startsWith("/volume ")) {
        // Extract the number from the command
        const match = lowerVal.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          const clamped = Math.max(0, Math.min(100, num)) / 100; // clamp between 0.0 and 1.0
          setVolume(clamped);
        }
      } else {
        // Assume it's a URL
        processInput(val);
      }
      
      setInputVal(""); // Clear the input after pressing enter so it stays secret
    }
  };

  return (
    <div className="rounded-3xl border  p-4 border-slate-800 bg-slate-950/40 opacity-70 hover:opacity-100 transition-opacity">
      {/* Disguised as a simple note/search input */}
      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a quick note..."
        className="w-full bg-transparent outline-none text-sm  text-slate-300 placeholder:text-slate-400"
      />

      {/* Completely invisible players */}
      <audio ref={audioRef} className="hidden" />
      <div className="fixed -top-[9999px] -left-[9999px] h-0 w-0 opacity-0 pointer-events-none">
        <div id="yt-secret-player" />
      </div>
    </div>
  );
}