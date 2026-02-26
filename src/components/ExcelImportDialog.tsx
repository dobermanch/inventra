import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { useDropzone } from "react-dropzone";
import { useTheme } from "@mui/material/styles";
import {
  IconFileDownload as FileDownload,
  IconFileImport as FileImport,
} from "@tabler/icons-react";
import { useLanguage } from "../context/LanguageContext";

interface ImportResult {
  created: number;
  errors: { row: number; message: string }[];
}

interface ExcelImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entity: "inventory" | "orders" | "expenses";
  title: string;
}

export default function ExcelImportDialog({
  open,
  onClose,
  onSuccess,
  entity,
  title,
}: ExcelImportDialogProps) {
  const { t } = useLanguage();
  const theme = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onDrop = (accepted: File[]) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setResult(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/import/${entity}`, {
        method: "POST",
        body: formData,
      });
      const data: ImportResult = await res.json();
      setResult(data);
      if (data.created > 0) onSuccess();
    } catch {
      setResult({ created: 0, errors: [{ row: 0, message: "Upload failed" }] });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Button
            component="a"
            href={`/api/export/template/${entity}`}
            download
            variant="outlined"
            size="small"
            startIcon={<FileDownload size={16} />}
          >
            {t("downloadTemplate")}
          </Button>
        </Box>

        <Box
          {...getRootProps()}
          sx={{
            border: "2px dashed",
            borderColor: isDragActive ? "primary.main" : "divider",
            borderRadius: 1,
            p: 3,
            cursor: "pointer",
            bgcolor: isDragActive ? "action.hover" : "transparent",
            transition: "all 0.2s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
          }}
        >
          <input {...getInputProps()} />
          <FileImport
            size={36}
            style={{
              marginBottom: 8,
              color: isDragActive
                ? theme.palette.primary.main
                : theme.palette.action.active,
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {file ? file.name : t("importFile")}
          </Typography>
        </Box>

        {loading && <LinearProgress sx={{ mt: 2 }} />}

        {result && (
          <Box sx={{ mt: 2 }}>
            {result.created > 0 && (
              <Alert severity={result.errors.length > 0 ? "warning" : "success"}>
                {t("importSuccess").replace("{count}", String(result.created))}
              </Alert>
            )}
            {result.errors.length > 0 && (
              <>
                <Alert severity="error" sx={{ mt: 1 }}>
                  {t("importErrors").replace("{count}", String(result.errors.length))}
                </Alert>
                <List dense sx={{ maxHeight: 160, overflow: "auto" }}>
                  {result.errors.map((e, i) => (
                    <ListItem key={i} disablePadding>
                      <ListItemText
                        primary={`Row ${e.row}: ${e.message}`}
                        primaryTypographyProps={{ variant: "caption", color: "error" }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t("cancel")}</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!file || loading}
          startIcon={<FileImport size={16} />}
        >
          {loading ? t("importing") : t("import")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
