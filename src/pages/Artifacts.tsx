
const Artifacts = () => {
  return (
    <div className="px-6 md:px-12 lg:px-16 py-12 max-w-4xl mx-auto">
      <div className="prose-minimal animate-fade-in">
        <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-[var(--text-secondary)] mb-6">
          ( 05 &mdash; ARTIFACTS )
        </p>
        <h1>Artifacts</h1>
        <p className="text-xl text-muted-foreground mb-12">
          A collection of digital objects and experiments.
        </p>

        <div className="p-12 border border-dashed border-primary/20 rounded-lg text-center text-muted-foreground bg-card/50">
          <p className="italic">The gallery is currently empty.</p>
        </div>
      </div>
    </div>
  );
};

export default Artifacts;
