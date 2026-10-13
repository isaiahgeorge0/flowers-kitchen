import { instagram } from "@/lib/site";
import { textLink } from "@/lib/typography";

export function InstagramLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={instagram.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${textLink} decoration-sorrel ${className}`}
    >
      {instagram.handle}
      <span className="sr-only"> on Instagram (opens in a new tab)</span>
    </a>
  );
}
