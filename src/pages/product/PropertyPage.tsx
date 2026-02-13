import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { createProperty, deleteProperty, getPropertyPage, type PropertyResp, updateProperty } from '../../api/admin';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';

const EMPTY_FORM = {
  name: '',
  status: 0,
  remark: ''
};

export function PropertyPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<PropertyResp[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  async function loadData() {
    try {
      const page = await getPropertyPage(pageNum, pageSize, { name: name || undefined });
      setList(page.list || []);
      setTotal(page.total || 0);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  useEffect(() => {
    void loadData();
  }, [pageNum, pageSize]);

  function openCreateDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEditDialog(item: PropertyResp) {
    setEditingId(item.id);
    setForm({ name: item.name, status: item.status, remark: item.remark || '' });
    setFormOpen(true);
  }

  async function submit() {
    if (!form.name) {
      setErrorMessage('规格名称不能为空');
      return;
    }
    try {
      if (editingId) {
        await updateProperty({ ...form, id: editingId });
      } else {
        await createProperty(form);
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteProperty(id);
      setDeleteTargetId(null);
      await loadData();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">商品规格</Typography>
        <Button onClick={openCreateDialog}>新增</Button>
      </Stack>
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField label="规格名称" size="small" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={() => void loadData()}>搜索</Button>
            <Button variant="outlined" onClick={() => { setName(''); setPageNum(1); void loadData(); }}>
              重置
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>备注</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={6}>暂无数据</TableCell></TableRow>
            ) : (
              list.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.status === 0 ? '启用' : '禁用'} color={item.status === 0 ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>{item.remark || '-'}</TableCell>
                  <TableCell>{item.createTime ? new Date(item.createTime).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={() => openEditDialog(item)}>编辑</Button>
                      <Button size="small" variant="outlined" onClick={() => navigate(`/product/property-values?propertyId=${item.id}`)}>属性值</Button>
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

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? `编辑规格 #${editingId}` : '新增规格'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField fullWidth size="small" label="规格名称*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField select fullWidth size="small" label="状态" value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
              <MenuItem value={0}>启用</MenuItem>
              <MenuItem value={1}>禁用</MenuItem>
            </TextField>
            <TextField fullWidth size="small" label="备注" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setFormOpen(false)}>取消</Button>
          <Button onClick={() => void submit()}>{editingId ? '保存修改' : '新增规格'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="确认删除规格"
        description={deleteTargetId === null ? '' : `确认删除规格 #${deleteTargetId} 吗？`}
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
