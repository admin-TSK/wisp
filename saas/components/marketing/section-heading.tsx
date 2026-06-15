import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        align === "center" && "mx-auto max-w-2xl text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-sm text-caption font-medium uppercase tracking-widest text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-title font-bold tracking-tight text-text-primary">{title}</h2>
      {description ? (
        <p className="mt-sm text-callout leading-relaxed text-text-secondary">{description}</p>
      ) : null}
    </div>
  );
}
