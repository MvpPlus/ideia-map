export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-4 sm:place-items-center">
      <div className="card max-h-[90vh] w-full max-w-md overflow-y-auto bg-paper/90 p-5 backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <h3 className="display text-2xl">{title}</h3>
          <button type="button" onClick={onClose} className="min-h-11 text-sm text-mute">
            Fechar
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
