

interface BrandLogoProps {
  variant?: "full" | "icon";
  className?: string;
}

export default function BrandLogo({ variant = "full", className = "" }: BrandLogoProps) {
  if (variant === "icon") {
    return (
      <div
        className={`w-10 h-10 overflow-hidden rounded-lg shrink-0 ${className}`}
        aria-hidden
      >
        <img
          src="/panel/fayyaz-logo.png"
          alt=""
          width={160}
          height={53}
          className="h-10 w-auto max-w-none"
        />
      </div>
    );
  }

  return (
    <img
      src="/panel/fayyaz-logo.png"
      alt="Fayyaz Travels"
      width={160}
      height={53}
      className={`h-10 w-auto object-contain shrink-0 ${className}`}
    />
  );
}
