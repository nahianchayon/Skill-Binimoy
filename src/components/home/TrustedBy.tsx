const partners = [
  "Dhaka University",
  "BUET",
  "NSU",
  "Coursera Partner",
  "Google Developers",
  "AWS Educate",
  "GitHub Education",
  "Figma Community",
];

export function TrustedBy() {
  return (
    <section aria-label="Trusted by" className="border-y py-10">
      <p className="text-muted-foreground text-center text-xs font-semibold tracking-widest uppercase">
        Trusted by universities, communities and technology teams
      </p>
      <div className="relative mt-8 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <ul className="animate-marquee flex w-max items-center gap-14 pr-14">
          {[...partners, ...partners].map((name, i) => (
            <li
              key={`${name}-${i}`}
              className="text-muted-foreground hover:text-primary text-lg font-bold whitespace-nowrap opacity-60 transition-all duration-300 hover:opacity-100"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
