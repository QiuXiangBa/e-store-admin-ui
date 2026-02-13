import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
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
  createBrand,
  deleteBrand,
  getBrandPage,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  type BrandResp,
  updateBrand
} from '../../api/admin';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';

const DEFAULT_FORM = {
  name: '',
  picUrl: '',
  sort: 0,
  description: '',
  status: 0
};

export function BrandPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BrandResp[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<number | ''>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const [uploadingPic, setUploadingPic] = useState(false);
  const [picPreviewUrl, setPicPreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const page = await getBrandPage(pageNum, pageSize, {
        name: name || undefined,
        status: status === '' ? undefined : status
      });
      setItems(page.list || []);
      setTotal(page.total || 0);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [pageNum, pageSize]);

  useEffect(() => {
    let active = true;
    async function loadPreview() {
      if (!formOpen || !form.picUrl) {
        setPicPreviewUrl('');
        return;
      }
      try {
        const resp = await getPresignedDownloadUrl({ objectUrl: form.picUrl });
        if (active) {
          setPicPreviewUrl(resp.downloadUrl);
        }
      } catch (_error) {
        if (active) {
          setPicPreviewUrl('');
        }
      }
    }
    void loadPreview();
    return () => {
      active = false;
    };
  }, [formOpen, form.picUrl]);

  function openCreateDialog() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormErrorMessage('');
    setFormOpen(true);
  }

  function openEditDialog(item: BrandResp) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      picUrl: item.picUrl,
      sort: item.sort,
      description: item.description || '',
      status: item.status
    });
    setFormErrorMessage('');
    setFormOpen(true);
  }

  async function onSubmit() {
    if (!form.name || !form.picUrl) {
      setFormErrorMessage('请填写完整必填字段');
      return;
    }
    try {
      if (editingId) {
        await updateBrand({ ...form, id: editingId });
      } else {
        await createBrand(form);
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(DEFAULT_FORM);
      setFormErrorMessage('');
      await loadData();
    } catch (error) {
      setFormErrorMessage((error as Error).message);
    }
  }

  async function handleSelectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    event.target.value = '';
    setUploadingPic(true);
    setFormErrorMessage('');
    try {
      const sign = await getPresignedUploadUrl({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        pathPrefix: 'product/brand'
      });
      await axios.put(sign.uploadUrl, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        }
      });
      setForm((prev) => ({ ...prev, picUrl: sign.objectUrl }));
    } catch (error) {
      setFormErrorMessage(`图片上传失败：${(error as Error).message}`);
    } finally {
      setUploadingPic(false);
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteBrand(id);
      setDeleteTargetId(null);
      await loadData();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  function handleFilterEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return;
    }
    setPageNum(1);
    void loadData();
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">商品品牌</Typography>
        <Button onClick={openCreateDialog}>新增</Button>
      </Stack>
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label="品牌名称"
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleFilterEnter}
            />
            <TextField
              select
              label="状态"
              size="small"
              value={status}
              onChange={(e) => setStatus(e.target.value === '' ? '' : Number(e.target.value))}
              onKeyDown={handleFilterEnter}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="">全部状态</MenuItem>
              <MenuItem value={0}>启用</MenuItem>
              <MenuItem value={1}>禁用</MenuItem>
            </TextField>
            <Button onClick={() => void loadData()}>查询</Button>
            <Button
              variant="outlined"
              onClick={() => {
                setPageNum(1);
                void loadData();
              }}
            >
              刷新
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
              <TableCell>排序</TableCell>
              <TableCell>图片</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>加载中...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>暂无数据</TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.status === 0 ? '启用' : '禁用'}
                      color={item.status === 0 ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{item.sort}</TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Typography noWrap variant="body2">
                      {item.picUrl}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={() => openEditDialog(item)}>
                        编辑
                      </Button>
                      <Button size="small" color="error" variant="outlined" onClick={() => setDeleteTargetId(item.id)}>
                        删除
                      </Button>
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
        <DialogTitle>{editingId ? `编辑品牌 #${editingId}` : '新增品牌'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(event) => void handleSelectFile(event)} />
            {formErrorMessage ? <Alert severity="error">{formErrorMessage}</Alert> : null}
            <TextField label="品牌名称*" size="small" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Stack direction="row" spacing={1}>
              <TextField label="图片 URL*" size="small" fullWidth value={form.picUrl} onChange={(e) => setForm({ ...form, picUrl: e.target.value })} />
              <Button variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={uploadingPic}>
                {uploadingPic ? '上传中...' : '上传图片'}
              </Button>
            </Stack>
            {picPreviewUrl ? (
              <Box
                component="img"
                src={picPreviewUrl}
                alt="品牌图片预览"
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  objectFit: 'cover'
                }}
              />
            ) : null}
            <TextField type="number" label="排序*" size="small" fullWidth value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
            <TextField select label="状态" size="small" fullWidth value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
              <MenuItem value={0}>启用</MenuItem>
              <MenuItem value={1}>禁用</MenuItem>
            </TextField>
            <TextField label="描述" size="small" fullWidth value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => {
              setFormOpen(false);
              setFormErrorMessage('');
            }}
          >
            取消
          </Button>
          <Button onClick={() => void onSubmit()}>{editingId ? '保存修改' : '新增品牌'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="确认删除品牌"
        description={deleteTargetId === null ? '' : `确认删除品牌 #${deleteTargetId} 吗？`}
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
