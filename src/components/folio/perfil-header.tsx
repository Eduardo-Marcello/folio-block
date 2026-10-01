import {
  Github,
  Globe,
  Instagram,
  Linkedin,
  Music2,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { urlPublica } from "@/lib/folio-api";
import { lerRedesSociais, rotulosRede, type Perfil, type RedeSocial } from "@/lib/folio-types";

const iconesRede: Record<RedeSocial, LucideIcon> = {
  instagram: Instagram,
  linkedin: Linkedin,
  github: Github,
  youtube: Youtube,
  x: Twitter,
  tiktok: Music2,
  site: Globe,
};

export function PerfilHeader({ perfil }: { perfil: Perfil }) {
  const avatar = urlPublica(perfil.avatar_url);
  const redes = Object.entries(lerRedesSociais(perfil.configuracao_tema)) as Array<
    [RedeSocial, string]
  >;
  const nome = perfil.nome_completo || `@${perfil.slug}`;
  const iniciais = nome
    .replace("@", "")
    .split(/\s+/)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="mx-auto mb-8 flex max-w-5xl flex-col items-center gap-4 text-center md:flex-row md:items-end md:text-left">
      {avatar ? (
        <img
          src={avatar}
          alt={`Foto de ${nome}`}
          width={112}
          height={112}
          referrerPolicy="no-referrer"
          className="h-24 w-24 rounded-[30%] object-cover ring-2 ring-violet-500/40 md:h-28 md:w-28"
        />
      ) : (
        <div
          aria-hidden
          className="grid h-24 w-24 place-items-center rounded-[30%] bg-gradient-to-br from-violet-600 to-fuchsia-600 text-3xl font-bold text-white md:h-28 md:w-28"
        >
          {iniciais || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-bold text-slate-50 md:text-4xl">{nome}</h1>
        <p className="mt-1 text-sm text-violet-300">@{perfil.slug}</p>
        {perfil.bio && (
          <p className="mt-3 max-w-xl whitespace-pre-wrap text-slate-400">{perfil.bio}</p>
        )}
      </div>
      {redes.length > 0 && (
        <nav aria-label="Redes sociais" className="flex flex-wrap justify-center gap-2">
          {redes.map(([rede, url]) => {
            const Icone = iconesRede[rede];
            return (
              <a
                key={rede}
                href={url}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={rotulosRede[rede]}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-300 backdrop-blur-md transition-colors hover:border-violet-500/50 hover:text-violet-300"
              >
                <Icone className="h-5 w-5" />
              </a>
            );
          })}
        </nav>
      )}
    </section>
  );
}
