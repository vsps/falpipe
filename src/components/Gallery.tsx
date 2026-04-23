import type { GalleryImage } from "../lib/types";
import { GalleryColumn } from "./GalleryColumn";
import { ImageZoomModal } from "./ImageZoomModal";
import { IconBtn } from "./IconBtn";
import { ResizeBar } from "./ResizeBar";
import { useSessionStore } from "../stores/sessionStore";
import { performImageAction, type ImageAction } from "../lib/actions";
import { cmd } from "../lib/tauri";
import { basename } from "../lib/paths";
import { confirmAction, showMessage } from "../lib/dialog";

const VIDEO_EXTS = ["mp4", "webm", "mov", "mkv"];

// Build a minimal GalleryImage for paths that aren't in the scanned columns
// (e.g. a ref image added mid-session before the next rescan).
function syntheticImage(path: string): GalleryImage {
  const filename = basename(path);
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return {
    filename,
    path,
    metadataPath: "",
    isVideo: VIDEO_EXTS.includes(ext),
  };
}

export function Gallery() {
  const session = useSessionStore();
  const {
    columns,
    traceActive,
    thumbColWidth,
    setThumbColWidth,
    zoomImagePath,
    setZoomImage,
  } = session;

  const flatImages = columns.flatMap((c) => c.images);
  const zoomImage = zoomImagePath
    ? flatImages.find((i) => i.path === zoomImagePath) ?? syntheticImage(zoomImagePath)
    : null;

  const onImageAction = (action: ImageAction, path: string) =>
    performImageAction(action, path);

  async function onFolderDelete(version: string) {
    const col = columns.find((c) => c.version === version);
    if (!col || col.isSrc) return;
    const shotPath = session.shotPath;
    if (!shotPath) return;
    const ok = await confirmAction(`Delete version folder ${version} and all its images?`, {
      title: "Delete column",
      kind: "warning",
    });
    if (!ok) return;
    try {
      await cmd.column_delete(`${shotPath}/${version}`);
      await session.rescanShot();
    } catch (e) {
      await showMessage(String(e), { kind: "error" });
    }
  }

  async function onAddNewVersion() {
    try {
      await session.createNextVersion();
    } catch (e) {
      await showMessage(String(e), { kind: "error" });
    }
  }

  return (
    <div className="flex flex-1 min-h-0 gap-[5px] bg-panel">
      {traceActive && (
        <div className="absolute top-[80px] right-2 z-10 bg-warn/90 text-text px-2 py-1 text-xs font-mono">
          tracing · {traceActive.traceSet.size} images ·{" "}
          <button className="underline" onClick={() => session.setTrace(null)}>
            exit (Esc)
          </button>
        </div>
      )}
      <div className="flex flex-1 gap-[5px] overflow-x-auto overflow-y-hidden thin-scroll min-h-0">
        {columns.length === 0 ? (
          <div className="text-sm text-dim p-4">Open a shot to see its versions.</div>
        ) : (
          <>
            {columns.map((c) => (
              <GalleryColumn
                key={c.version}
                column={c}
                width={thumbColWidth}
                onFolderDelete={() => onFolderDelete(c.version)}
                onImageAction={onImageAction}
              />
            ))}
            <ResizeBar
              orientation="vertical"
              value={thumbColWidth}
              onChange={setThumbColWidth}
              grow="right"
            />
          </>
        )}
      </div>
      {session.shotPath && (
        <button
          className="bg-surface px-3 py-2 flex items-center justify-center"
          title="Add new version"
          onClick={onAddNewVersion}
        >
          <IconBtn name="add" size={22} />
        </button>
      )}

      {zoomImage && (
        <ImageZoomModal
          image={zoomImage}
          onClose={() => setZoomImage(null)}
          onAddToRefs={async () => onImageAction("add_to_refs", zoomImage.path)}
          onCopySettings={async () => onImageAction("copy_settings", zoomImage.path)}
          onCopyPrompt={async () => onImageAction("copy_prompt", zoomImage.path)}
          onTrace={async () => onImageAction("trace", zoomImage.path)}
          onDelete={async () => onImageAction("delete", zoomImage.path)}
        />
      )}
    </div>
  );
}

// Side-effect free check the linter insists on.
export type { GalleryImage };
