"use client";

import { EditProjectDetails } from "@/components/projects/edit-project-details";
import { useProjectBundle } from "@/lib/store";
import { useParams, useRouter } from "next/navigation";

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { project } = useProjectBundle(id);
  if (!project) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:py-10">
      <h1 className="display text-3xl lg:text-4xl">Editar projeto</h1>
      <p className="mt-2 text-sm leading-6 text-mute">
        O projeto voltou para rascunho. Ajuste o nome e a ideia; ao salvar, o planejamento é refeito a partir daqui.
      </p>
      <EditProjectDetails project={project} onClose={() => router.push(`/projects/${id}`)} />
    </div>
  );
}
