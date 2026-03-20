export default function HeroFlourish() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="hero-steel absolute inset-0" />
      <div className="hero-structure-grid absolute inset-0" />
      <div className="hero-beam hero-beam-a absolute inset-y-0 -left-[22%] w-[34%]" />
      <div className="hero-beam hero-beam-b absolute inset-y-0 left-[34%] w-[22%]" />
      <div className="hero-scanlines absolute inset-0" />
      <div className="hero-vignette absolute inset-0" />
    </div>
  );
}
