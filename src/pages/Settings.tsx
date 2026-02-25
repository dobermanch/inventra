import React from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Stack,
  Divider
} from '@mui/material';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../translations';

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 4 }}>
        {t('settings')}
      </Typography>

      <Paper sx={{ p: 4, maxWidth: 600 }}>
        <Stack spacing={4}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('language')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose your preferred language for the interface.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>{t('language')}</InputLabel>
              <Select
                value={language}
                label={t('language')}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                <MenuItem value="en">{t('english')}</MenuItem>
                <MenuItem value="ua">{t('ukrainian')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" gutterBottom>
              {t('currency')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Default currency for sales and expenses.
            </Typography>
            <FormControl fullWidth disabled>
              <InputLabel>{t('currency')}</InputLabel>
              <Select
                value="USD"
                label={t('currency')}
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
