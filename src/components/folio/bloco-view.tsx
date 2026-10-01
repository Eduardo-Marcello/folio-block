import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, Check, Copy, Link2, Mail, MapPin, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ehErroDuplicado, inscreverLead, urlPublica } from "@/lib/folio-api";
import {
  ehTipoBloco,
  extrairIdYoutube,
  lerConteudo,
  type Bloco,
  type ConteudoPorTipo,
} from "@/lib/folio-types";

type Props = { bloco: Bloco; editando: boolean };

/** Renderiza o miolo de um bloco. Valida o JSONB antes de usar qualquer chave. */
export function BlocoView({ bloco, editando }: Props) {
  if (!ehTipoBloco(bloco.tipo))
    return <BlocoIncompleto mensagem={`Tipo desconhecido: ${bloco.tipo}`} />;

  switch (bloco.tipo) {
    case "link": {
      const c = lerConteudo("link", bloco.conteudo);
      return c ? (
        <BlocoLink titulo={bloco.titulo} conteudo={c} editando={editando} />
      ) : (
        <BlocoIncompleto />
      );
    }
    case "imagem": {
      const c = lerConteudo("imagem", bloco.conteudo);
      return c ? (
        <BlocoImagem titulo={bloco.titulo} conteudo={c} editando={editando} />
      ) : (
        <BlocoIncompleto />
      );
    }
    case "texto": {
      const c = lerConteudo("texto", bloco.conteudo);
      return c ? (
        <BlocoTexto titulo={bloco.titulo} conteudo={c} editando={editando} />
      ) : (
        <BlocoIncompleto />
      );
    }
    case "video": {
      const c = lerConteudo("video", bloco.conteudo);
      const id = c ? extrairIdYoutube(c.url) : null;
      return id ? (
        <BlocoVideo titulo={bloco.titulo} videoId={id} editando={editando} />
      ) : (
        <BlocoIncompleto />
      );
    }
    case "mapa": {
      const c = lerConteudo("mapa", bloco.conteudo);
      return c ? (
        <BlocoMapa titulo={bloco.titulo} conteudo={c} editando={editando} />
      ) : (
        <BlocoIncompleto />
      );
    }
    case "newsletter": {
      const c = lerConteudo("newsletter", bloco.conteudo) ?? { descricao: "", botao: "" };
      return (
        <BlocoNewsletter
          perfilId={bloco.perfil_id}
          titulo={bloco.titulo}
          conteudo={c}
          editando={editando}
        />
      );
    }
  }
}

/** Conteúdo inválido/incompleto no JSONB: o grid usa isso para esconder o bloco de visitantes. */
export function blocoRenderizavel(bloco: Bloco) {
  if (!ehTipoBloco(bloco.tipo)) return false;
  if (bloco.tipo === "newsletter") return true;
  if (bloco.tipo === "video") {
    const c = lerConteudo("video", bloco.conteudo);
    return Boolean(c && extrairIdYoutube(c.url));
  }
  return lerConteudo(bloco.tipo, bloco.conteudo) !== null;
}

function Titulo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn("text-xs font-semibold uppercase tracking-[0.14em] text-violet-300", className)}
    >
      {children}
    </p>
  );
}

/** Em modo de edição os links viram `div` para não navegar ao clicar/arrastar. */
function LinkExterno({
  href,
  editando,
  className,
  label,
  children,
}: {
  href: string;
  editando: boolean;
  className?: string;
  label: string;
  children: ReactNode;
}) {
  if (editando) return <div className={className}>{children}</div>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={className}
    >
      {children}
    </a>
  );
}

function BlocoLink({
  titulo,
  conteudo,
  editando,
}: {
  titulo: string | null;
  conteudo: ConteudoPorTipo["link"];
  editando: boolean;
}) {
  const host = new URL(conteudo.url).hostname.replace(/^www\./, "");
  const rotulo = conteudo.rotulo || host;
  return (
    <LinkExterno
      href={conteudo.url}
      editando={editando}
      label={`Abrir ${rotulo} em nova aba`}
      className="flex h-full flex-col justify-between gap-6 p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30">
          <Link2 className="h-5 w-5" />
        </span>
        <ArrowUpRight className="h-5 w-5 text-slate-500 transition-colors group-hover:text-violet-300" />
      </div>
      <div className="min-w-0">
        {titulo && <Titulo className="mb-1">{titulo}</Titulo>}
        <p className="truncate text-lg font-bold text-slate-50">{rotulo}</p>
        <p className="mt-1 truncate text-sm text-slate-400">{host}</p>
      </div>
    </LinkExterno>
  );
}

function BlocoImagem({
  titulo,
  conteudo,
  editando,
}: {
  titulo: string | null;
  conteudo: ConteudoPorTipo["imagem"];
  editando: boolean;
}) {
  const src = urlPublica(conteudo.caminho);
  const inner = (
    <>
      {src && (
        <img
          src={src}
          alt={conteudo.alt || titulo || ""}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {titulo && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-5 pt-12">
          <p className="font-bold text-slate-50">{titulo}</p>
        </div>
      )}
    </>
  );
  if (conteudo.link) {
    return (
      <LinkExterno
        href={conteudo.link}
        editando={editando}
        label={`Abrir ${titulo || "imagem"} em nova aba`}
        className="absolute inset-0"
      >
        {inner}
      </LinkExterno>
    );
  }
  return <div className="absolute inset-0">{inner}</div>;
}

function BlocoTexto({
  titulo,
  conteudo,
  editando,
}: {
  titulo: string | null;
  conteudo: ConteudoPorTipo["texto"];
  editando: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  if (!conteudo.tipo_copia) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 p-6">
        {titulo && <Titulo>{titulo}</Titulo>}
        <p className="whitespace-pre-wrap break-words text-base leading-7 text-slate-200">
          {conteudo.texto}
        </p>
      </div>
    );
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(conteudo.texto);
      setCopiado(true);
      toast.success("Copiado para a área de transferência");
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copiar()}
      disabled={editando}
      aria-label={`Copiar ${titulo || "texto"}`}
      className="flex h-full w-full flex-col justify-between gap-4 p-6 text-left disabled:cursor-default"
    >
      <div className="flex w-full items-start justify-between gap-3">
        {titulo ? <Titulo>{titulo}</Titulo> : <span />}
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 transition-colors",
            copiado
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40"
              : "bg-violet-500/15 text-violet-300 ring-violet-500/30",
          )}
        >
          {copiado ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        </span>
      </div>
      <div className="min-w-0 w-full">
        <p className="break-all font-mono text-base text-slate-50">{conteudo.texto}</p>
        <p className="mt-2 text-xs text-slate-400">{copiado ? "Copiado!" : "Toque para copiar"}</p>
      </div>
    </button>
  );
}

function BlocoVideo({
  titulo,
  videoId,
  editando,
}: {
  titulo: string | null;
  videoId: string;
  editando: boolean;
}) {
  return (
    <div className="absolute inset-0">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={titulo || "Vídeo do YouTube"}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className={cn("h-full w-full border-0", editando && "pointer-events-none")}
      />
    </div>
  );
}

function BlocoMapa({
  titulo,
  conteudo,
  editando,
}: {
  titulo: string | null;
  conteudo: ConteudoPorTipo["mapa"];
  editando: boolean;
}) {
  const { lat, lng } = conteudo;
  const bbox = [lng - 0.012, lat - 0.007, lng + 0.012, lat + 0.007].join(",");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return (
    <div className="absolute inset-0">
      <iframe
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`}
        title={conteudo.endereco || titulo || "Mapa"}
        loading="lazy"
        className="pointer-events-none h-full w-full border-0 opacity-80 [filter:invert(0.92)_hue-rotate(180deg)_saturate(0.7)]"
      />
      <LinkExterno
        href={mapsUrl}
        editando={editando}
        label={`Abrir ${conteudo.endereco || "localização"} no mapa`}
        className="absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-5 pt-14"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/40">
          <MapPin className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          {titulo && <Titulo>{titulo}</Titulo>}
          <p className="truncate font-semibold text-slate-50">
            {conteudo.endereco || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </p>
        </div>
      </LinkExterno>
    </div>
  );
}

function BlocoNewsletter({
  perfilId,
  titulo,
  conteudo,
  editando,
}: {
  perfilId: number;
  titulo: string | null;
  conteudo: ConteudoPorTipo["newsletter"];
  editando: boolean;
}) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const parsed = z.string().trim().toLowerCase().email().max(254).safeParse(email);
    if (!parsed.success) {
      toast.error("Digite um e-mail válido");
      return;
    }
    setEnviando(true);
    try {
      await inscreverLead(perfilId, parsed.data);
      setEmail("");
      toast.success("Inscrição confirmada!");
    } catch (erro) {
      if (ehErroDuplicado(erro)) toast.info("Este e-mail já está inscrito");
      else toast.error("Não foi possível se inscrever agora");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex h-full flex-col justify-center p-6">
      <Mail className="mb-3 h-6 w-6 text-violet-300" />
      <p className="text-lg font-bold text-slate-50">{titulo || "Receba novidades"}</p>
      {conteudo.descricao && <p className="mt-1 text-sm text-slate-400">{conteudo.descricao}</p>}
      <form onSubmit={(event) => void enviar(event)} className="mt-4 flex gap-2">
        <Input
          type="email"
          aria-label="Seu e-mail"
          placeholder="voce@email.com"
          value={email}
          maxLength={254}
          onChange={(event) => setEmail(event.target.value)}
          disabled={editando}
          className="h-10 rounded-xl border-slate-700 bg-slate-950/60"
        />
        <Button
          type="submit"
          variant="gradient"
          disabled={editando || enviando}
          className="h-10 rounded-xl"
        >
          {enviando ? "Enviando…" : conteudo.botao || "Inscrever"}
        </Button>
      </form>
    </div>
  );
}

function BlocoIncompleto({ mensagem }: { mensagem?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-slate-400">
      <TriangleAlert className="h-6 w-6 text-amber-400" />
      <p className="text-sm">{mensagem ?? "Bloco incompleto — edite para preencher o conteúdo."}</p>
    </div>
  );
}
