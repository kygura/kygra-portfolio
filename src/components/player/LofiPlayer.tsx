/**
 * Tape deck: a small lofi player fixed to the bottom-right corner (the moss
 * golem has the bottom-left). Collapsed it is one square button with a level
 * meter; open, it plays the site's own CC0 tapes or tunes into a curated
 * Spotify / YouTube embed. It sits outside the routes, so playback carries
 * across page changes. `m` plays and pauses the tapes. Colours are the theme
 * tokens, so it follows the 1–6 accent switch with no code of its own.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isTyping } from "@/theme/keymap";
import { readStored } from "@/theme/accent";
import Cassette from "./Cassette";
import { PLAYLIST_URL, STATIONS, type Playlist, type Station } from "./stations";

const STORE_KEY = "nca-deck";

interface Saved {
  volume: number;
  track: number;
  mode: "tapes" | "radio";
}

function loadSaved(): Saved {
  const fallback: Saved = { volume: 0.5, track: 0, mode: "tapes" };
  try {
    const raw = readStored(STORE_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

const clock = (s: number) =>
  Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "–:––";

export default function LofiPlayer() {
  const saved = useRef(loadSaved()).current;
  const audioRef = useRef<HTMLAudioElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Saved["mode"]>(saved.mode);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(saved.track);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(NaN);
  const [volume, setVolume] = useState(saved.volume);
  const [station, setStation] = useState<Station | null>(null);

  const tracks = useMemo(() => playlist?.tracks ?? [], [playlist]);
  const track = tracks.length ? tracks[index % tracks.length] : null;

  // The playlist is fetched on first use, not on page load.
  const loadPlaylist = useCallback(async () => {
    if (playlist) return playlist;
    try {
      const res = await fetch(PLAYLIST_URL);
      if (!res.ok) throw new Error(String(res.status));
      const list = (await res.json()) as Playlist;
      setPlaylist(list);
      return list;
    } catch {
      setFailed(true);
      setPlaylist({ name: "", tracks: [] });
      return null;
    }
  }, [playlist]);

  useEffect(() => {
    if (open) void loadPlaylist();
  }, [open, loadPlaylist]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ volume, track: index, mode }));
    } catch {
      /* storage blocked: the deck just forgets */
    }
  }, [volume, index, mode]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const play = useCallback(async () => {
    const list = await loadPlaylist();
    const audio = audioRef.current;
    if (!audio || !list?.tracks.length) return;
    setStation(null); // one source at a time
    if (!audio.src) audio.src = list.tracks[index % list.tracks.length].src;
    audio.play().catch(() => setPlaying(false));
  }, [loadPlaylist, index]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) audio.pause();
    else void play();
  }, [play]);

  const go = useCallback(
    (step: number) => {
      if (!tracks.length) return;
      const next = (index + step + tracks.length) % tracks.length;
      setIndex(next);
      const audio = audioRef.current;
      if (!audio) return;
      const resume = !audio.paused || audio.ended;
      audio.src = tracks[next].src;
      setTime(0);
      if (resume) audio.play().catch(() => setPlaying(false));
    },
    [tracks, index],
  );

  const tuneIn = (s: Station) => {
    audioRef.current?.pause();
    setStation(s);
  };

  // `m` plays / pauses the tapes, with the same guards as the site's other keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return;
      if (e.key === "m") {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape" && open) {
        setOpen(false);
        fabRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle, open]);

  // `inert` isn't in React 18's types; it keeps the closed panel out of the tab order.
  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  // Clicking anywhere outside closes the panel; playback keeps going.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !fabRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const live = playing || station !== null;
  const progress = duration > 0 ? time / duration : 0;

  const seekBy = (dt: number) => {
    const audio = audioRef.current;
    if (audio && duration > 0) audio.currentTime = Math.min(duration, Math.max(0, audio.currentTime + dt));
  };

  return (
    <div className="deck" data-open={open || undefined} data-live={live || undefined}>
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => go(1)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => setPlaying(false)}
      />

      {/* Kept mounted while closed so a radio iframe keeps playing. */}
      <div ref={panelRef} className="deck__panel" role="dialog" aria-label="Music player">
        <div className="deck__source" role="tablist" aria-label="Source">
          {(["tapes", "radio"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>

        {mode === "tapes" && (
          <div className="deck__body">
            {track ? (
              <>
                <Cassette progress={progress} />

                <p className="deck__now">
                  <span className="deck__title">{track.title}</span>
                  <span className="deck__meta">
                    {track.artist}, {track.license}
                    {track.source && (
                      <>
                        {" · "}
                        <a href={track.source} target="_blank" rel="noreferrer">
                          source
                        </a>
                      </>
                    )}
                  </span>
                </p>

                {/* The seek line is a road; the square is how far along it you are. */}
                <div
                  className="deck__road"
                  role="slider"
                  tabIndex={0}
                  aria-label="Seek"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(duration) || 0}
                  aria-valuenow={Math.round(time)}
                  aria-valuetext={`${clock(time)} of ${clock(duration)}`}
                  onPointerDown={(e) => {
                    const audio = audioRef.current;
                    if (!audio || !(duration > 0)) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    audio.currentTime = ((e.clientX - r.left) / r.width) * duration;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") seekBy(10);
                    else if (e.key === "ArrowLeft") seekBy(-10);
                    else return;
                    e.preventDefault();
                  }}
                >
                  <span style={{ left: `${progress * 100}%` }} />
                </div>
                <div className="deck__clock">
                  <span>{clock(time)}</span>
                  <span>
                    {(index % tracks.length) + 1} / {tracks.length}
                  </span>
                  <span>{clock(duration)}</span>
                </div>

                <div className="deck__keys">
                  <button type="button" onClick={() => go(-1)} aria-label="Previous tape">
                    rew
                  </button>
                  <button
                    type="button"
                    aria-pressed={playing}
                    onClick={toggle}
                    aria-label={playing ? "Pause" : "Play"}
                    aria-keyshortcuts="m"
                  >
                    {playing ? "pause" : "play"}
                  </button>
                  <button type="button" onClick={() => go(1)} aria-label="Next tape">
                    ff
                  </button>
                  <label className="deck__vol">
                    <span className="sr-only">Volume</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                    />
                  </label>
                </div>
              </>
            ) : (
              <p className="deck__empty">
                {failed || playlist ? "The shelf is empty. Try the radio." : <>Loading tapes<span className="deck__dots" /></>}
              </p>
            )}
          </div>
        )}

        <div className="deck__body" hidden={mode !== "radio"}>
          {/* Stations read as a list of dialogue choices. */}
          <ol className="deck__choices">
            {STATIONS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={station?.id === s.id}
                  onClick={() => (station?.id === s.id ? setStation(null) : tuneIn(s))}
                >
                  <span className="deck__choice-no">{i + 1}.</span>
                  <span>
                    {s.name}
                    <span className="deck__meta">{s.by}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {station ? (
            <iframe
              key={station.id}
              className="deck__embed"
              title={`${station.name}, ${station.by}`}
              src={station.embed}
              height={station.height}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              loading="lazy"
            />
          ) : (
            <p className="deck__meta deck__note">Tuning in loads that service's own player.</p>
          )}
        </div>
      </div>

      <button
        ref={fabRef}
        type="button"
        className="deck__fab"
        aria-expanded={open}
        aria-label={open ? "Close music player" : "Open music player"}
        title="Music (m to play / pause)"
        onClick={() => setOpen((o) => !o)}
      >
        {/* A tiny cassette whose reels turn while anything plays. */}
        <svg viewBox="0 0 28 18" aria-hidden="true">
          <rect className="fab__shell" x="0.5" y="0.5" width="27" height="17" />
          <rect className="fab__window" x="5" y="4" width="18" height="6" />
          <g className="fab__reel" style={{ transformOrigin: "9.5px 7px" }}>
            <circle cx="9.5" cy="7" r="2" />
            <path d="M9.5 5v4" />
          </g>
          <g className="fab__reel" style={{ transformOrigin: "18.5px 7px" }}>
            <circle cx="18.5" cy="7" r="2" />
            <path d="M18.5 5v4" />
          </g>
          <path className="fab__shell" d="M7 17.5 8.5 14h11l1.5 3.5" />
        </svg>
      </button>
    </div>
  );
}
