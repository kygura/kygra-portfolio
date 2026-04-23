"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface TypewriterEffectProps {
  text: string | string[];
  typingDelay?: number;
  deletingDelay?: number;
  delay?: number;
  startDelay?: number;
  loop?: boolean;
  smartBackspace?: boolean;
  cursor?: boolean;
  cursorCharacter?: React.ReactNode;
  className?: string;
  cursorClassName?: string;
}

export const TypewriterEffect = ({
  text,
  typingDelay = 100,
  deletingDelay = 50,
  delay = 1000,
  startDelay = 0,
  loop = false,
  smartBackspace = false,
  cursor = true,
  cursorCharacter = "|",
  className,
  cursorClassName,
}: TypewriterEffectProps) => {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const [started, setStarted] = useState(false);

  const texts = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);
  const currentText = texts[textIndex % texts.length];

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!started) {
      timeout = setTimeout(() => setStarted(true), startDelay);
      return () => clearTimeout(timeout);
    }

    const handleTyping = () => {
      // If deleting
      if (isDeleting) {
        // Calculate common prefix with next string if smartBackspace is enabled
        let stopLength = 0;
        if (smartBackspace) {
          const nextIndex = (textIndex + 1) % texts.length;
          const nextText = texts[nextIndex];

          let i = 0;
          while (i < currentText.length && i < nextText.length && currentText[i] === nextText[i]) {
            i++;
          }
          stopLength = i;
        }

        if (displayText.length > stopLength) {
          setDisplayText((prev) => prev.slice(0, -1));
          timeout = setTimeout(handleTyping, deletingDelay);
        } else {
          setIsDeleting(false);
          setTextIndex((prev) => prev + 1);
          timeout = setTimeout(handleTyping, typingDelay); // Start typing next string
        }
        return;
      }

      // If typing
      if (displayText.length < currentText.length) {
        setDisplayText(currentText.slice(0, displayText.length + 1));
        timeout = setTimeout(handleTyping, typingDelay);
      } else {
        // Finished typing
        if (loop || textIndex < texts.length - 1) {
          timeout = setTimeout(() => setIsDeleting(true), delay);
        }
      }
    };

    timeout = setTimeout(handleTyping, typingDelay);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, textIndex, texts, typingDelay, deletingDelay, delay, loop, currentText, started, startDelay, smartBackspace]);

  return (
    <span className={cn("inline-block", className)}>
      {displayText}
      {cursor && (
        <span className={cn("animate-pulse", cursorClassName)}>{cursorCharacter}</span>
      )}
    </span>
  );
};

export default TypewriterEffect;
