"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function SoonPage({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="px-4 py-16 lg:px-8">
      <div className="card max-w-xl p-8">
      <h2 className="display text-3xl lg:text-4xl">{title}</h2>
      <p className="mt-3 max-w-xl text-sm text-mute">{note}</p>
      <Link href={`/projects/${id}/overview`} className="mt-6 inline-block text-sm text-trail underline">
        Voltar à visão geral
      </Link>
      </div>
    </div>
  );
}
