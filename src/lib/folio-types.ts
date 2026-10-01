import { z } from "zod";
import type { Json, Tables } from "@/integrations/supabase/types";

export type Perfil = Tables<"perfis">;
export type Bloco = Tables<"blocos">;

export const TIPOS_BLOCO = ["link", "imagem", "texto", "video", "mapa", "newsletter"] as const;
export type TipoBloco = (typeof TIPOS_BLOCO)[number];

export const rotulosTipo: Record<TipoBloco, string> = {
  link: "Link",
  imagem: "Imagem",
  texto: "Texto",
  video: "YouTube",
  mapa: "Mapa",
  newsletter: "Newsletter",
};

export const descricoesTipo: Record<TipoBloco, string> = {
  link: "Botão que abre um site em nova aba",
  imagem: "Foto ou banner do seu Storage",
  texto: "Texto livre ou chave Pix / e-mail para copiar",
  video: "Vídeo do YouTube incorporado",
  mapa: "Localização com mapa",
  newsletter: "Capture e-mails de visitantes",
};

/** Só aceita http(s): bloqueia `javascript:` e afins em links vindos do banco. */
export const urlSegura = z
  .string()
  .trim()
  .url("Informe uma URL válida")
  .refine((value) => /^https?:\/\//i.test(value), "Use um link começando com http:// ou https://");

// Schemas do campo `conteudo` (JSONB). São usados tanto no formulário quanto na
// renderização: se o JSON do banco não tiver as chaves esperadas, o bloco
// mostra um estado vazio em vez de quebrar com `undefined`.
export const conteudoSchemas = {
  link: z.object({
    url: urlSegura,
    rotulo: z.string().trim().max(80).optional().default(""),
  }),
  imagem: z.object({
    caminho: z.string().trim().min(1, "Envie uma imagem"),
    alt: z.string().trim().max(140).optional().default(""),
    link: urlSegura.optional().or(z.literal("")).default(""),
  }),
  texto: z.object({
    texto: z.string().trim().min(1, "Escreva algum texto").max(1000),
    tipo_copia: z.boolean().optional().default(false),
  }),
  video: z.object({
    url: urlSegura.refine((value) => extrairIdYoutube(value) !== null, "Use um link do YouTube"),
  }),
  mapa: z.object({
    lat: z.coerce.number().min(-90, "Latitude inválida").max(90, "Latitude inválida"),
    lng: z.coerce.number().min(-180, "Longitude inválida").max(180, "Longitude inválida"),
    endereco: z.string().trim().max(160).optional().default(""),
  }),
  newsletter: z.object({
    descricao: z.string().trim().max(200).optional().default(""),
    botao: z.string().trim().max(30).optional().default(""),
  }),
} satisfies Record<TipoBloco, z.ZodTypeAny>;

export type ConteudoPorTipo = { [T in TipoBloco]: z.infer<(typeof conteudoSchemas)[T]> };

export function ehTipoBloco(value: string): value is TipoBloco {
  return (TIPOS_BLOCO as readonly string[]).includes(value);
}

/** Lê o JSONB com segurança. Retorna `null` se faltar alguma chave obrigatória. */
export function lerConteudo<T extends TipoBloco>(
  tipo: T,
  conteudo: Json,
): ConteudoPorTipo[T] | null {
  const parsed = conteudoSchemas[tipo].safeParse(conteudo ?? {});
  return parsed.success ? (parsed.data as ConteudoPorTipo[T]) : null;
}

/** Objeto cru (sem validar) para preencher o formulário de edição. */
export function conteudoBruto(conteudo: Json): Record<string, unknown> {
  return conteudo && typeof conteudo === "object" && !Array.isArray(conteudo)
    ? { ...conteudo }
    : {};
}

export function extrairIdYoutube(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = parsed.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = parsed.searchParams.get("v");
      const match = parsed.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/);
      if (!id && match) id = match[2] ?? null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

// --- Perfil -----------------------------------------------------------------

export const REDES_SOCIAIS = [
  "instagram",
  "linkedin",
  "github",
  "youtube",
  "x",
  "tiktok",
  "site",
] as const;
export type RedeSocial = (typeof REDES_SOCIAIS)[number];

export const rotulosRede: Record<RedeSocial, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  github: "GitHub",
  youtube: "YouTube",
  x: "X / Twitter",
  tiktok: "TikTok",
  site: "Site",
};

const temaSchema = z.object({
  redes_sociais: z.record(z.string(), z.string()).optional().default({}),
});

/** Redes sociais ficam em `configuracao_tema.redes_sociais`; descarta valores que não sejam URLs http(s). */
export function lerRedesSociais(configuracao: Json): Partial<Record<RedeSocial, string>> {
  const parsed = temaSchema.safeParse(configuracao ?? {});
  if (!parsed.success) return {};
  const redes: Partial<Record<RedeSocial, string>> = {};
  for (const rede of REDES_SOCIAIS) {
    const url = parsed.data.redes_sociais[rede];
    if (url && urlSegura.safeParse(url).success) redes[rede] = url;
  }
  return redes;
}

export const SLUGS_RESERVADOS = [
  "auth",
  "onboarding",
  "api",
  "admin",
  "login",
  "logout",
  "assets",
  "static",
  "editar",
];

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9_-]{2,29}$/,
    "Use 3–30 letras minúsculas, números, - ou _ (começando com letra ou número)",
  )
  .refine((value) => !SLUGS_RESERVADOS.includes(value), "Este endereço é reservado");

export const perfilFormSchema = z.object({
  nome_completo: z.string().trim().min(1, "Informe seu nome").max(80),
  bio: z.string().trim().max(280, "Máximo de 280 caracteres"),
  slug: slugSchema,
});
