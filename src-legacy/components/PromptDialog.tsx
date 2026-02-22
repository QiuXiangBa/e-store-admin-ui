import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';

interface PromptDialogProps {
  open: boolean;
  title: string;
  label: string;
  value: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PromptDialog({
  open,
  title,
  label,
  value,
  confirmText = '确认',
  cancelText = '取消',
  loading = false,
  onChange,
  onCancel,
  onConfirm
}: PromptDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          margin="dense"
          label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading} variant="outlined">
          {cancelText}
        </Button>
        <Button onClick={onConfirm} disabled={loading}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
