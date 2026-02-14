import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
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
  createProperty,
  createPropertyValue,
  createSpu,
  getBrandSimpleList,
  getCategoryList,
  getPropertySimpleList,
  getPropertyValueSimpleList,
  getSpuDetail,
  type BrandResp,
  type CategoryResp,
  type PropertyResp,
  type PropertyValueResp,
  type SkuProperty,
  type SkuResp,
  type SpuSaveReq,
  updateSpu
} from '../../api/admin';

const DEFAULT_STATUS_OPEN = 0;
const DELIVERY_TYPE_EXPRESS = 1;
const DELIVERY_TYPE_PICK_UP = 2;
const DELIVERY_TYPE_SAME_CITY = 3;

type PropertyAndValues = {
  id: number;
  name: string;
  values: Array<{ id: number; name: string }>;
};

const createDefaultSku = (): SkuResp => ({
  properties: [],
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
  sliderPicUrls: [],
  videoUrl: '',
  sort: 0,
  specType: false,
  deliveryTypes: [],
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

function fenToYuan(price?: number) {
  // 详情回显：分转元 / Detail display: convert fen to yuan
  return Number(((price ?? 0) / 100).toFixed(2));
}

function yuanToFen(price?: number) {
  // 提交保存：元转分 / Submit payload: convert yuan to fen
  const value = Number(price ?? 0);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100);
}

function buildSkuKey(properties?: SkuProperty[]) {
  if (!properties || properties.length === 0) {
    return '';
  }
  return properties
    .map((item) => item.valueId)
    .sort((left, right) => left - right)
    .join('_');
}

function buildPropertyListFromSkus(skus: SkuResp[]): PropertyAndValues[] {
  const propertyMap = new Map<number, PropertyAndValues>();
  skus.forEach((sku) => {
    (sku.properties ?? []).forEach((property) => {
      const exists = propertyMap.get(property.propertyId);
      if (!exists) {
        propertyMap.set(property.propertyId, {
          id: property.propertyId,
          name: property.propertyName,
          values: [{ id: property.valueId, name: property.valueName }]
        });
        return;
      }
      if (!exists.values.some((value) => value.id === property.valueId)) {
        exists.values.push({ id: property.valueId, name: property.valueName });
      }
    });
  });
  return Array.from(propertyMap.values());
}

function buildSkuCombinations(propertyList: PropertyAndValues[]): SkuProperty[][] {
  if (propertyList.length === 0) {
    return [];
  }
  let combinations: SkuProperty[][] = [[]];
  propertyList.forEach((property) => {
    const next: SkuProperty[][] = [];
    property.values.forEach((value) => {
      combinations.forEach((combination) => {
        next.push([
          ...combination,
          {
            propertyId: property.id,
            propertyName: property.name,
            valueId: value.id,
            valueName: value.name
          }
        ]);
      });
    });
    combinations = next;
  });
  return combinations;
}

function mergeSkusByProperty(prevSkus: SkuResp[], propertyList: PropertyAndValues[]) {
  const prevSkuMap = new Map(prevSkus.map((sku) => [buildSkuKey(sku.properties), sku]));
  const combinations = buildSkuCombinations(propertyList);
  return combinations.map((properties) => {
    const key = buildSkuKey(properties);
    const exists = prevSkuMap.get(key);
    if (exists) {
      return { ...exists, properties };
    }
    return { ...createDefaultSku(), properties };
  });
}

type FormTab = 'info' | 'sku' | 'delivery' | 'description' | 'other';

export function SpuFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const spuId = id ? Number(id) : 0;
  const isEdit = window.location.pathname.endsWith('/edit');
  const isDetail = Boolean(spuId) && !isEdit;
  const readonly = isDetail;

  const [brands, setBrands] = useState<BrandResp[]>([]);
  const [categories, setCategories] = useState<CategoryResp[]>([]);
  const [propertyOptions, setPropertyOptions] = useState<PropertyResp[]>([]);
  const [propertyValueOptions, setPropertyValueOptions] = useState<Record<number, PropertyValueResp[]>>({});
  const [propertyList, setPropertyList] = useState<PropertyAndValues[]>([]);
  const [batchSku, setBatchSku] = useState<SkuResp>(createDefaultSku());

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FormTab>('info');
  const [form, setForm] = useState<SpuSaveReq>(createDefaultForm());
  const [errorMessage, setErrorMessage] = useState('');

  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [propertyInputName, setPropertyInputName] = useState('');
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [valueDialogPropertyIndex, setValueDialogPropertyIndex] = useState<number>(-1);
  const [valueInputName, setValueInputName] = useState('');

  const pageTitle = useMemo(() => {
    if (!spuId) return '新增商品';
    return isDetail ? `商品详情 #${spuId}` : `编辑商品 #${spuId}`;
  }, [isDetail, spuId]);

  async function loadMeta() {
    const [brandList, categoryList, propertyListResp] = await Promise.all([
      getBrandSimpleList(),
      getCategoryList(),
      getPropertySimpleList()
    ]);
    setBrands(brandList);
    setCategories(categoryList);
    setPropertyOptions(propertyListResp);
  }

  async function loadPropertyValueOptions(propertyId: number) {
    if (propertyValueOptions[propertyId]) {
      return propertyValueOptions[propertyId];
    }
    const values = await getPropertyValueSimpleList(propertyId);
    setPropertyValueOptions((prev) => ({ ...prev, [propertyId]: values }));
    return values;
  }

  async function loadDetail(targetId: number) {
    const detail = await getSpuDetail(targetId);
    const detailSkus = (detail.skus.length ? detail.skus : [createDefaultSku()]).map((sku) => ({
      ...sku,
      price: fenToYuan(sku.price),
      marketPrice: fenToYuan(sku.marketPrice),
      costPrice: fenToYuan(sku.costPrice),
      subCommissionFirstPrice: fenToYuan(sku.subCommissionFirstPrice),
      subCommissionSecondPrice: fenToYuan(sku.subCommissionSecondPrice)
    }));
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
      sliderPicUrls: detail.sliderPicUrls || [],
      videoUrl: detail.videoUrl || '',
      sort: detail.sort,
      specType: detail.specType,
      deliveryTypes: detail.deliveryTypes || [],
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
      skus: detailSkus
    });
    setPropertyList(buildPropertyListFromSkus(detailSkus));
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMeta(), spuId ? loadDetail(spuId) : Promise.resolve()])
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [spuId]);

  useEffect(() => {
    if (!form.specType) {
      if (form.skus.length !== 1) {
        setForm((prev) => ({ ...prev, skus: [prev.skus[0] ?? createDefaultSku()] }));
      }
      return;
    }
    if (propertyList.length === 0 || propertyList.some((item) => item.values.length === 0)) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      skus: mergeSkusByProperty(prev.skus, propertyList)
    }));
  }, [form.specType, propertyList]);

  function patchSku(index: number, key: keyof SkuResp, value: number | string) {
    setForm((prev) => {
      const skus = [...prev.skus];
      skus[index] = { ...skus[index], [key]: value };
      return { ...prev, skus };
    });
  }

  function deleteSku(index: number) {
    setForm((prev) => ({ ...prev, skus: prev.skus.filter((_, rowIndex) => rowIndex !== index) }));
  }

  function applyBatchSku() {
    setForm((prev) => ({
      ...prev,
      skus: prev.skus.map((sku) => ({
        ...sku,
        price: batchSku.price,
        marketPrice: batchSku.marketPrice,
        costPrice: batchSku.costPrice,
        barCode: batchSku.barCode,
        picUrl: batchSku.picUrl,
        stock: batchSku.stock,
        weight: batchSku.weight,
        volume: batchSku.volume,
        subCommissionFirstPrice: batchSku.subCommissionFirstPrice,
        subCommissionSecondPrice: batchSku.subCommissionSecondPrice
      }))
    }));
  }

  async function addProperty() {
    const trimmedName = propertyInputName.trim();
    if (!trimmedName) {
      setErrorMessage('属性名称不能为空');
      return;
    }
    if (propertyList.some((item) => item.name === trimmedName)) {
      setErrorMessage('该属性已存在');
      return;
    }
    const exists = propertyOptions.find((item) => item.name === trimmedName);
    if (exists) {
      setPropertyList((prev) => [...prev, { id: exists.id, name: exists.name, values: [] }]);
      setPropertyDialogOpen(false);
      setPropertyInputName('');
      return;
    }
    const created = await createProperty({
      name: trimmedName,
      status: DEFAULT_STATUS_OPEN,
      remark: ''
    });
    const newProperty: PropertyResp = {
      id: created.id,
      name: trimmedName,
      status: DEFAULT_STATUS_OPEN
    };
    setPropertyOptions((prev) => [...prev, newProperty]);
    setPropertyList((prev) => [...prev, { id: newProperty.id, name: newProperty.name, values: [] }]);
    setPropertyDialogOpen(false);
    setPropertyInputName('');
  }

  async function openAddValueDialog(propertyIndex: number) {
    const property = propertyList[propertyIndex];
    if (!property) {
      return;
    }
    await loadPropertyValueOptions(property.id);
    setValueDialogPropertyIndex(propertyIndex);
    setValueDialogOpen(true);
  }

  async function addPropertyValue() {
    const trimmedName = valueInputName.trim();
    const property = propertyList[valueDialogPropertyIndex];
    if (!property) {
      return;
    }
    if (!trimmedName) {
      setErrorMessage('属性值不能为空');
      return;
    }
    if (property.values.some((item) => item.name === trimmedName)) {
      setErrorMessage('该属性值已存在');
      return;
    }

    const options = propertyValueOptions[property.id] ?? (await loadPropertyValueOptions(property.id));
    const exists = options.find((item) => item.name === trimmedName);
    if (exists) {
      setPropertyList((prev) =>
        prev.map((item, index) =>
          index === valueDialogPropertyIndex
            ? { ...item, values: [...item.values, { id: exists.id, name: exists.name }] }
            : item
        )
      );
      setValueDialogOpen(false);
      setValueInputName('');
      return;
    }

    const created = await createPropertyValue({
      propertyId: property.id,
      name: trimmedName,
      status: DEFAULT_STATUS_OPEN,
      remark: ''
    });
    const createdValue: PropertyValueResp = {
      id: created.id,
      propertyId: property.id,
      name: trimmedName,
      status: DEFAULT_STATUS_OPEN
    };
    setPropertyValueOptions((prev) => ({
      ...prev,
      [property.id]: [...(prev[property.id] ?? []), createdValue]
    }));
    setPropertyList((prev) =>
      prev.map((item, index) =>
        index === valueDialogPropertyIndex
          ? { ...item, values: [...item.values, { id: createdValue.id, name: createdValue.name }] }
          : item
      )
    );
    setValueDialogOpen(false);
    setValueInputName('');
  }

  function deleteProperty(index: number) {
    setPropertyList((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  }

  function deletePropertyValue(propertyIndex: number, valueId: number) {
    setPropertyList((prev) =>
      prev.map((item, index) =>
        index === propertyIndex
          ? { ...item, values: item.values.filter((value) => value.id !== valueId) }
          : item
      )
    );
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
    if (!form.deliveryTypes.length) {
      setErrorMessage('请至少选择一种配送方式');
      setActiveTab('delivery');
      return;
    }
    if (form.deliveryTypes.includes(DELIVERY_TYPE_EXPRESS) && !form.deliveryTemplateId) {
      setErrorMessage('选择快递配送时必须填写运费模板 ID');
      setActiveTab('delivery');
      return;
    }
    if (form.skus.some((item) => !item.picUrl)) {
      setErrorMessage('SKU 图片不能为空');
      setActiveTab('sku');
      return;
    }
    if (form.specType && form.skus.some((item) => !item.properties || item.properties.length === 0)) {
      setErrorMessage('多规格模式下每个 SKU 必须包含属性组合');
      setActiveTab('sku');
      return;
    }

    setLoading(true);
    try {
      const payload: SpuSaveReq = {
        ...form,
        skus: form.skus.map((sku) => ({
          ...sku,
          price: yuanToFen(sku.price),
          marketPrice: yuanToFen(sku.marketPrice),
          costPrice: yuanToFen(sku.costPrice),
          subCommissionFirstPrice: yuanToFen(sku.subCommissionFirstPrice),
          subCommissionSecondPrice: yuanToFen(sku.subCommissionSecondPrice)
        })),
        sliderPicUrls: (form.sliderPicUrls ?? []).filter((item) => Boolean(item))
      };
      if (spuId) {
        await updateSpu({ ...payload, id: spuId });
      } else {
        await createSpu(payload);
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

      {activeTab === 'info' && (
        <Card>
          <CardContent>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" label="商品名称*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" select label="分类*" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}>
                  <MenuItem value={0}>请选择分类</MenuItem>
                  {categories.map((item) => (
                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" select label="品牌*" value={form.brandId} onChange={(e) => setForm({ ...form, brandId: Number(e.target.value) })}>
                  <MenuItem value={0}>请选择品牌</MenuItem>
                  {brands.map((item) => (
                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" label="关键字*" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" label="封面图 URL*" value={form.picUrl} onChange={(e) => setForm({ ...form, picUrl: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" type="number" label="排序" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField disabled={readonly} fullWidth size="small" multiline minRows={2} label="简介*" value={form.introduction} onChange={(e) => setForm({ ...form, introduction: e.target.value })} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 'sku' && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={3}>
                <FormControlLabel
                  control={<Checkbox checked={Boolean(form.subCommissionType)} disabled={readonly} onChange={(e) => setForm({ ...form, subCommissionType: e.target.checked })} />}
                  label="分销类型：单独设置"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.specType}
                      disabled={readonly}
                      onChange={(e) => {
                        const nextSpecType = e.target.checked;
                        setForm((prev) => ({
                          ...prev,
                          specType: nextSpecType,
                          skus: nextSpecType ? prev.skus : [prev.skus[0] ?? createDefaultSku()]
                        }));
                        if (!nextSpecType) {
                          setPropertyList([]);
                        }
                      }}
                    />
                  }
                  label="商品规格：多规格"
                />
              </Stack>

              {form.specType && (
                <Stack spacing={1}>
                  {!readonly && (
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1">商品属性</Typography>
                      <Button variant="outlined" size="small" onClick={() => setPropertyDialogOpen(true)}>
                        添加属性
                      </Button>
                    </Stack>
                  )}

                  {propertyList.map((property, propertyIndex) => (
                    <Stack key={property.id} spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2">属性名：</Typography>
                        <Chip label={property.name} color="success" size="small" onDelete={readonly ? undefined : () => deleteProperty(propertyIndex)} />
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2">属性值：</Typography>
                        {property.values.map((value) => (
                          <Chip
                            key={value.id}
                            label={value.name}
                            size="small"
                            onDelete={readonly ? undefined : () => deletePropertyValue(propertyIndex, value.id)}
                          />
                        ))}
                        {!readonly && (
                          <Button size="small" variant="outlined" onClick={() => openAddValueDialog(propertyIndex)}>
                            添加属性值
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}

              {form.specType && form.skus.length > 0 && !readonly && (
                <Stack spacing={1}>
                  <Typography variant="subtitle1">批量设置</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <TextField size="small" label="销售价(元)" type="number" inputProps={{ step: 0.01 }} value={batchSku.price} onChange={(e) => setBatchSku((prev) => ({ ...prev, price: Number(e.target.value) }))} />
                    <TextField size="small" label="市场价(元)" type="number" inputProps={{ step: 0.01 }} value={batchSku.marketPrice} onChange={(e) => setBatchSku((prev) => ({ ...prev, marketPrice: Number(e.target.value) }))} />
                    <TextField size="small" label="成本价(元)" type="number" inputProps={{ step: 0.01 }} value={batchSku.costPrice} onChange={(e) => setBatchSku((prev) => ({ ...prev, costPrice: Number(e.target.value) }))} />
                    <TextField size="small" label="库存" type="number" value={batchSku.stock} onChange={(e) => setBatchSku((prev) => ({ ...prev, stock: Number(e.target.value) }))} />
                    <TextField size="small" label="图片 URL" value={batchSku.picUrl} onChange={(e) => setBatchSku((prev) => ({ ...prev, picUrl: e.target.value }))} />
                    <Button variant="contained" onClick={applyBatchSku}>批量应用</Button>
                  </Stack>
                </Stack>
              )}

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>图片</TableCell>
                    {form.specType &&
                      propertyList.map((property) => <TableCell key={property.id}>{property.name}</TableCell>)}
                    <TableCell>商品条码</TableCell>
                    <TableCell>销售价</TableCell>
                    <TableCell>市场价</TableCell>
                    <TableCell>成本价</TableCell>
                    <TableCell>库存</TableCell>
                    <TableCell>重量(kg)</TableCell>
                    <TableCell>体积(m³)</TableCell>
                    {Boolean(form.subCommissionType) && <TableCell>一级返佣(元)</TableCell>}
                    {Boolean(form.subCommissionType) && <TableCell>二级返佣(元)</TableCell>}
                    {form.specType && !readonly && <TableCell>操作</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.skus.map((sku, index) => (
                    <TableRow key={buildSkuKey(sku.properties) || index}>
                      <TableCell>
                        <TextField
                          size="small"
                          value={sku.picUrl || ''}
                          disabled={readonly}
                          onChange={(e) => patchSku(index, 'picUrl', e.target.value)}
                        />
                      </TableCell>
                      {form.specType &&
                        propertyList.map((property) => {
                          const propertyValueName = sku.properties?.find((item) => item.propertyId === property.id)?.valueName || '';
                          return <TableCell key={property.id}>{propertyValueName}</TableCell>;
                        })}
                      <TableCell>
                        <TextField size="small" value={sku.barCode || ''} disabled={readonly} onChange={(e) => patchSku(index, 'barCode', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" inputProps={{ step: 0.01 }} value={sku.price} disabled={readonly} onChange={(e) => patchSku(index, 'price', Number(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" inputProps={{ step: 0.01 }} value={sku.marketPrice} disabled={readonly} onChange={(e) => patchSku(index, 'marketPrice', Number(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" inputProps={{ step: 0.01 }} value={sku.costPrice} disabled={readonly} onChange={(e) => patchSku(index, 'costPrice', Number(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={sku.stock} disabled={readonly} onChange={(e) => patchSku(index, 'stock', Number(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={sku.weight || 0} disabled={readonly} onChange={(e) => patchSku(index, 'weight', Number(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={sku.volume || 0} disabled={readonly} onChange={(e) => patchSku(index, 'volume', Number(e.target.value))} />
                      </TableCell>
                      {Boolean(form.subCommissionType) && (
                        <TableCell>
                          <TextField size="small" type="number" inputProps={{ step: 0.01 }} value={sku.subCommissionFirstPrice || 0} disabled={readonly} onChange={(e) => patchSku(index, 'subCommissionFirstPrice', Number(e.target.value))} />
                        </TableCell>
                      )}
                      {Boolean(form.subCommissionType) && (
                        <TableCell>
                          <TextField size="small" type="number" inputProps={{ step: 0.01 }} value={sku.subCommissionSecondPrice || 0} disabled={readonly} onChange={(e) => patchSku(index, 'subCommissionSecondPrice', Number(e.target.value))} />
                        </TableCell>
                      )}
                      {form.specType && !readonly && (
                        <TableCell>
                          <Button size="small" color="error" onClick={() => deleteSku(index)}>删除</Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </CardContent>
        </Card>
      )}

      {activeTab === 'delivery' && (
        <Card>
          <CardContent>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12 }}>
                <Stack direction="row" spacing={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.deliveryTypes.includes(DELIVERY_TYPE_EXPRESS)}
                        disabled={readonly}
                        onChange={(event) => {
                          setForm((prev) => ({
                            ...prev,
                            deliveryTypes: event.target.checked
                              ? [...new Set([...prev.deliveryTypes, DELIVERY_TYPE_EXPRESS])]
                              : prev.deliveryTypes.filter((item) => item !== DELIVERY_TYPE_EXPRESS)
                          }));
                        }}
                      />
                    }
                    label="快递"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.deliveryTypes.includes(DELIVERY_TYPE_PICK_UP)}
                        disabled={readonly}
                        onChange={(event) => {
                          setForm((prev) => ({
                            ...prev,
                            deliveryTypes: event.target.checked
                              ? [...new Set([...prev.deliveryTypes, DELIVERY_TYPE_PICK_UP])]
                              : prev.deliveryTypes.filter((item) => item !== DELIVERY_TYPE_PICK_UP)
                          }));
                        }}
                      />
                    }
                    label="门店自提"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.deliveryTypes.includes(DELIVERY_TYPE_SAME_CITY)}
                        disabled={readonly}
                        onChange={(event) => {
                          setForm((prev) => ({
                            ...prev,
                            deliveryTypes: event.target.checked
                              ? [...new Set([...prev.deliveryTypes, DELIVERY_TYPE_SAME_CITY])]
                              : prev.deliveryTypes.filter((item) => item !== DELIVERY_TYPE_SAME_CITY)
                          }));
                        }}
                      />
                    }
                    label="同城配送"
                  />
                </Stack>
              </Grid>
              {form.deliveryTypes.includes(DELIVERY_TYPE_EXPRESS) ? (
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    disabled={readonly}
                    fullWidth
                    size="small"
                    label="运费模板 ID"
                    type="number"
                    value={form.deliveryTemplateId || 0}
                    onChange={(e) => setForm({ ...form, deliveryTemplateId: Number(e.target.value) })}
                  />
                </Grid>
              ) : null}
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  配送方式 / Delivery types
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 'description' && (
        <Card>
          <CardContent>
            <TextField disabled={readonly} fullWidth size="small" multiline minRows={6} label="商品详情*" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'other' && (
        <Card>
          <CardContent>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" type="number" label="赠送积分" value={form.giveIntegral || 0} onChange={(e) => setForm({ ...form, giveIntegral: Number(e.target.value) })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" label="活动排序" value={form.activityOrders || ''} onChange={(e) => setForm({ ...form, activityOrders: e.target.value })} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        {!readonly && (
          <Button variant="contained" onClick={submit} disabled={loading}>
            保存
          </Button>
        )}
        <Button variant="outlined" onClick={() => navigate('/product/spu')}>
          返回
        </Button>
      </Stack>

      <Dialog open={propertyDialogOpen} onClose={() => setPropertyDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>添加商品属性</DialogTitle>
        <DialogContent>
          <Autocomplete
            freeSolo
            options={propertyOptions.map((item) => item.name)}
            value={propertyInputName}
            onInputChange={(_, value) => setPropertyInputName(value)}
            renderInput={(params) => <TextField {...params} fullWidth size="small" label="属性名称" sx={{ mt: 1 }} />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPropertyDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={addProperty}>确定</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={valueDialogOpen} onClose={() => setValueDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>添加属性值</DialogTitle>
        <DialogContent>
          <Autocomplete
            freeSolo
            options={(
              propertyList[valueDialogPropertyIndex]
                ? propertyValueOptions[propertyList[valueDialogPropertyIndex].id] ?? []
                : []
            ).map((item) => item.name)}
            value={valueInputName}
            onInputChange={(_, value) => setValueInputName(value)}
            renderInput={(params) => <TextField {...params} fullWidth size="small" label="属性值" sx={{ mt: 1 }} />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValueDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={addPropertyValue}>确定</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
