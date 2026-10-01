import { lazy, Suspense, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAtualizarBloco, useBlocos, useExcluirBloco, useReordenarBlocos } from "@/lib/folio-api";
import type { Bloco, Perfil } from "@/lib/folio-types";
import { BlocoView, blocoRenderizavel } from "./bloco-view";

// Code splitting: formulários de edição só são baixados por quem entra no modo de edição.
const BlocoDialog = lazy(() => import("./bloco-dialog"));
const PerfilDialog = lazy(() => import("./perfil-dialog"));

// Classes literais para o Tailwind detectar. Mobile = 1 coluna; tablet = 2; desktop = 4.
const classeColunas: Record<number, string> = {
  1: "",
  2: "md:col-span-2",
  3: "md:col-span-2 lg:col-span-3",
  4: "md:col-span-2 lg:col-span-4",
};
const classeLinhas: Record<number, string> = { 1: "", 2: "row-span-2" };

type Props = { perfil: Perfil; podeEditar: boolean };

export function FolioGrid({ perfil, podeEditar }: Props) {
  const { data: blocos = [], isLoading } = useBlocos(perfil.id);
  const reordenar = useReordenarBlocos(perfil.id);
  const excluir = useExcluirBloco(perfil.id);
  const atualizar = useAtualizarBloco(perfil.id);

  const [editando, setEditando] = useState(false);
  const [dialogBloco, setDialogBloco] = useState<{ bloco?: Bloco | undefined } | null>(null);
  const [dialogPerfil, setDialogPerfil] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Fora do modo de edição, até o dono vê a página como um visitante.
  const modoEdicao = podeEditar && editando;
  const exibidos = modoEdicao
    ? blocos
    : blocos.filter((bloco) => bloco.visivel && blocoRenderizavel(bloco));

  function mover(de: number, para: number) {
    if (para < 0 || para >= blocos.length || de === para) return;
    reordenar.mutate(arrayMove(blocos, de, para));
  }

  function aoSoltar(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    mover(
      blocos.findIndex((item) => item.id === event.active.id),
      blocos.findIndex((item) => item.id === event.over?.id),
    );
  }

  if (isLoading) return <GridSkeleton />;

  return (
    <>
      {exibidos.length === 0 ? (
        <div className="mx-auto max-w-5xl rounded-3xl border border-dashed border-slate-800 p-10 text-center text-slate-400">
          <LayoutGrid className="mx-auto mb-3 h-8 w-8 text-violet-400" />
          <p>
            {podeEditar
              ? "Sua grid está vazia. Clique em “Editar Grid” para adicionar o primeiro bloco."
              : "Nenhum bloco publicado ainda."}
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
          <SortableContext
            items={exibidos.map((bloco) => bloco.id)}
            strategy={rectSortingStrategy}
            disabled={!modoEdicao}
          >
            <div className="folio-grid">
              {exibidos.map((bloco, indice) => (
                <BlocoCard
                  key={bloco.id}
                  bloco={bloco}
                  editando={modoEdicao}
                  primeiro={indice === 0}
                  ultimo={indice === exibidos.length - 1}
                  onSubir={() => mover(indice, indice - 1)}
                  onDescer={() => mover(indice, indice + 1)}
                  onEditar={() => setDialogBloco({ bloco })}
                  onAlternarVisivel={() =>
                    atualizar.mutate({ id: bloco.id, dados: { visivel: !bloco.visivel } })
                  }
                  onExcluir={() => {
                    if (window.confirm("Excluir este bloco? Essa ação não pode ser desfeita."))
                      excluir.mutate(bloco.id);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Nota: isso é apenas visual. Quem garante que só o dono altera os dados é a RLS no Supabase. */}
      {podeEditar && (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-2 shadow-2xl backdrop-blur-xl">
            {editando ? (
              <>
                <Button
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => setDialogBloco({})}
                >
                  <Plus />
                  Adicionar bloco
                </Button>
                <Button
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => setDialogPerfil(true)}
                >
                  <UserRound />
                  Editar perfil
                </Button>
                <Button
                  variant="gradient"
                  className="rounded-xl"
                  onClick={() => setEditando(false)}
                >
                  <Check />
                  Concluir
                </Button>
              </>
            ) : (
              <Button variant="gradient" className="rounded-xl" onClick={() => setEditando(true)}>
                <Edit3 />
                Editar Grid
              </Button>
            )}
          </div>
        </div>
      )}

      {podeEditar && (
        <Suspense fallback={null}>
          {dialogBloco && (
            <BlocoDialog
              perfilId={perfil.id}
              bloco={dialogBloco.bloco}
              onClose={() => setDialogBloco(null)}
            />
          )}
          {dialogPerfil && <PerfilDialog perfil={perfil} onClose={() => setDialogPerfil(false)} />}
        </Suspense>
      )}
    </>
  );
}

type CardProps = {
  bloco: Bloco;
  editando: boolean;
  primeiro: boolean;
  ultimo: boolean;
  onSubir: () => void;
  onDescer: () => void;
  onEditar: () => void;
  onAlternarVisivel: () => void;
  onExcluir: () => void;
};

function BlocoCard({
  bloco,
  editando,
  primeiro,
  ultimo,
  onSubir,
  onDescer,
  onEditar,
  onAlternarVisivel,
  onExcluir,
}: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bloco.id,
    disabled: !editando,
  });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative min-h-[180px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-md transition-colors hover:border-violet-500/50",
        classeColunas[bloco.colunas] ?? "",
        classeLinhas[bloco.linhas] ?? "",
        editando && "folio-editando border-violet-500/30",
        editando && !bloco.visivel && "opacity-50",
        isDragging && "z-30 opacity-80 shadow-2xl shadow-violet-900/40",
      )}
    >
      {editando && (
        <div className="absolute right-2 top-2 z-30 flex flex-wrap justify-end gap-0.5 rounded-xl border border-slate-700 bg-slate-950/90 p-1 shadow-xl">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Mover para trás"
            onClick={onSubir}
            disabled={primeiro}
          >
            <ArrowUp />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Mover para frente"
            onClick={onDescer}
            disabled={ultimo}
          >
            <ArrowDown />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={bloco.visivel ? "Ocultar bloco" : "Publicar bloco"}
            onClick={onAlternarVisivel}
          >
            {bloco.visivel ? <Eye /> : <EyeOff />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Editar bloco"
            onClick={onEditar}
          >
            <Edit3 />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-400 hover:text-red-300"
            aria-label="Excluir bloco"
            onClick={onExcluir}
          >
            <Trash2 />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 cursor-grab touch-none"
            aria-label="Arrastar bloco"
            {...attributes}
            {...listeners}
          >
            <GripVertical />
          </Button>
        </div>
      )}
      {editando && !bloco.visivel && (
        <span className="absolute left-3 top-3 z-30 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-300">
          Rascunho
        </span>
      )}
      <BlocoView bloco={bloco} editando={editando} />
    </article>
  );
}

function GridSkeleton() {
  return (
    <div className="folio-grid">
      {[2, 1, 1, 2, 1].map((colunas, indice) => (
        <Skeleton
          key={indice}
          className={cn(
            "min-h-[180px] rounded-3xl border border-slate-800 bg-slate-900/40",
            classeColunas[colunas],
          )}
        />
      ))}
    </div>
  );
}
