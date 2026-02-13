import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
  createCategory,
  deleteCategory,
  getCategoryList,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  type CategoryResp,
  updateCategory
} from '../../api/admin';
import { ConfirmDialog } from '../../components/ConfirmDialog';

const EMPTY_FORM = {
  parentId: 0,
  name: '',
  picUrl: '',
  bigPicUrl: '',
  sort: 0,
  status: 0
};

type TreeNode = CategoryResp & { children: TreeNode[] };

function buildTree(list: CategoryResp[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  list.forEach((item) => map.set(item.id, { ...item, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parentId === 0) {
      roots.push(node);
      return;
    }
    const parent = map.get(node.parentId);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function flattenTree(nodes: TreeNode[], level = 0): Array<TreeNode & { level: number }> {
  return nodes.flatMap((node) => [{ ...node, level }, ...flattenTree(node.children || [], level + 1)]);
}

export function CategoryPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<CategoryResp[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState('');
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadingBigPic, setUploadingBigPic] = useState(false);
  const [picPreviewUrl, setPicPreviewUrl] = useState('');
  const [bigPicPreviewUrl, setBigPicPreviewUrl] = useState('');
  const [uploadTarget, setUploadTarget] = useState<'picUrl' | 'bigPicUrl'>('picUrl');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const rootOptions = useMemo(() => list.filter((item) => item.parentId === 0), [list]);
  const rows = useMemo(() => flattenTree(buildTree(list)), [list]);

  async function loadData() {
    try {
      const resp = await getCategoryList({ name: name || undefined });
      setList(resp);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

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

  useEffect(() => {
    let active = true;
    async function loadPreview() {
      if (!formOpen || !form.bigPicUrl) {
        setBigPicPreviewUrl('');
        return;
      }
      try {
        const resp = await getPresignedDownloadUrl({ objectUrl: form.bigPicUrl });
        if (active) {
          setBigPicPreviewUrl(resp.downloadUrl);
        }
      } catch (_error) {
        if (active) {
          setBigPicPreviewUrl('');
        }
      }
    }
    void loadPreview();
    return () => {
      active = false;
    };
  }, [formOpen, form.bigPicUrl]);

  function openCreateDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrorMessage('');
    setFormOpen(true);
  }

  function openEditDialog(item: CategoryResp) {
    setEditingId(item.id);
    setForm({
      parentId: item.parentId,
      name: item.name,
      picUrl: item.picUrl,
      bigPicUrl: item.bigPicUrl || '',
      sort: item.sort,
      status: item.status
    });
    setFormErrorMessage('');
    setFormOpen(true);
  }

  async function submit() {
    if (!form.name || !form.picUrl) {
      setFormErrorMessage('请填写完整必填字段');
      return;
    }
    try {
      if (editingId) {
        await updateCategory({ ...form, id: editingId });
      } else {
        await createCategory(form);
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setFormErrorMessage('');
      await loadData();
    } catch (error) {
      setFormErrorMessage((error as Error).message);
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteCategory(id);
      setDeleteTargetId(null);
      await loadData();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function handleSelectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    event.target.value = '';
    const isPic = uploadTarget === 'picUrl';
    isPic ? setUploadingPic(true) : setUploadingBigPic(true);
    setFormErrorMessage('');
    try {
      const sign = await getPresignedUploadUrl({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        pathPrefix: 'product/category'
      });
      await axios.put(sign.uploadUrl, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        }
      });
      setForm((prev) => ({ ...prev, [uploadTarget]: sign.objectUrl }));
    } catch (error) {
      setFormErrorMessage(`图片上传失败：${(error as Error).message}`);
    } finally {
      isPic ? setUploadingPic(false) : setUploadingBigPic(false);
    }
  }

  function triggerUpload(target: 'picUrl' | 'bigPicUrl') {
    setUploadTarget(target);
    fileInputRef.current?.click();
  }

  function handleNameFilterKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setName('');
      void loadData();
      return;
    }
    if (event.key !== 'Enter') {
      return;
    }
    void loadData();
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">商品分类</Typography>
        <Button onClick={openCreateDialog}>新增</Button>
      </Stack>
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label="分类名称"
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleNameFilterKeyDown}
            />
            <Button onClick={() => void loadData()}>搜索</Button>
            <Button variant="outlined" onClick={() => { setName(''); void loadData(); }}>
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
              <TableCell>层级</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>排序</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>暂无数据</TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{`${'  '.repeat(item.level)}${item.level > 0 ? '└ ' : ''}${item.name}`}</TableCell>
                  <TableCell>{item.level + 1}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.status === 0 ? '启用' : '禁用'} color={item.status === 0 ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>{item.sort}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={() => openEditDialog(item)}>
                        编辑
                      </Button>
                      {item.parentId > 0 ? (
                        <Button size="small" variant="outlined" onClick={() => navigate(`/product/spu?categoryId=${item.id}`)}>
                          查看商品
                        </Button>
                      ) : null}
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

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? `编辑分类 #${editingId}` : '新增分类'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(event) => void handleSelectFile(event)} />
            {formErrorMessage ? <Alert severity="error">{formErrorMessage}</Alert> : null}
            <TextField select fullWidth size="small" label="父级分类" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: Number(e.target.value) })}>
              <MenuItem value={0}>顶级分类</MenuItem>
              {rootOptions.map((item) => (
                <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth size="small" label="分类名称*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Stack direction="row" spacing={1}>
              <TextField fullWidth size="small" label="分类图片 URL*" value={form.picUrl} onChange={(e) => setForm({ ...form, picUrl: e.target.value })} />
              <Button variant="outlined" onClick={() => triggerUpload('picUrl')} disabled={uploadingPic}>
                {uploadingPic ? '上传中...' : '上传图片'}
              </Button>
            </Stack>
            {picPreviewUrl ? (
              <Box
                component="img"
                src={picPreviewUrl}
                alt="分类图片预览"
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
            <Stack direction="row" spacing={1}>
              <TextField fullWidth size="small" label="大图 URL" value={form.bigPicUrl} onChange={(e) => setForm({ ...form, bigPicUrl: e.target.value })} />
              <Button variant="outlined" onClick={() => triggerUpload('bigPicUrl')} disabled={uploadingBigPic}>
                {uploadingBigPic ? '上传中...' : '上传大图'}
              </Button>
            </Stack>
            {bigPicPreviewUrl ? (
              <Box
                component="img"
                src={bigPicPreviewUrl}
                alt="大图预览"
                sx={{
                  width: 160,
                  height: 90,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  objectFit: 'cover'
                }}
              />
            ) : null}
            <TextField fullWidth size="small" type="number" label="排序*" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
            <TextField select fullWidth size="small" label="状态" value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
              <MenuItem value={0}>启用</MenuItem>
              <MenuItem value={1}>禁用</MenuItem>
            </TextField>
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
          <Button onClick={() => void submit()}>{editingId ? '保存修改' : '新增分类'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="确认删除分类"
        description={deleteTargetId === null ? '' : `确认删除分类 #${deleteTargetId} 吗？`}
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
