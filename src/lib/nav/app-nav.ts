import type { UserRole } from "@/lib/types";

export type NavItem = { href: string; label: string };

export type AdminSection = {
  slug: string;
  label: string;
};

export const ADMIN_SECTIONS: AdminSection[] = [
  { slug: "openrouter", label: "OpenRouter" },
  { slug: "consumo", label: "Consumo" },
  { slug: "usuarios", label: "Usuários" },
  { slug: "planos", label: "Planos" },
  { slug: "jobs", label: "Jobs" },
  { slug: "templates", label: "Templates" },
  { slug: "auditoria", label: "Auditoria" },
  { slug: "custos", label: "Custos" },
];

export function adminSection(slug: string | undefined): AdminSection {
  return ADMIN_SECTIONS.find((s) => s.slug === slug) ?? ADMIN_SECTIONS[0]!;
}

export function appNavItems(role: UserRole): NavItem[] {
  const items: NavItem[] = [
    { href: "/dashboard", label: "Projetos" },
    { href: "/projects/new", label: "Novo projeto" },
    { href: "/profile", label: "Perfil" },
  ];
  return role === "admin" ? [...items, { href: "/admin", label: "Administração" }] : items;
}
