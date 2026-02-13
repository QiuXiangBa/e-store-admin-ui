import { Pagination as MuiPagination, MenuItem, Select, Stack, Typography } from '@mui/material';

interface PaginationProps {
  pageNum: number;
  pageSize: number;
  total: number;
  onChange: (pageNum: number, pageSize: number) => void;
}

export function Pagination({ pageNum, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      sx={{ mt: 2 }}
    >
      <Typography variant="body2" color="text.secondary">
        共 {total} 条，{pageNum}/{totalPages} 页
      </Typography>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <MuiPagination
          page={pageNum}
          count={totalPages}
          color="primary"
          size="small"
          onChange={(_, nextPage) => onChange(nextPage, pageSize)}
        />
        <Select size="small" value={pageSize} onChange={(e) => onChange(1, Number(e.target.value))}>
          <MenuItem value={10}>10 / 页</MenuItem>
          <MenuItem value={20}>20 / 页</MenuItem>
          <MenuItem value={50}>50 / 页</MenuItem>
        </Select>
      </Stack>
    </Stack>
  );
}
