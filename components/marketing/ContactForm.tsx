'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTimeout(() => setSent(true), 600);
  }

  if (sent) {
    return <p className="text-green-600">Message sent (mock).</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <input className="w-full border p-2" placeholder="Email" required />
      <textarea className="w-full border p-2" placeholder="Message" required />
      <button className="rounded bg-black px-4 py-2 text-white">
        Send
      </button>
    </form>
  );
}
