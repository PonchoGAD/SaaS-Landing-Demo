export default function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="font-semibold">SaaS Demo</span>
        <nav className="space-x-4 text-sm text-gray-600">
          <a href="/pricing">Pricing</a>
          <a href="/faq">FAQ</a>
          <a href="/contact">Contact</a>
        </nav>
      </div>
    </header>
  );
}
