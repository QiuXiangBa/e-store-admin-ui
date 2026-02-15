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
  getCategoryList,
  getCategoryPropertyList,
  createPropertyValue,
  deletePropertyValue,
  getPropertyPage,
  getPropertyValuePage,
  type CategoryPropertyResp,
  type CategoryResp,
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
  remark: '',
  picUrl: ''
};

const PROPERTY_TYPE_SALES = 1;

export function PropertyValuePage() {
  const [searchParams] = useSearchParams();
  const fixedPropertyId = searchParams.get('propertyId') ? Number(searchParams.get('propertyId')) : 0;

  const [properties, setProperties] = useState<PropertyResp[]>([]);
  const [categories, setCategories] = useState<CategoryResp[]>([]);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [categoryPropertyMap, setCategoryPropertyMap] = useState<Record<number, CategoryPropertyResp>>({});
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
      const [page, categoryList] = await Promise.all([getPropertyPage(1, 200, {}), getCategoryList()]);
      setProperties(page.list || []);
      setCategories(categoryList || []);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function loadCategoryPropertyBindings(targetCategoryId: number) {
    try {
      const list = await getCategoryPropertyList(targetCategoryId, PROPERTY_TYPE_SALES);
      const nextMap = list.reduce<Record<number, CategoryPropertyResp>>((accumulator, item) => {
        accumulator[item.propertyId] = item;
        return accumulator;
      }, {});
      setCategoryPropertyMap(nextMap);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setCategoryPropertyMap({});
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
    if (!categoryId) {
      setCategoryPropertyMap({});
      return;
    }
    void loadCategoryPropertyBindings(categoryId);
  }, [categoryId]);

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
      remark: item.remark || '',
      picUrl: item.picUrl || ''
    });
    setFormOpen(true);
  }

  async function submit() {
    const currentPropertyId = fixedPropertyId || form.propertyId;
    if (!currentPropertyId || !form.name) {
      setErrorMessage('请填写规格和规格值名称');
      return;
    }
    const targetBinding = categoryPropertyMap[currentPropertyId];
    const supportValueImage = Boolean(targetBinding?.supportValueImage);
    const valueImageRequired = Boolean(targetBinding?.valueImageRequired);
    if (valueImageRequired && !form.picUrl?.trim()) {
      setErrorMessage('当前类目设置了规格值图片必填，请补充图片 URL');
      return;
    }
    try {
      const payload = supportValueImage
        ? { ...form, propertyId: currentPropertyId }
        : { ...form, propertyId: currentPropertyId, picUrl: '' };
      if (editingId) {
        await updatePropertyValue({ ...payload, id: editingId });
      } else {
        await createPropertyValue(payload);
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
              label="分类（用于判定配图能力）"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">未选择分类</MenuItem>
              {categories.map((item) => (
                <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
              ))}
            </TextField>
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
              <TableCell>图片</TableCell>
              <TableCell>备注</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={8}>暂无数据</TableCell></TableRow>
            ) : (
              list.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{propertyMap.get(item.propertyId) || item.propertyId}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.status === 0 ? '启用' : '禁用'} color={item.status === 0 ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {item.picUrl || '-'}
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
            {(categoryPropertyMap[fixedPropertyId || form.propertyId]?.supportValueImage ?? false) ? (
              <TextField
                fullWidth
                size="small"
                label={`图片 URL${categoryPropertyMap[fixedPropertyId || form.propertyId]?.valueImageRequired ? '*' : ''}`}
                value={form.picUrl}
                onChange={(e) => setForm({ ...form, picUrl: e.target.value })}
                helperText={categoryPropertyMap[fixedPropertyId || form.propertyId]?.valueImageRequired ? '当前类目要求规格值图片必填' : '仅支持配图的销售属性可填写'}
              />
            ) : null}
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
