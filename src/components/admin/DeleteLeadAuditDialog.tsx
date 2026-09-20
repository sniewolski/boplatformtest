import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string | null;
  email: string | null;
  isPending: boolean;
  error?: string | null;
  onConfirm: () => void;
};

export function DeleteLeadAuditDialog({
  open,
  onOpenChange,
  name,
  email,
  isPending,
  error,
  onConfirm,
}: Props) {
  const who = name?.trim() || email || "this person";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this lead audit?</AlertDialogTitle>
          <AlertDialogDescription>
            All answers from {who}
            {name?.trim() && email ? ` (${email})` : ""} will be permanently
            deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-[var(--red)]">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-[var(--red)] text-white hover:bg-[var(--red)]/90"
          >
            {isPending ? "Deleting…" : "Delete permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
