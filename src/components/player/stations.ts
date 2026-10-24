/**
 * What the tape deck plays. Two sources, kept apart on purpose:
 *
 * - Tapes: audio files the site itself serves from /public/lofi, listed in
 *   /lofi/playlist.json (written by scripts/fetch-lofi.ts). Only CC0 or
 *   CC-BY music goes here, because shipping a file is redistributing it.
 * - Radio: official Spotify / YouTube embed players. The platform streams and
 *   licenses the audio; the site only hosts their iframe, so nothing is
 *   redistributed. The iframe loads only after a click (it sets cookies and
 *   talks to a third party), never on page load.
 */

export interface Tape {
  src: string;
  title: string;
  artist: string;
  /** SPDX-style id, e.g. "CC0-1.0" or "CC-BY-4.0". */
  license: string;
  /** Page the track was taken from, for the credit line. */
  source?: string;
}

export interface Playlist {
  name: string;
  tracks: Tape[];
}

export const PLAYLIST_URL = "/lofi/playlist.json";

export interface Station {
  id: string;
  name: string;
  by: string;
  kind: "youtube" | "spotify";
  embed: string;
  /** Height of the embed at the deck's width. */
  height: number;
}

export const STATIONS: Station[] = [
  {
    id: "lofigirl",
    name: "lofi hip hop radio",
    by: "Lofi Girl · YouTube",
    kind: "youtube",
    embed: "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&modestbranding=1&rel=0",
    height: 146,
  },
  {
    id: "lofigirl-spotify",
    name: "lofi beats to relax/study to",
    by: "Lofi Girl · Spotify",
    kind: "spotify",
    embed: "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator&theme=0",
    height: 152,
  },
];
