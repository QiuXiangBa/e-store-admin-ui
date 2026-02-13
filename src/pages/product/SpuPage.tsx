import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardContent,
  Chip,
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
  deleteSpu,
  getBrandSimpleList,
  getCategoryList,
  getSpuCount,
  getSpuPage,
  type BrandResp,
  type CategoryResp,
  type SpuCountResp,
  type SpuResp,
  updateSpuStatus
} from '../../api/admin';
import { getProductSpuStatusLabel, PRODUCT_SPU_STATUS } from '../../constants/productSpu';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';

export function SpuPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryIdFromQuery = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : '';

  const [brands, setBrands] = useState<BrandResp[]>([]);
  const [categories, setCategories] = useState<CategoryResp[]>([]);
  const [counts, setCounts] = useState<SpuCountResp | null>(null);

  const [list, setList] = useState<SpuResp[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<number>(PRODUCT_SPU_STATUS.ENABLE);
  const [categoryId, setCategoryId] = useState<number | ''>(categoryIdFromQuery);
  const [brandId, setBrandId] = useState<number | ''>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);
  const brandMap = useMemo(() => new Map(brands.map((item) => [item.id, item.name])), [brands]);

  async function loadMeta() {
    try {
      const [brandList, categoryList, countResp] = await Promise.all([getBrandSimpleList(), getCategoryList(), getSpuCount()]);
      setBrands(brandList);
      setCategories(categoryList);
      setCounts(countResp);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function loadData() {
    try {
      const page = await getSpuPage(pageNum, pageSize, {
        name: name || undefined,
        status,
        categoryId: categoryId === '' ? undefined : categoryId,
        brandId: brandId === '' ? undefined : brandId
      });
      setList(page.list || []);
      setTotal(page.total || 0);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  useEffect(() => {
    void loadMeta();
  }, []);

  useEffect(() => {
    void loadData();
  }, [pageNum, pageSize, status]);

  async function onDelete(id: number) {
    try {
      await deleteSpu(id);
      setDeleteTargetId(null);
      await Promise.all([loadData(), loadMeta()]);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function onSwitchStatus(id: number, nextStatus: number) {
    try {
      await updateSpuStatus(id, nextStatus);
      await Promise.all([loadData(), loadMeta()]);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">商品 SPU</Typography>
        <Button onClick={() => navigate('/product/spu/new')}>新增</Button>
      </Stack>
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
        <Button variant={status === PRODUCT_SPU_STATUS.ENABLE ? 'contained' : 'outlined'} onClick={() => setStatus(PRODUCT_SPU_STATUS.ENABLE)}>
          出售中({counts?.enableCount ?? 0})
        </Button>
        <Button variant={status === PRODUCT_SPU_STATUS.DISABLE ? 'contained' : 'outlined'} onClick={() => setStatus(PRODUCT_SPU_STATUS.DISABLE)}>
          仓库中({counts?.disableCount ?? 0})
        </Button>
        <Button variant={status === PRODUCT_SPU_STATUS.RECYCLE ? 'contained' : 'outlined'} onClick={() => setStatus(PRODUCT_SPU_STATUS.RECYCLE)}>
          回收站({counts?.recycleCount ?? 0})
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField size="small" label="商品名称" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField
              select
              size="small"
              label="分类"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">全部分类</MenuItem>
              {categories.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="品牌"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">全部品牌</MenuItem>
              {brands.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
            <Button onClick={() => void loadData()}>搜索</Button>
            <Button
              variant="outlined"
              onClick={() => {
                setName('');
                setCategoryId(categoryIdFromQuery);
                setBrandId('');
                setPageNum(1);
                void loadData();
              }}
            >
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
              <TableCell>商品</TableCell>
              <TableCell>分类</TableCell>
              <TableCell>品牌</TableCell>
              <TableCell>价格</TableCell>
              <TableCell>销量</TableCell>
              <TableCell>库存</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10}>暂无数据</TableCell>
              </TableRow>
            ) : (
              list.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar src={item.picUrl} alt={item.name} variant="rounded" sx={{ width: 36, height: 36 }} />
                      <Typography variant="body2">{item.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{categoryMap.get(item.categoryId) || item.categoryId}</TableCell>
                  <TableCell>{brandMap.get(item.brandId) || item.brandId}</TableCell>
                  <TableCell>{item.price}</TableCell>
                  <TableCell>{item.salesCount}</TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={getProductSpuStatusLabel(item.status)}
                      color={item.status === PRODUCT_SPU_STATUS.ENABLE ? 'success' : item.status === PRODUCT_SPU_STATUS.RECYCLE ? 'default' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>{item.createTime ? new Date(item.createTime).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button size="small" variant="outlined" onClick={() => navigate(`/product/spu/${item.id}`)}>
                        详情
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => navigate(`/product/spu/${item.id}/edit`)}>
                        修改
                      </Button>
                      {item.status === PRODUCT_SPU_STATUS.RECYCLE ? (
                        <Button size="small" variant="outlined" onClick={() => void onSwitchStatus(item.id, PRODUCT_SPU_STATUS.DISABLE)}>
                          恢复
                        </Button>
                      ) : (
                        <Button size="small" variant="outlined" onClick={() => void onSwitchStatus(item.id, PRODUCT_SPU_STATUS.RECYCLE)}>
                          回收
                        </Button>
                      )}
                      {item.status >= PRODUCT_SPU_STATUS.ENABLE ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            void onSwitchStatus(
                              item.id,
                              item.status === PRODUCT_SPU_STATUS.ENABLE ? PRODUCT_SPU_STATUS.DISABLE : PRODUCT_SPU_STATUS.ENABLE
                            )
                          }
                        >
                          {item.status === PRODUCT_SPU_STATUS.ENABLE ? '下架' : '上架'}
                        </Button>
                      ) : null}
                      {item.status === PRODUCT_SPU_STATUS.RECYCLE ? (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => setDeleteTargetId(item.id)}
                        >
                          删除
                        </Button>
                      ) : null}
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

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="确认删除商品"
        description={deleteTargetId === null ? '' : `确认删除 SPU #${deleteTargetId} 吗？`}
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
