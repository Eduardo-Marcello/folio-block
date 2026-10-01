import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Bloco, Perfil } from "./folio-types";

const BUCKET = "folio";

export const chaves = {
  perfil: (slug: string) => ["perfil", slug] as const,
  meuPerfil: (usuarioId: string) => ["meu-perfil", usuarioId] as const,
  blocos: (perfilId: number) => ["blocos", perfilId] as const,
};

// Colunas explícitas: nunca trafegamos mais do que a tela precisa.
const COLUNAS_PERFIL =
  "id, usuario_id, slug, nome_completo, bio, avatar_url, configuracao_tema, created_at";
const COLUNAS_BLOCO =
  "id, perfil_id, tipo, titulo, conteudo, colunas, linhas, ordem, visivel, created_at";

// --- Leitura ----------------------------------------------------------------

export function usePerfilPorSlug(slug: string) {
  return useQuery({
    queryKey: chaves.perfil(slug),
    queryFn: async (): Promise<Perfil | null> => {
      const { data, error } = await supabase
        .from("perfis")
        .select(COLUNAS_PERFIL)
        .eq("slug", slug.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useBlocos(perfilId: number | undefined) {
  return useQuery({
    queryKey: chaves.blocos(perfilId ?? 0),
    enabled: perfilId !== undefined,
    queryFn: async (): Promise<Bloco[]> => {
      // A RLS decide o que volta: visitantes recebem só blocos visíveis, o dono recebe também os rascunhos.
      const { data, error } = await supabase
        .from("blocos")
        .select(COLUNAS_BLOCO)
        .eq("perfil_id", perfilId!)
        .order("ordem")
        .order("id");
      if (error) throw error;
      return data;
    },
  });
}

export async function buscarMeuPerfil(usuarioId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from("perfis")
    .select(COLUNAS_PERFIL)
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// --- Storage ----------------------------------------------------------------

/** `avatar_url`/`caminho` guardam o caminho no Storage; URLs absolutas (ex.: foto do Google) passam direto. */
export function urlPublica(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  if (/^https:\/\//i.test(caminho)) return caminho;
  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

export async function enviarImagem(arquivo: File): Promise<string> {
  // Validação de UX; o bucket também restringe tipo e tamanho no servidor.
  if (!TIPOS_IMAGEM.includes(arquivo.type))
    throw new Error("Envie uma imagem PNG, JPG, WEBP ou GIF");
  if (arquivo.size > TAMANHO_MAXIMO) throw new Error("A imagem deve ter no máximo 5 MB");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sua sessão expirou. Entre novamente.");
  const extensao = arquivo.type.split("/")[1] === "jpeg" ? "jpg" : arquivo.type.split("/")[1];
  const caminho = `${auth.user.id}/${crypto.randomUUID()}.${extensao}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, { contentType: arquivo.type, cacheControl: "31536000" });
  if (error) throw new Error("Não foi possível enviar a imagem");
  return caminho;
}

// --- Mutações de blocos -----------------------------------------------------

type NovoBloco = Omit<TablesInsert<"blocos">, "ordem">;

export function useCriarBloco(perfilId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bloco: NovoBloco) => {
      const atuais = queryClient.getQueryData<Bloco[]>(chaves.blocos(perfilId)) ?? [];
      const ordem = atuais.reduce((max, item) => Math.max(max, item.ordem), -1) + 1;
      const { data, error } = await supabase
        .from("blocos")
        .insert({ ...bloco, perfil_id: perfilId, ordem })
        .select(COLUNAS_BLOCO)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (novo) => {
      queryClient.setQueryData<Bloco[]>(chaves.blocos(perfilId), (atual = []) => [...atual, novo]);
      toast.success("Bloco adicionado");
    },
    onError: () => toast.error("Não foi possível adicionar o bloco"),
  });
}

export function useAtualizarBloco(perfilId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id: number; dados: TablesUpdate<"blocos"> }) => {
      const { data, error } = await supabase
        .from("blocos")
        .update(dados)
        .eq("id", id)
        .select(COLUNAS_BLOCO)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (salvo) => {
      queryClient.setQueryData<Bloco[]>(chaves.blocos(perfilId), (atual = []) =>
        atual.map((item) => (item.id === salvo.id ? salvo : item)),
      );
    },
    onError: () => toast.error("Não foi possível salvar o bloco"),
  });
}

export function useExcluirBloco(perfilId: number) {
  const queryClient = useQueryClient();
  const chave = chaves.blocos(perfilId);
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("blocos").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: chave });
      const anterior = queryClient.getQueryData<Bloco[]>(chave);
      queryClient.setQueryData<Bloco[]>(chave, (atual = []) =>
        atual.filter((item) => item.id !== id),
      );
      return { anterior };
    },
    onError: (_erro, _id, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(chave, contexto.anterior);
      toast.error("Não foi possível excluir o bloco");
    },
    onSuccess: () => toast.success("Bloco removido"),
  });
}

/** Reordenação com Optimistic Update: a grid muda na hora e só volta atrás se o banco recusar. */
export function useReordenarBlocos(perfilId: number) {
  const queryClient = useQueryClient();
  const chave = chaves.blocos(perfilId);
  return useMutation({
    mutationFn: async (ordenados: Bloco[]) => {
      const { error } = await supabase.rpc("reordenar_blocos", {
        p_perfil_id: perfilId,
        p_ids: ordenados.map((item) => item.id),
      });
      if (error) throw error;
    },
    onMutate: async (ordenados) => {
      await queryClient.cancelQueries({ queryKey: chave });
      const anterior = queryClient.getQueryData<Bloco[]>(chave);
      queryClient.setQueryData<Bloco[]>(
        chave,
        ordenados.map((item, indice) => ({ ...item, ordem: indice })),
      );
      return { anterior };
    },
    onError: (_erro, _ordenados, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(chave, contexto.anterior);
      toast.error("Não foi possível salvar a nova ordem");
    },
  });
}

// --- Perfil -----------------------------------------------------------------

export function useAtualizarPerfil(perfil: Perfil) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: TablesUpdate<"perfis"> & { configuracao_tema?: Json }) => {
      const { data, error } = await supabase
        .from("perfis")
        .update(dados)
        .eq("id", perfil.id)
        .select(COLUNAS_PERFIL)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (salvo) => {
      queryClient.setQueryData(chaves.perfil(salvo.slug), salvo);
      if (salvo.slug !== perfil.slug)
        queryClient.removeQueries({ queryKey: chaves.perfil(perfil.slug) });
      queryClient.setQueryData(chaves.meuPerfil(salvo.usuario_id), salvo);
    },
  });
}

/** Erro de UNIQUE do Postgres (slug já usado, e-mail já inscrito). */
export function ehErroDuplicado(erro: unknown) {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    (erro as { code: string }).code === "23505"
  );
}

// --- Leads ------------------------------------------------------------------

export async function inscreverLead(perfilId: number, email: string) {
  // Sem `.select()`: o visitante não tem permissão de leitura em leads (só o dono).
  const { error } = await supabase.from("leads").insert({ perfil_id: perfilId, email });
  if (error) throw error;
}
