const features = [
  'App Router architecture',
  'Route-based i18n',
  'SEO-ready metadata',
  'Minimal MVP scope',
];

export default function FeatureGrid() {
  return (
    <div className="mt-24 grid gap-8 md:grid-cols-2">
      {features.map(f => (
        <div key={f} className="rounded border p-6">
          {f}
        </div>
      ))}
    </div>
  );
}
