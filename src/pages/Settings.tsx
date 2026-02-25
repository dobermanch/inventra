import React from "react";
import {
  Typography,
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
} from "@mui/material";
import { useLanguage } from "../context/LanguageContext";
import { Language } from "../translations";
import { useCurrency, Currency } from "../context/CurrencyContext";

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency } = useCurrency();

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 4 }}>
        {t("settings")}
      </Typography>

      <Paper sx={{ p: 4, maxWidth: 600 }}>
        <Stack spacing={4}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {t("language")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("chooseLanguageDescription")}
            </Typography>
            <FormControl fullWidth>
              <InputLabel>{t("language")}</InputLabel>
              <Select
                value={language}
                label={t("language")}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                <MenuItem value="en">{t("english")}</MenuItem>
                <MenuItem value="ua">{t("ukrainian")}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" gutterBottom>
              {t("currency")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("defaultCurrencyDescription")}
            </Typography>
            <FormControl fullWidth>
              <InputLabel>{t("currency")}</InputLabel>
              <Select
                value={currency}
                label={t("currency")}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                <MenuItem value="USD">USD ($)</MenuItem>
                <MenuItem value="UAH">UAH (₴)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
