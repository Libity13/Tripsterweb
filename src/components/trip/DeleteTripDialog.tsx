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
import { Trash2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface DeleteTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tripTitle: string;
  isDeleting?: boolean;
}

export function DeleteTripDialog({
  isOpen,
  onClose,
  onConfirm,
  tripTitle,
  isDeleting = false,
}: DeleteTripDialogProps) {
  const { t } = useLanguage();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle>{t('trip.deleteConfirm.title')}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            <span className="block mb-2">
              {t('trip.deleteConfirm.message').replace('{name}', tripTitle)}
            </span>
            <span className="text-red-600 font-medium">
              ⚠️ {t('trip.deleteConfirm.warning')}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {t('trip.deleting')}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('trip.deleteConfirm.button')}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteTripDialog;

