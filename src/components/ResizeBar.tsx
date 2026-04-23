import { useRef } from "react";

type Props = {
  orientation: "horizontal" | "vertical";
  value: number;
  onChange: (next: number) => void;
  /** Drag direction for growing `value`. "up"/"left" → drag that way increases value. */
  grow?: "up" | "down" | "left" | "right";
};

/**
 * Thin draggable divider. `orientation="horizontal"` is a horizontal bar
 * (spans wide, thin tall) that resizes something vertically — cursor row-resize.
 * `orientation="vertical"` is the opposite.
 *
 * Pointer-capture pattern mirrors RefImagesColumn's drag-to-reorder: on
 * pointerdown capture the pointer, track deltas on move, release on up/cancel.
 * No global listeners needed — captured pointer events fire on this element.
 */
export function ResizeBar({ orientation, value, onChange, grow }: Props) {
  const startRef = useRef<{ axis: number; value: number } | null>(null);
  const horizontal = orientation === "horizontal";
  const growDir = grow ?? (horizontal ? "up" : "right");

  return (
    <div
      role="separator"
      aria-orientation={horizontal ? "horizontal" : "vertical"}
      className={`shrink-0 bg-panel hover:bg-accent transition-colors ${
        horizontal ? "h-[5px] w-full cursor-row-resize" : "w-[5px] h-full cursor-col-resize"
      }`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        startRef.current = {
          axis: horizontal ? e.clientY : e.clientX,
          value,
        };
      }}
      onPointerMove={(e) => {
        const s = startRef.current;
        if (!s) return;
        const current = horizontal ? e.clientY : e.clientX;
        const delta = current - s.axis;
        const signed =
          growDir === "up" || growDir === "left" ? -delta : delta;
        onChange(s.value + signed);
      }}
      onPointerUp={(e) => {
        startRef.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        startRef.current = null;
      }}
    />
  );
}
