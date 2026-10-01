import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Upload } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { ehErroDuplicado, enviarImagem, urlPublica, useAtualizarPerfil } from "@/lib/folio-api";
import {
  REDES_SOCIAIS,
  conteudoBruto,
  lerRedesSociais,
  perfilFormSchema,
  rotulosRede,
  urlSegura,
  type Perfil,
  type RedeSocial,
} from "@/lib/folio-types";

type Props = { perfil: Perfil; onClose: () => void };

export default function PerfilDialog({ perfil, onClose }: Props) {
  const navigate = useNavigate();
  const atualizar = useAtualizarPerfil(perfil);
  const [nome, setNome] = useState(perfil.nome_completo);
  const [bio, setBio] = useState(perfil.bio);
  const [slug, setSlug] = useState(perfil.slug);
  const [avatar, setAvatar] = useState(perfil.avatar_url);
  const [redes, setRedes] = useState<Partial<Record<RedeSocial, string>>>(
    lerRedesSociais(perfil.configuracao_tema),
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function trocarAvatar(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    setEnviando(true);
    try {
      setAvatar(await enviarImagem(arquivo));
    } catch (falha) {
      toast.error(falha instanceof Error ? falha.message : "Falha no envio");
    } finally {
      setEnviando(false);
    }
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    const parsed = perfilFormSchema.safeParse({ nome_completo: nome, bio, slug });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Confira os campos");
      return;
    }
    const redesLimpas: Record<string, string> = {};
    for (const rede of REDES_SOCIAIS) {
      const url = redes[rede]?.trim();
      if (!url) continue;
      if (!urlSegura.safeParse(url).success) {
        setErro(`Link inválido em ${rotulosRede[rede]} (use https://…)`);
        return;
      }
      redesLimpas[rede] = url;
    }
    setErro(null);

    try {
      const salvo = await atualizar.mutateAsync({
        ...parsed.data,
        avatar_url: avatar,
        configuracao_tema: {
          ...conteudoBruto(perfil.configuracao_tema),
          redes_sociais: redesLimpas,
        },
      });
      toast.success("Perfil atualizado");
      onClose();
      if (salvo.slug !== perfil.slug)
        await navigate({ to: "/$slug", params: { slug: salvo.slug }, replace: true });
    } catch (falha) {
      setErro(
        ehErroDuplicado(falha)
          ? "Este endereço já está em uso. Escolha outro."
          : "Não foi possível salvar o perfil",
      );
    }
  }

  const preview = urlPublica(avatar);

  return (
    <Dialog
      open
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-slate-800 bg-slate-950 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>
            Foto, nome, bio, endereço da página e redes sociais.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void salvar(event)} className="grid gap-5">
          <div className="flex items-center gap-4">
            {preview ? (
              <img
                src={preview}
                alt=""
                referrerPolicy="no-referrer"
                className="h-20 w-20 rounded-[30%] object-cover ring-2 ring-violet-500/40"
              />
            ) : (
              <div className="h-20 w-20 rounded-[30%] bg-gradient-to-br from-violet-600 to-fuchsia-600" />
            )}
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-violet-500/50">
                {enviando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {enviando ? "Enviando…" : "Trocar foto"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                disabled={enviando}
                onChange={(event) => void trocarAvatar(event)}
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Nome
            <Input value={nome} maxLength={80} onChange={(event) => setNome(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Bio
            <Textarea
              value={bio}
              maxLength={280}
              rows={3}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Conte em poucas palavras quem você é"
            />
            <span className="text-right text-xs font-normal text-slate-500">{bio.length}/280</span>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Endereço da página
            <div className="flex items-center rounded-md border border-input focus-within:ring-1 focus-within:ring-ring">
              <span className="pl-3 text-sm text-slate-500">
                {typeof window !== "undefined" ? window.location.host : ""}/
              </span>
              <Input
                value={slug}
                maxLength={30}
                className="border-0 pl-0.5 shadow-none focus-visible:ring-0"
                onChange={(event) =>
                  setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                }
              />
            </div>
          </label>

          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-medium">Redes sociais</legend>
            {REDES_SOCIAIS.map((rede) => (
              <label
                key={rede}
                className="grid grid-cols-[6.5rem_1fr] items-center gap-2 text-sm text-slate-400"
              >
                {rotulosRede[rede]}
                <Input
                  type="url"
                  value={redes[rede] ?? ""}
                  placeholder="https://…"
                  onChange={(event) =>
                    setRedes((atual) => ({ ...atual, [rede]: event.target.value }))
                  }
                />
              </label>
            ))}
          </fieldset>

          {erro && (
            <p role="alert" className="text-sm text-red-400">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="gradient" disabled={atualizar.isPending || enviando}>
              {atualizar.isPending ? "Salvando…" : "Salvar perfil"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
