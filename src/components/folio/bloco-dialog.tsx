import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ImageIcon,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Search,
  Type,
  Upload,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { enviarImagem, urlPublica, useAtualizarBloco, useCriarBloco } from "@/lib/folio-api";
import {
  TIPOS_BLOCO,
  conteudoBruto,
  conteudoSchemas,
  descricoesTipo,
  ehTipoBloco,
  rotulosTipo,
  type Bloco,
  type TipoBloco,
} from "@/lib/folio-types";
import type { Json } from "@/integrations/supabase/types";

const icones: Record<TipoBloco, LucideIcon> = {
  link: Link2,
  imagem: ImageIcon,
  texto: Type,
  video: Youtube,
  mapa: MapPin,
  newsletter: Mail,
};

const tamanhoPadrao: Record<TipoBloco, { colunas: number; linhas: number }> = {
  link: { colunas: 1, linhas: 1 },
  imagem: { colunas: 2, linhas: 2 },
  texto: { colunas: 2, linhas: 1 },
  video: { colunas: 2, linhas: 2 },
  mapa: { colunas: 2, linhas: 1 },
  newsletter: { colunas: 2, linhas: 1 },
};

type Props = { perfilId: number; bloco?: Bloco | undefined; onClose: () => void };

export default function BlocoDialog({ perfilId, bloco, onClose }: Props) {
  const criar = useCriarBloco(perfilId);
  const atualizar = useAtualizarBloco(perfilId);

  const tipoInicial = bloco && ehTipoBloco(bloco.tipo) ? bloco.tipo : null;
  const [tipo, setTipo] = useState<TipoBloco | null>(tipoInicial);
  const [titulo, setTitulo] = useState(bloco?.titulo ?? "");
  const [colunas, setColunas] = useState(bloco?.colunas ?? 1);
  const [linhas, setLinhas] = useState(bloco?.linhas ?? 1);
  const [visivel, setVisivel] = useState(bloco?.visivel ?? true);
  const [conteudo, setConteudo] = useState<Record<string, unknown>>(
    conteudoBruto(bloco?.conteudo ?? {}),
  );
  const [erro, setErro] = useState<string | null>(null);

  const salvando = criar.isPending || atualizar.isPending;
  const definir = (chave: string, valor: unknown) =>
    setConteudo((atual) => ({ ...atual, [chave]: valor }));

  function escolherTipo(novo: TipoBloco) {
    setTipo(novo);
    setColunas(tamanhoPadrao[novo].colunas);
    setLinhas(tamanhoPadrao[novo].linhas);
    setConteudo(novo === "texto" ? { tipo_copia: false } : {});
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!tipo) return;
    const parsed = conteudoSchemas[tipo].safeParse(conteudo);
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Confira os campos");
      return;
    }
    if (titulo.trim().length > 80) {
      setErro("O título deve ter no máximo 80 caracteres");
      return;
    }
    setErro(null);
    const dados = {
      tipo,
      titulo: titulo.trim() || null,
      conteudo: parsed.data as Json,
      colunas,
      linhas,
      visivel,
    };
    try {
      if (bloco) {
        await atualizar.mutateAsync({ id: bloco.id, dados });
        toast.success("Bloco atualizado");
      } else {
        await criar.mutateAsync({ ...dados, perfil_id: perfilId });
      }
      onClose();
    } catch {
      // O toast de erro já é exibido pelo onError da mutação; mantém o modal aberto.
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-slate-800 bg-slate-950 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {bloco
              ? `Editar bloco · ${tipo ? rotulosTipo[tipo] : ""}`
              : tipo
                ? `Novo bloco · ${rotulosTipo[tipo]}`
                : "Adicionar bloco"}
          </DialogTitle>
          <DialogDescription>
            {tipo
              ? "Preencha o conteúdo e o tamanho do bloco na grid."
              : "Escolha o tipo de bloco que deseja adicionar."}
          </DialogDescription>
        </DialogHeader>

        {!tipo ? (
          <div className="grid grid-cols-2 gap-3">
            {TIPOS_BLOCO.map((opcao) => {
              const Icone = icones[opcao];
              return (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => escolherTipo(opcao)}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-left transition-colors hover:border-violet-500/50 focus-visible:border-violet-500"
                >
                  <Icone className="h-5 w-5 text-violet-300" />
                  <span className="font-semibold text-slate-50">{rotulosTipo[opcao]}</span>
                  <span className="text-xs text-slate-400">{descricoesTipo[opcao]}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <form onSubmit={(event) => void salvar(event)} className="grid gap-5">
            {!bloco && (
              <button
                type="button"
                onClick={() => setTipo(null)}
                className="flex w-fit items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
              >
                <ArrowLeft className="h-3 w-3" />
                Trocar tipo
              </button>
            )}

            <Campo rotulo="Título (opcional)">
              <Input
                value={titulo}
                maxLength={80}
                onChange={(event) => setTitulo(event.target.value)}
                placeholder="Aparece no topo do bloco"
              />
            </Campo>

            <CamposConteudo tipo={tipo} conteudo={conteudo} definir={definir} />

            <div className="grid grid-cols-2 gap-4">
              <Campo rotulo="Largura">
                <Seletor valores={[1, 2, 3, 4]} atual={colunas} onChange={setColunas} />
              </Campo>
              <Campo rotulo="Altura">
                <Seletor valores={[1, 2]} atual={linhas} onChange={setLinhas} />
              </Campo>
            </div>

            <label className="flex items-center justify-between rounded-2xl border border-slate-800 p-3 text-sm">
              <span>
                <span className="font-medium text-slate-50">Visível</span>
                <span className="block text-xs text-slate-400">
                  Desligado = rascunho, só você vê.
                </span>
              </span>
              <Switch checked={visivel} onCheckedChange={setVisivel} />
            </label>

            {erro && (
              <p role="alert" className="text-sm text-red-400">
                {erro}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="gradient" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar bloco"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-200">
      {rotulo}
      {children}
      {dica && <span className="text-xs font-normal text-slate-400">{dica}</span>}
    </label>
  );
}

function Seletor({
  valores,
  atual,
  onChange,
}: {
  valores: number[];
  atual: number;
  onChange: (valor: number) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {valores.map((valor) => (
        <Button
          key={valor}
          type="button"
          size="sm"
          variant={atual === valor ? "gradient" : "outline"}
          className="flex-1 rounded-lg"
          onClick={() => onChange(valor)}
        >
          {valor}
        </Button>
      ))}
    </div>
  );
}

const texto = (valor: unknown) =>
  typeof valor === "string" || typeof valor === "number" ? String(valor) : "";

function CamposConteudo({
  tipo,
  conteudo,
  definir,
}: {
  tipo: TipoBloco;
  conteudo: Record<string, unknown>;
  definir: (chave: string, valor: unknown) => void;
}) {
  const input = (
    chave: string,
    props: { placeholder?: string; type?: string; maxLength?: number } = {},
  ) => (
    <Input
      value={texto(conteudo[chave])}
      onChange={(event) => definir(chave, event.target.value)}
      {...props}
    />
  );

  switch (tipo) {
    case "link":
      return (
        <>
          <Campo rotulo="URL">
            {input("url", { type: "url", placeholder: "https://nocodestartup.io" })}
          </Campo>
          <Campo rotulo="Rótulo">
            {input("rotulo", { placeholder: "Acesse o site", maxLength: 80 })}
          </Campo>
        </>
      );
    case "imagem":
      return (
        <>
          <UploadImagem
            caminho={texto(conteudo["caminho"])}
            onEnviado={(caminho) => definir("caminho", caminho)}
          />
          <Campo rotulo="Texto alternativo" dica="Descreve a imagem para leitores de tela.">
            {input("alt", { maxLength: 140 })}
          </Campo>
          <Campo rotulo="Link ao clicar (opcional)">
            {input("link", { type: "url", placeholder: "https://…" })}
          </Campo>
        </>
      );
    case "texto":
      return (
        <>
          <Campo rotulo="Texto">
            <Textarea
              value={texto(conteudo["texto"])}
              maxLength={1000}
              rows={4}
              onChange={(event) => definir("texto", event.target.value)}
              placeholder="Escreva algo ou cole sua chave Pix"
            />
          </Campo>
          <label className="flex items-center justify-between rounded-2xl border border-slate-800 p-3 text-sm">
            <span>
              <span className="font-medium text-slate-50">Bloco de cópia</span>
              <span className="block text-xs text-slate-400">
                Ao tocar, o visitante copia o texto (ex.: chave Pix, e-mail).
              </span>
            </span>
            <Switch
              checked={conteudo["tipo_copia"] === true}
              onCheckedChange={(valor) => definir("tipo_copia", valor)}
            />
          </label>
        </>
      );
    case "video":
      return (
        <Campo rotulo="Link do YouTube">
          {input("url", { type: "url", placeholder: "https://www.youtube.com/watch?v=…" })}
        </Campo>
      );
    case "mapa":
      return <CamposMapa conteudo={conteudo} definir={definir} input={input} />;
    case "newsletter":
      return (
        <>
          <Campo rotulo="Descrição">
            {input("descricao", { placeholder: "Receba novidades no seu e-mail", maxLength: 200 })}
          </Campo>
          <Campo rotulo="Texto do botão">
            {input("botao", { placeholder: "Inscrever", maxLength: 30 })}
          </Campo>
        </>
      );
  }
}

function CamposMapa({
  conteudo,
  definir,
  input,
}: {
  conteudo: Record<string, unknown>;
  definir: (chave: string, valor: unknown) => void;
  input: (
    chave: string,
    props?: { placeholder?: string; type?: string; maxLength?: number },
  ) => ReactNode;
}) {
  const [buscando, setBuscando] = useState(false);

  // Geocodificação via Nominatim (OpenStreetMap). Uso leve, uma busca por clique.
  async function buscar() {
    const endereco = texto(conteudo["endereco"]).trim();
    if (!endereco) {
      toast.error("Digite um endereço para buscar");
      return;
    }
    setBuscando(true);
    try {
      const resposta = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(endereco)}`,
        {
          headers: { "Accept-Language": "pt-BR" },
        },
      );
      const resultados = (await resposta.json()) as Array<{ lat: string; lon: string }>;
      const primeiro = resultados[0];
      if (!primeiro) {
        toast.error("Endereço não encontrado");
        return;
      }
      definir("lat", Number(Number(primeiro.lat).toFixed(6)));
      definir("lng", Number(Number(primeiro.lon).toFixed(6)));
      toast.success("Coordenadas encontradas");
    } catch {
      toast.error("Não foi possível buscar o endereço");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <>
      <Campo rotulo="Endereço">
        <div className="flex gap-2">
          {input("endereco", { placeholder: "Av Paulista, 1000 - São Paulo", maxLength: 160 })}
          <Button
            type="button"
            variant="outline"
            onClick={() => void buscar()}
            disabled={buscando}
            aria-label="Buscar coordenadas"
          >
            {buscando ? <Loader2 className="animate-spin" /> : <Search />}
          </Button>
        </div>
      </Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo rotulo="Latitude">{input("lat", { type: "number", placeholder: "-23.55" })}</Campo>
        <Campo rotulo="Longitude">{input("lng", { type: "number", placeholder: "-46.63" })}</Campo>
      </div>
    </>
  );
}

function UploadImagem({
  caminho,
  onEnviado,
}: {
  caminho: string;
  onEnviado: (caminho: string) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const preview = urlPublica(caminho);

  async function aoEscolher(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    setEnviando(true);
    try {
      onEnviado(await enviarImagem(arquivo));
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha no envio");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid gap-2 text-sm font-medium text-slate-200">
      Imagem
      <label
        className={cn(
          "relative flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 transition-colors hover:border-violet-500/50",
          enviando && "pointer-events-none opacity-60",
        )}
      >
        {preview ? (
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <span className="relative z-10 flex items-center gap-2 rounded-xl bg-slate-950/80 px-3 py-2 text-xs">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {enviando ? "Enviando…" : preview ? "Trocar imagem" : "Escolher imagem (até 5 MB)"}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => void aoEscolher(event)}
        />
      </label>
    </div>
  );
}
