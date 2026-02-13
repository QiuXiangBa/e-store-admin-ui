import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Checkbox,
  Typography
} from '@mui/material';
import {
  createSpu,
  getBrandSimpleList,
  getCategoryList,
  getSpuDetail,
  type BrandResp,
  type CategoryResp,
  type SkuResp,
  type SpuSaveReq,
  updateSpu
} from '../../api/admin';

const createDefaultSku = (): SkuResp => ({
  properties: '',
  price: 0,
  marketPrice: 0,
  costPrice: 0,
  barCode: '',
  picUrl: '',
  stock: 0,
  weight: 0,
  volume: 0,
  subCommissionFirstPrice: 0,
  subCommissionSecondPrice: 0
});

const createDefaultForm = (): SpuSaveReq => ({
  name: '',
  keyword: '',
  introduction: '',
  description: '',
  barCode: '',
  categoryId: 0,
  brandId: 0,
  picUrl: '',
  sliderPicUrls: '',
  videoUrl: '',
  sort: 0,
  specType: false,
  deliveryTemplateId: 0,
  recommendHot: false,
  recommendBenefit: false,
  recommendBest: false,
  recommendNew: false,
  recommendGood: false,
  giveIntegral: 0,
  giveCouponTemplateIds: '',
  subCommissionType: false,
  activityOrders: '',
  skus: [createDefaultSku()]
});

type FormTab = 'info' | 'sku' | 'delivery' | 'description' | 'other';

export function SpuFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const spuId = id ? Number(id) : 0;
  const isEdit = window.location.pathname.endsWith('/edit');
  const isDetail = Boolean(spuId) && !isEdit;

  const [brands, setBrands] = useState<BrandResp[]>([]);
  const [categories, setCategories] = useState<CategoryResp[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FormTab>('info');
  const [form, setForm] = useState<SpuSaveReq>(createDefaultForm());
  const [errorMessage, setErrorMessage] = useState('');

  const readonly = isDetail;

  const pageTitle = useMemo(() => {
    if (!spuId) return '新增商品';
    return isDetail ? `商品详情 #${spuId}` : `编辑商品 #${spuId}`;
  }, [isDetail, spuId]);

  async function loadMeta() {
    const [brandList, categoryList] = await Promise.all([getBrandSimpleList(), getCategoryList()]);
    setBrands(brandList);
    setCategories(categoryList);
  }

  async function loadDetail(targetId: number) {
    const detail = await getSpuDetail(targetId);
    setForm({
      id: detail.id,
      name: detail.name,
      keyword: detail.keyword,
      introduction: detail.introduction,
      description: detail.description,
      barCode: detail.barCode || '',
      categoryId: detail.categoryId,
      brandId: detail.brandId,
      picUrl: detail.picUrl,
      sliderPicUrls: detail.sliderPicUrls || '',
      videoUrl: detail.videoUrl || '',
      sort: detail.sort,
      specType: detail.specType,
      deliveryTemplateId: detail.deliveryTemplateId || 0,
      recommendHot: Boolean(detail.recommendHot),
      recommendBenefit: Boolean(detail.recommendBenefit),
      recommendBest: Boolean(detail.recommendBest),
      recommendNew: Boolean(detail.recommendNew),
      recommendGood: Boolean(detail.recommendGood),
      giveIntegral: detail.giveIntegral || 0,
      giveCouponTemplateIds: detail.giveCouponTemplateIds || '',
      subCommissionType: Boolean(detail.subCommissionType),
      activityOrders: detail.activityOrders || '',
      skus: detail.skus.length ? detail.skus : [createDefaultSku()]
    });
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMeta(), spuId ? loadDetail(spuId) : Promise.resolve()])
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [spuId]);

  function patchSku(index: number, key: keyof SkuResp, value: number | string) {
    setForm((prev) => {
      const skus = [...prev.skus];
      skus[index] = { ...skus[index], [key]: value };
      return { ...prev, skus };
    });
  }

  async function submit() {
    if (readonly) {
      navigate('/product/spu');
      return;
    }
    if (!form.name || !form.keyword || !form.introduction || !form.description || !form.picUrl) {
      setErrorMessage('请完善基础设置');
      setActiveTab('info');
      return;
    }
    if (!form.categoryId || !form.brandId) {
      setErrorMessage('请选择分类和品牌');
      setActiveTab('info');
      return;
    }
    if (!form.skus.length) {
      setErrorMessage('请至少配置一条 SKU');
      setActiveTab('sku');
      return;
    }
    if (form.skus.some((item) => !item.picUrl)) {
      setErrorMessage('SKU 图片不能为空');
      setActiveTab('sku');
      return;
    }

    setLoading(true);
    try {
      if (spuId) {
        await updateSpu({ ...form, id: spuId });
      } else {
        await createSpu(form);
      }
      navigate('/product/spu');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">{pageTitle}</Typography>
        <Button variant="outlined" onClick={() => navigate('/product/spu')}>
          返回列表
        </Button>
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {loading ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            加载中...
          </Typography>
        </Stack>
      ) : null}

      <Card>
        <CardContent sx={{ pb: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_, value: FormTab) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab value="info" label="基础设置" />
            <Tab value="sku" label="价格库存" />
            <Tab value="delivery" label="物流设置" />
            <Tab value="description" label="商品详情" />
            <Tab value="other" label="其它设置" />
          </Tabs>
        </CardContent>
      </Card>

      {activeTab === 'info' ? (
        <Card>
          <CardContent>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" label="商品名称*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  disabled={readonly}
                  select
                  fullWidth
                  size="small"
                  label="选择分类*"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                >
                  <MenuItem value={0}>选择分类*</MenuItem>
                  {categories.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  disabled={readonly}
                  select
                  fullWidth
                  size="small"
                  label="选择品牌*"
                  value={form.brandId}
                  onChange={(e) => setForm({ ...form, brandId: Number(e.target.value) })}
                >
                  <MenuItem value={0}>选择品牌*</MenuItem>
                  {brands.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" label="关键字*" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" label="商品简介*" value={form.introduction} onChange={(e) => setForm({ ...form, introduction: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" label="封面图 URL*" value={form.picUrl} onChange={(e) => setForm({ ...form, picUrl: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  disabled={readonly}
                  fullWidth
                  size="small"
                  label="轮播图 URL（逗号分隔）"
                  value={form.sliderPicUrls}
                  onChange={(e) => setForm({ ...form, sliderPicUrls: e.target.value })}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === 'sku' ? (
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} sx={{ mb: 2 }}>
              <FormControlLabel
                control={<Checkbox checked={form.specType} disabled={readonly} onChange={(e) => setForm({ ...form, specType: e.target.checked })} />}
                label="多规格"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.subCommissionType}
                    disabled={readonly}
                    onChange={(e) => setForm({ ...form, subCommissionType: e.target.checked })}
                  />
                }
                label="单独分销设置"
              />
              {!readonly ? (
                <Button variant="outlined" onClick={() => setForm((prev) => ({ ...prev, skus: [...prev.skus, createDefaultSku()] }))}>
                  新增 SKU
                </Button>
              ) : null}
            </Stack>

            <Paper>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>规格JSON</TableCell>
                    <TableCell>价格</TableCell>
                    <TableCell>市场价</TableCell>
                    <TableCell>成本价</TableCell>
                    <TableCell>库存</TableCell>
                    <TableCell>图片</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.skus.map((sku, index) => (
                    <TableRow key={`sku-${index}`}>
                      <TableCell>
                        <TextField
                          disabled={readonly}
                          size="small"
                          fullWidth
                          value={sku.properties || ''}
                          onChange={(e) => patchSku(index, 'properties', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          disabled={readonly}
                          size="small"
                          type="number"
                          value={sku.price}
                          onChange={(e) => patchSku(index, 'price', Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          disabled={readonly}
                          size="small"
                          type="number"
                          value={sku.marketPrice}
                          onChange={(e) => patchSku(index, 'marketPrice', Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          disabled={readonly}
                          size="small"
                          type="number"
                          value={sku.costPrice}
                          onChange={(e) => patchSku(index, 'costPrice', Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          disabled={readonly}
                          size="small"
                          type="number"
                          value={sku.stock}
                          onChange={(e) => patchSku(index, 'stock', Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField disabled={readonly} size="small" fullWidth value={sku.picUrl} onChange={(e) => patchSku(index, 'picUrl', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        {!readonly ? (
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            disabled={form.skus.length === 1}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                skus: prev.skus.filter((_, skuIndex) => skuIndex !== index)
                              }))
                            }
                          >
                            删除
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === 'delivery' ? (
        <Card>
          <CardContent>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  disabled={readonly}
                  fullWidth
                  size="small"
                  type="number"
                  label="运费模板ID"
                  value={form.deliveryTemplateId || 0}
                  onChange={(e) => setForm({ ...form, deliveryTemplateId: Number(e.target.value) })}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === 'description' ? (
        <Card>
          <CardContent>
            <TextField
              disabled={readonly}
              fullWidth
              multiline
              minRows={6}
              label="商品详情*"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === 'other' ? (
        <Card>
          <CardContent>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  disabled={readonly}
                  fullWidth
                  size="small"
                  type="number"
                  label="排序"
                  value={form.sort}
                  onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  disabled={readonly}
                  fullWidth
                  size="small"
                  type="number"
                  label="赠送积分"
                  value={form.giveIntegral || 0}
                  onChange={(e) => setForm({ ...form, giveIntegral: Number(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControlLabel
                  control={<Checkbox checked={Boolean(form.recommendHot)} disabled={readonly} onChange={(e) => setForm({ ...form, recommendHot: e.target.checked })} />}
                  label="热门推荐"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControlLabel
                  control={<Checkbox checked={Boolean(form.recommendNew)} disabled={readonly} onChange={(e) => setForm({ ...form, recommendNew: e.target.checked })} />}
                  label="新品推荐"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : null}

      <Stack direction="row" spacing={1}>
        {!readonly ? (
          <Button onClick={() => void submit()} disabled={loading}>
            保存
          </Button>
        ) : null}
        <Button variant="outlined" onClick={() => navigate('/product/spu')}>
          返回
        </Button>
      </Stack>
    </Stack>
  );
}
