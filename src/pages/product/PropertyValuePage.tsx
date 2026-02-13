import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  createPropertyValue,
  deletePropertyValue,
  getPropertyPage,
  getPropertyValuePage,
  type PropertyResp,
  type PropertyValueResp,
  updatePropertyValue
} from '../../api/admin';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';

const EMPTY_FORM = {
  propertyId: 0,
  name: '',
  status: 0,
  remark: ''
};

export function PropertyValuePage() {
  const [searchParams] = useSearchParams();
  const fixedPropertyId = searchParams.get('propertyId') ? Number(searchParams.get('propertyId')) : 0;

  const [properties, setProperties] = useState<PropertyResp[]>([]);
  const [list, setList] = useState<PropertyValueResp[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [propertyId, setPropertyId] = useState<number | ''>(fixedPropertyId || '');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, propertyId: fixedPropertyId || 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const propertyMap = useMemo(() => new Map(properties.map((item) => [item.id, item.name])), [properties]);

  async function loadProperties() {
    try {
      const page = await getPropertyPage(1, 200, {});
      setProperties(page.list || []);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function loadData() {
    try {
      const page = await getPropertyValuePage(pageNum, pageSize, {
        propertyId: (fixedPropertyId || propertyId) === '' ? undefined : Number(fixedPropertyId || propertyId),
        name: name || undefined
      });
      setList(page.list || []);
      setTotal(page.total || 0);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  useEffect(() => {
    void loadProperties();
  }, []);

  useEffect(() => {
    void loadData();
  }, [pageNum, pageSize]);

  function openCreateDialog() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, propertyId: fixedPropertyId || 0 });
    setFormOpen(true);
  }

  function openEditDialog(item: PropertyValueResp) {
    setEditingId(item.id);
    setForm({
      propertyId: item.propertyId,
      name: item.name,
      status: item.status,
      remark: item.remark || ''
    });
    setFormOpen(true);
  }

  async function submit() {
    const currentPropertyId = fixedPropertyId || form.propertyId;
    if (!currentPropertyId || !form.name) {
      setErrorMessage('请填写规格和规格值名称');
      return;
    }
    try {
      if (editingId) {
        await updatePropertyValue({ ...form, propertyId: currentPropertyId, id: editingId });
      } else {
        await createPropertyValue({ ...form, propertyId: currentPropertyId });
      }
      setFormOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM, propertyId: fixedPropertyId || 0 });
      await loadData();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function onDelete(id: number) {
    try {
      await deletePropertyValue(id);
      setDeleteTargetId(null);
      await loadData();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">规格值管理</Typography>
        <Button onClick={openCreateDialog}>新增</Button>
      </Stack>
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              select
              size="small"
              label="规格"
              value={fixedPropertyId || propertyId}
              onChange={(e) => setPropertyId(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={fixedPropertyId > 0}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">全部规格</MenuItem>
              {properties.map((item) => (
                <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
              ))}
            </TextField>
            <TextField label="规格值名称" size="small" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={() => void loadData()}>搜索</Button>
          </Stack>
        </CardContent>
      </Card>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>规格</TableCell>
              <TableCell>值名称</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>备注</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={7}>暂无数据</TableCell></TableRow>
            ) : (
              list.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{propertyMap.get(item.propertyId) || item.propertyId}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.status === 0 ? '启用' : '禁用'} color={item.status === 0 ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>{item.remark || '-'}</TableCell>
                  <TableCell>{item.createTime ? new Date(item.createTime).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={() => openEditDialog(item)}>编辑</Button>
                      <Button size="small" color="error" variant="outlined" onClick={() => setDeleteTargetId(item.id)}>删除</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Pagination
        pageNum={pageNum}
        pageSize={pageSize}
        total={total}
        onChange={(nextPageNum, nextPageSize) => {
          setPageNum(nextPageNum);
          setPageSize(nextPageSize);
        }}
      />

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? `编辑规格值 #${editingId}` : '新增规格值'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="规格*"
              value={fixedPropertyId || form.propertyId}
              onChange={(e) => setForm({ ...form, propertyId: Number(e.target.value) })}
              disabled={fixedPropertyId > 0}
            >
              <MenuItem value={0}>选择规格*</MenuItem>
              {properties.map((item) => (
                <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth size="small" label="规格值名称*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField select fullWidth size="small" label="状态" value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
              <MenuItem value={0}>启用</MenuItem>
              <MenuItem value={1}>禁用</MenuItem>
            </TextField>
            <TextField fullWidth size="small" label="备注" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setFormOpen(false)}>取消</Button>
          <Button onClick={() => void submit()}>{editingId ? '保存修改' : '新增规格值'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="确认删除规格值"
        description={deleteTargetId === null ? '' : `确认删除规格值 #${deleteTargetId} 吗？`}
        confirmText="删除"
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId !== null) {
            void onDelete(deleteTargetId);
          }
        }}
      />
    </Stack>
  );
}
