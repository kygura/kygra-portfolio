import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const SoundtrackPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.25;

    // Attempt to play automatically
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.log("Autoplay prevented:", error);
        setIsPlaying(false);
      });
    }
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      audio.play().then(() => {
        setIsPlaying(true);
        // If we're starting playback, ensure we're not muted unless user explicitly muted previously? 
        // Actually, just play.
      }).catch((err) => {
        console.error("Playback failed", err);
        toast.error("Could not play soundtrack");
      });
    } else {
      // If playing, this button will act as a Mute toggle based on requirement "can be muted"
      // But we need a way to un-mute too.
      // Let's separate functionality:
      // If we are NOT playing (autoplay blocked), click -> PLAY.
      // If we ARE playing, click -> TOGGLE MUTE.

      const newMutedState = !isMuted;
      audio.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 md:right-12 lg:right-16 z-50 animate-fade-in">
      <audio
        ref={audioRef}
        src="/soundtrack.mp3"
        loop
        onEnded={() => setIsPlaying(true)}
        onPause={() => {
          // If manually paused via controls (if we expose them) or system
        }}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={`
              rounded-full w-10 h-10 backdrop-blur-sm shadow-lg
              transition-all duration-150 hover:scale-105
              ${isPlaying && !isMuted
                /* Playing + audible — teal: active/live signal */
                ? "bg-[#2ab4b4]/20 border-[#2ab4b4] hover:bg-[#2ab4b4]/35 text-[#2ab4b4]"
                : isMuted
                  /* Playing + muted — yellow: attention, audio is off */
                  ? "bg-[#f5c842]/15 border-[#f5c842] hover:bg-[#f5c842]/30 text-[#f5c842]"
                  /* Stopped — ink at low opacity: dormant */
                  : "bg-[#0a0a0a]/70 border-[#f0ede6]/25 hover:border-[#f0ede6]/60 text-[#f0ede6]/60 hover:text-[#f0ede6]"
              }
            `}
            onClick={togglePlayback}
            aria-label={isPlaying ? (isMuted ? "Unmute soundtrack" : "Mute soundtrack") : "Play soundtrack"}
          >
            {!isPlaying ? (
              <Play className="w-4 h-4 ml-0.5" />
            ) : isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>

        <TooltipContent side="left" className="m-2">
          <p className="text-xs font-medium flex items-center gap-2">
            <span className="animate-[spin_3s_linear_infinite]">💿</span>
            <span className="text-primary">The Girl Next Door</span>
            by
            <span className="text-primary">tomppabeats</span>
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
