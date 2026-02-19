import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Checkbox,
  Typography,
  Paper
} from '@mui/material';
import {
  createSpu,
  getCategoryPropertyList,
  getBrandSimpleList,
  getCategoryList,
  getPropertyValueSimpleList,
  getSpuDetail,
  type BrandResp,
  type CategoryPropertyResp,
  type CategoryResp,
  type PropertyValueResp,
  type SkuProperty,
  type SkuResp,
  type SpuSaveReq,
  updateSpu
} from '../../api/admin';

const DELIVERY_TYPE_EXPRESS = 1;
const DELIVERY_TYPE_PICK_UP = 2;
const DELIVERY_TYPE_SAME_CITY = 3;
const PROPERTY_TYPE_DISPLAY = 0;
const PROPERTY_TYPE_SALES = 1;
const APP_BAR_HEIGHT = 64;
const SECTION_STICKY_GAP = 8;
const SECTION_STICKY_TOP = APP_BAR_HEIGHT + SECTION_STICKY_GAP;
const SECTION_SCROLL_MARGIN_TOP = SECTION_STICKY_TOP + 56;

type PropertyAndValues = {
  id: number;
  name: string;
  values: Array<{ id: number; name: string; picUrl?: string }>;
};

type SalesValueSlot = {
  valueId: number | null;
  valueName: string;
  picUrl: string;
};

type SalesSlotMap = Record<number, SalesValueSlot[]>;

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
  displayProperties: [],
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
          values: [{ id: property.valueId, name: property.valueName, picUrl: property.valuePicUrl }]
        });
        return;
      }
      if (!exists.values.some((value) => value.id === property.valueId)) {
        exists.values.push({ id: property.valueId, name: property.valueName, picUrl: property.valuePicUrl });
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
            valueName: value.name,
            valuePicUrl: value.picUrl
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

type FormSection = 'info' | 'sku' | 'delivery' | 'description' | 'other';

const FORM_SECTION_NAV: Array<{ key: FormSection; label: string }> = [
  { key: 'info', label: '基础信息' },
  { key: 'sku', label: '销售信息' },
  { key: 'delivery', label: '物流服务' },
  { key: 'description', label: '图文描述' },
  { key: 'other', label: '其它设置' }
];

export function SpuFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const spuId = id ? Number(id) : 0;
  const isEdit = window.location.pathname.endsWith('/edit');
  const isDetail = Boolean(spuId) && !isEdit;
  const readonly = isDetail;

  const [brands, setBrands] = useState<BrandResp[]>([]);
  const [categories, setCategories] = useState<CategoryResp[]>([]);
  const [salesPropertyOptions, setSalesPropertyOptions] = useState<CategoryPropertyResp[]>([]);
  const [displayPropertyOptions, setDisplayPropertyOptions] = useState<CategoryPropertyResp[]>([]);
  const [propertyValueOptions, setPropertyValueOptions] = useState<Record<number, PropertyValueResp[]>>({});
  const [propertyList, setPropertyList] = useState<PropertyAndValues[]>([]);
  const [salesValueSlots, setSalesValueSlots] = useState<SalesSlotMap>({});
  const [batchSku, setBatchSku] = useState<SkuResp>(createDefaultSku());

  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<FormSection>('info');
  const [form, setForm] = useState<SpuSaveReq>(createDefaultForm());
  const [errorMessage, setErrorMessage] = useState('');
  const sectionRefs = useRef<Record<FormSection, HTMLDivElement | null>>({
    info: null,
    sku: null,
    delivery: null,
    description: null,
    other: null
  });

  const pageTitle = useMemo(() => {
    if (!spuId) return '新增商品';
    return isDetail ? `商品详情 #${spuId}` : `编辑商品 #${spuId}`;
  }, [isDetail, spuId]);

  const colorPropertyId = useMemo(() => {
    const withImageProperty = salesPropertyOptions.find((item) => item.supportValueImage);
    if (withImageProperty) {
      return withImageProperty.propertyId;
    }
    const colorByName = propertyList.find((item) => item.name.includes('色'));
    return colorByName?.id;
  }, [salesPropertyOptions, propertyList]);

  const orderedSkuRows = useMemo(() => {
    const rows = form.skus.map((sku, sourceIndex) => ({ sku, sourceIndex }));
    if (!form.specType || !colorPropertyId) {
      return rows;
    }
    return rows.sort((left, right) => {
      const leftColorValueId =
        left.sku.properties?.find((item) => item.propertyId === colorPropertyId)?.valueId ??
        Number.MAX_SAFE_INTEGER;
      const rightColorValueId =
        right.sku.properties?.find((item) => item.propertyId === colorPropertyId)?.valueId ??
        Number.MAX_SAFE_INTEGER;
      if (leftColorValueId !== rightColorValueId) {
        return leftColorValueId - rightColorValueId;
      }
      return left.sourceIndex - right.sourceIndex;
    });
  }, [form.skus, form.specType, colorPropertyId]);

  function scrollToSection(sectionKey: FormSection) {
    sectionRefs.current[sectionKey]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(sectionKey);
  }

  function rebuildPropertyListFromSlots(nextSlots: SalesSlotMap) {
    const nextPropertyList: PropertyAndValues[] = salesPropertyOptions
      .map((property) => {
        const optionMap = new Map((propertyValueOptions[property.propertyId] ?? []).map((item) => [item.id, item]));
        const selectedValues = nextSlots[property.propertyId] ?? [];
        const valuesMap = new Map<number, { id: number; name: string; picUrl?: string }>();
        selectedValues.forEach((slot) => {
          if (!slot.valueId) {
            return;
          }
          const option = optionMap.get(slot.valueId);
          const valueName = slot.valueName || option?.name || '';
          if (!valueName) {
            return;
          }
          const valuePicUrl = property.supportValueImage
            ? slot.picUrl || option?.picUrl || ''
            : option?.picUrl || '';
          valuesMap.set(slot.valueId, {
            id: slot.valueId,
            name: valueName,
            picUrl: valuePicUrl
          });
        });
        return {
          id: property.propertyId,
          name: property.propertyName,
          values: Array.from(valuesMap.values())
        };
      })
      .filter((item) => item.values.length > 0);
    setPropertyList(nextPropertyList);
  }

  async function loadMeta() {
    const [brandList, categoryList] = await Promise.all([getBrandSimpleList(), getCategoryList()]);
    setBrands(brandList);
    setCategories(categoryList);
  }

  async function loadCategoryProperties(targetCategoryId: number) {
    if (!targetCategoryId) {
      setSalesPropertyOptions([]);
      setDisplayPropertyOptions([]);
      return;
    }
    const [salesList, displayList] = await Promise.all([
      getCategoryPropertyList(targetCategoryId, PROPERTY_TYPE_SALES),
      getCategoryPropertyList(targetCategoryId, PROPERTY_TYPE_DISPLAY)
    ]);
    setSalesPropertyOptions(salesList.filter((item) => item.enabled));
    setDisplayPropertyOptions(displayList.filter((item) => item.enabled));
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
      displayProperties: detail.displayProperties || [],
      skus: detailSkus
    });
    const propertyListFromDetail = buildPropertyListFromSkus(detailSkus);
    setPropertyList(propertyListFromDetail);
    setSalesValueSlots(
      propertyListFromDetail.reduce<SalesSlotMap>((accumulator, item) => {
        accumulator[item.id] = item.values.map((value) => ({
          valueId: value.id,
          valueName: value.name,
          picUrl: value.picUrl || ''
        }));
        return accumulator;
      }, {})
    );
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMeta(), spuId ? loadDetail(spuId) : Promise.resolve()])
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [spuId]);

  useEffect(() => {
    if (!form.categoryId) {
      setSalesPropertyOptions([]);
      setDisplayPropertyOptions([]);
      return;
    }
    void loadCategoryProperties(form.categoryId).catch((error) => setErrorMessage((error as Error).message));
  }, [form.categoryId]);

  useEffect(() => {
    if (!salesPropertyOptions.length) {
      setSalesValueSlots({});
      setPropertyList([]);
      return;
    }
    setSalesValueSlots((prev) => {
      const next = salesPropertyOptions.reduce<SalesSlotMap>((accumulator, property) => {
        accumulator[property.propertyId] = prev[property.propertyId] ?? [];
        return accumulator;
      }, {});
      rebuildPropertyListFromSlots(next);
      return next;
    });
  }, [salesPropertyOptions]);

  useEffect(() => {
    if (!salesPropertyOptions.length) {
      return;
    }
    rebuildPropertyListFromSlots(salesValueSlots);
  }, [propertyValueOptions]);

  useEffect(() => {
    salesPropertyOptions.forEach((property) => {
      if (!propertyValueOptions[property.propertyId]) {
        void loadSalesPropertyValues(property.propertyId);
      }
    });
  }, [salesPropertyOptions]);

  useEffect(() => {
    function syncActiveSectionByScroll() {
      const offset = SECTION_SCROLL_MARGIN_TOP;
      let current: FormSection = 'info';
      FORM_SECTION_NAV.forEach((section) => {
        const top = sectionRefs.current[section.key]?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
        if (top - offset <= 0) {
          current = section.key;
        }
      });
      setActiveSection(current);
    }
    window.addEventListener('scroll', syncActiveSectionByScroll, { passive: true });
    syncActiveSectionByScroll();
    return () => window.removeEventListener('scroll', syncActiveSectionByScroll);
  }, []);

  useEffect(() => {
    if (!form.specType) {
      if (form.skus.length !== 1) {
        setForm((prev) => ({ ...prev, skus: [prev.skus[0] ?? createDefaultSku()] }));
      }
      return;
    }
    if (propertyList.length === 0 || propertyList.some((item) => item.values.length === 0)) {
      if (form.skus.length !== 0) {
        setForm((prev) => ({ ...prev, skus: [] }));
      }
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

  async function loadSalesPropertyValues(propertyId: number) {
    try {
      await loadPropertyValueOptions(propertyId);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  function addSalesValueSlot(propertyId: number) {
    setSalesValueSlots((prev) => {
      const current = prev[propertyId] ?? [];
      const next = {
        ...prev,
        [propertyId]: [...current, { valueId: null, valueName: '', picUrl: '' }]
      };
      rebuildPropertyListFromSlots(next);
      return next;
    });
  }

  function removeSalesValueSlot(propertyId: number, slotIndex: number) {
    setSalesValueSlots((prev) => {
      const current = prev[propertyId] ?? [];
      const next = {
        ...prev,
        [propertyId]: current.filter((_, index) => index !== slotIndex)
      };
      rebuildPropertyListFromSlots(next);
      return next;
    });
  }

  function patchSalesValueSlot(propertyId: number, slotIndex: number, patch: Partial<SalesValueSlot>) {
    setSalesValueSlots((prev) => {
      const current = prev[propertyId] ?? [];
      if (!current[slotIndex]) {
        return prev;
      }
      const nextSlots = current.map((item, index) => (index === slotIndex ? { ...item, ...patch } : item));
      const next = { ...prev, [propertyId]: nextSlots };
      rebuildPropertyListFromSlots(next);
      return next;
    });
  }

  function patchSalesValueBySlot(propertyId: number, slotIndex: number, valueId: number | null) {
    setErrorMessage('');
    setSalesValueSlots((prev) => {
      const current = prev[propertyId] ?? [];
      if (!current[slotIndex]) {
        return prev;
      }
      if (!valueId) {
        const nextSlots = current.map((item, index) =>
          index === slotIndex ? { ...item, valueId: null, valueName: '' } : item
        );
        const next = { ...prev, [propertyId]: nextSlots };
        rebuildPropertyListFromSlots(next);
        return next;
      }
      if (current.some((item, index) => index !== slotIndex && item.valueId === valueId)) {
        setErrorMessage('同一销售属性下不能重复选择同一个规格值');
        return prev;
      }
      const option = (propertyValueOptions[propertyId] ?? []).find((item) => item.id === valueId);
      const property = salesPropertyOptions.find((item) => item.propertyId === propertyId);
      const nextSlots = current.map((item, index) =>
        index === slotIndex
          ? {
              ...item,
              valueId,
              valueName: option?.name || item.valueName,
              picUrl: property?.supportValueImage ? item.picUrl || option?.picUrl || '' : ''
            }
          : item
      );
      const next = { ...prev, [propertyId]: nextSlots };
      rebuildPropertyListFromSlots(next);
      return next;
    });
  }

  function resolveSkuDisplayPicUrl(sku: SkuResp) {
    if (sku.picUrl?.trim()) {
      return sku.picUrl;
    }
    const valuePicUrl = (sku.properties ?? []).map((item) => item.valuePicUrl).find((item) => Boolean(item?.trim()));
    return valuePicUrl || form.picUrl || '';
  }

  function patchDisplayProperty(propertyId: number, propertyName: string, valueText: string, sort: number) {
    setForm((prev) => {
      const currentList = [...(prev.displayProperties ?? [])];
      const targetIndex = currentList.findIndex((item) => item.propertyId === propertyId);
      if (!valueText.trim()) {
        if (targetIndex >= 0) {
          currentList.splice(targetIndex, 1);
        }
        return { ...prev, displayProperties: currentList };
      }
      const nextItem = { propertyId, propertyName, valueText, sort };
      if (targetIndex >= 0) {
        currentList[targetIndex] = nextItem;
      } else {
        currentList.push(nextItem);
      }
      return { ...prev, displayProperties: currentList };
    });
  }

  async function submit() {
    if (readonly) {
      navigate('/product/spu');
      return;
    }
    if (!form.name || !form.keyword || !form.introduction || !form.description || !form.picUrl) {
      setErrorMessage('请完善基础设置');
      setActiveSection('info');
      return;
    }
    if (!form.categoryId || !form.brandId) {
      setErrorMessage('请选择分类和品牌');
      setActiveSection('info');
      return;
    }
    const requiredDisplayProperties = displayPropertyOptions.filter((item) => item.required);
    const displayValueMap = new Map((form.displayProperties ?? []).map((item) => [item.propertyId, item.valueText]));
    if (requiredDisplayProperties.some((item) => !displayValueMap.get(item.propertyId)?.trim())) {
      setErrorMessage('请填写类目必填展示属性');
      setActiveSection('info');
      return;
    }
    if (form.specType) {
      const requiredSalesProperties = salesPropertyOptions.filter((item) => item.required);
      const selectedSalesValueMap = new Map(
        propertyList.map((item) => [item.id, (item.values ?? []).map((value) => value.id)])
      );
      if (requiredSalesProperties.some((item) => !(selectedSalesValueMap.get(item.propertyId) ?? []).length)) {
        setErrorMessage('请先完成必填销售属性的值选择');
        setActiveSection('sku');
        return;
      }
      if (!propertyList.length) {
        setErrorMessage('多规格模式下请先选择销售属性值');
        setActiveSection('sku');
        return;
      }
    }
    if (!form.skus.length) {
      setErrorMessage('请至少配置一条 SKU');
      setActiveSection('sku');
      return;
    }
    if (!form.deliveryTypes.length) {
      setErrorMessage('请至少选择一种配送方式');
      setActiveSection('delivery');
      return;
    }
    if (form.deliveryTypes.includes(DELIVERY_TYPE_EXPRESS) && !form.deliveryTemplateId) {
      setErrorMessage('选择快递配送时必须填写运费模板 ID');
      setActiveSection('delivery');
      return;
    }
    if (form.specType && form.skus.some((item) => !item.properties || item.properties.length === 0)) {
      setErrorMessage('多规格模式下每个 SKU 必须包含属性组合');
      setActiveSection('sku');
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
        sliderPicUrls: (form.sliderPicUrls ?? []).filter((item) => Boolean(item)),
        displayProperties: (form.displayProperties ?? []).filter((item) => item.valueText?.trim())
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
    <Stack spacing={2} sx={{ pb: 10 }}>
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

      <Paper
        variant="outlined"
        sx={{
          position: 'sticky',
          top: `${SECTION_STICKY_TOP}px`,
          zIndex: (theme) => theme.zIndex.appBar - 1,
          px: 1.5,
          py: 1,
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)'
        }}
      >
        {FORM_SECTION_NAV.map((section) => (
          <Button
            key={section.key}
            size="small"
            variant={activeSection === section.key ? 'contained' : 'text'}
            onClick={() => scrollToSection(section.key)}
          >
            {section.label}
          </Button>
        ))}
      </Paper>

      <Box ref={(element: HTMLDivElement | null) => { sectionRefs.current.info = element; }} sx={{ scrollMarginTop: `${SECTION_SCROLL_MARGIN_TOP}px` }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>基础信息</Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField disabled={readonly} fullWidth size="small" label="商品名称*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  disabled={readonly}
                  fullWidth
                  size="small"
                  select
                  label="分类*"
                  value={form.categoryId}
                  onChange={(e) => {
                    const nextCategoryId = Number(e.target.value);
                    setForm({
                      ...form,
                      categoryId: nextCategoryId,
                      displayProperties: []
                    });
                    setSalesValueSlots({});
                    setPropertyList([]);
                  }}
                >
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
              {displayPropertyOptions.map((item) => (
                <Grid key={item.propertyId} size={{ xs: 12, md: 4 }}>
                  <TextField
                    disabled={readonly}
                    fullWidth
                    size="small"
                    label={`${item.propertyName}${item.required ? '*' : ''}`}
                    value={
                      form.displayProperties?.find((value) => value.propertyId === item.propertyId)?.valueText || ''
                    }
                    onChange={(e) =>
                      patchDisplayProperty(item.propertyId, item.propertyName, e.target.value, item.sort)
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Box>

      <Box ref={(element: HTMLDivElement | null) => { sectionRefs.current.sku = element; }} sx={{ scrollMarginTop: `${SECTION_SCROLL_MARGIN_TOP}px` }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>销售信息</Typography>
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
                          skus: nextSpecType ? [] : [prev.skus[0] ?? createDefaultSku()]
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
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1">销售属性</Typography>
                    <Chip size="small" color="info" variant="outlined" label="先选属性值，再生成销售规格" />
                  </Stack>
                  {salesPropertyOptions.length === 0 ? (
                    <Alert severity="warning">当前分类未配置销售属性，请先到“类目属性绑定”配置。</Alert>
                  ) : (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1,
                        bgcolor: '#f8f9fc',
                        borderColor: '#e8ebf3'
                      }}
                    >
                      {salesPropertyOptions.map((property) => (
                        <Box
                          key={property.propertyId}
                          sx={{
                            py: 0.75,
                            borderBottom: '1px solid #e8ebf3',
                            '&:last-of-type': { borderBottom: 'none', pb: 0 }
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: '1rem', lineHeight: 1.2 }}>
                                {property.propertyName}
                                <Typography component="span" color="text.secondary" sx={{ ml: 0.5 }}>
                                  ({(salesValueSlots[property.propertyId] ?? []).length})
                                </Typography>
                                {property.required ? (
                                  <Typography component="span" color="error.main" sx={{ ml: 0.5 }}>
                                    *
                                  </Typography>
                                ) : null}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {property.required ? '必填销售属性' : '可选销售属性'}
                              </Typography>
                            </Stack>
                            <Button variant="text" size="small" disabled sx={{ minWidth: 36, px: 0.5 }}>
                              排序
                            </Button>
                          </Stack>

                          <Grid container spacing={0.75}>
                            {(salesValueSlots[property.propertyId] ?? []).map((slot, slotIndex) => (
                              <Grid key={`${property.propertyId}-${slotIndex}`} size={{ xs: 12, md: 6 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  {property.supportValueImage ? (
                                    <Box
                                      onClick={() => {
                                        if (readonly) {
                                          return;
                                        }
                                        const currentUrl = slot.picUrl || '';
                                        const nextUrl = window.prompt('请输入规格图 URL', currentUrl);
                                        if (nextUrl === null) {
                                          return;
                                        }
                                        patchSalesValueSlot(property.propertyId, slotIndex, { picUrl: nextUrl.trim() });
                                      }}
                                      sx={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 1,
                                        border: '1px dashed',
                                        borderColor: 'divider',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: '#fff',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        cursor: readonly ? 'default' : 'pointer'
                                      }}
                                    >
                                      <Avatar
                                        variant="rounded"
                                        src={slot.picUrl || undefined}
                                        sx={{ width: 30, height: 30 }}
                                      >
                                        图
                                      </Avatar>
                                    </Box>
                                  ) : null}
                                  <TextField
                                    size="small"
                                    select
                                    fullWidth
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        borderRadius: 1,
                                        minHeight: 38,
                                        bgcolor: '#fff'
                                      }
                                    }}
                                    label=""
                                    placeholder={`${property.propertyName}${property.required ? '(必选)' : ''}`}
                                    value={slot.valueId ?? ''}
                                    disabled={readonly}
                                    onChange={(e) => {
                                      const nextValue = e.target.value;
                                      patchSalesValueBySlot(
                                        property.propertyId,
                                        slotIndex,
                                        nextValue === '' ? null : Number(nextValue)
                                      );
                                    }}
                                  >
                                    <MenuItem value="">请选择</MenuItem>
                                    {(propertyValueOptions[property.propertyId] ?? []).map((option) => (
                                      <MenuItem key={option.id} value={option.id}>
                                        {option.name}
                                      </MenuItem>
                                    ))}
                                    {slot.valueId &&
                                      !(propertyValueOptions[property.propertyId] ?? []).some(
                                        (option) => option.id === slot.valueId
                                      ) && (
                                        <MenuItem value={slot.valueId}>{slot.valueName || `#${slot.valueId}`}</MenuItem>
                                      )}
                                  </TextField>
                                  {!readonly && (
                                    <Button
                                      color="error"
                                      sx={{ minWidth: 32, px: 0.5 }}
                                      onClick={() => removeSalesValueSlot(property.propertyId, slotIndex)}
                                    >
                                      删
                                    </Button>
                                  )}
                                </Stack>
                              </Grid>
                            ))}

                            {!readonly && (
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Button
                                  variant="outlined"
                                  onClick={() => addSalesValueSlot(property.propertyId)}
                                  sx={{
                                    height: 38,
                                    borderRadius: 1,
                                    width: 38,
                                    minWidth: 38
                                  }}
                                >
                                  +
                                </Button>
                              </Grid>
                            )}
                          </Grid>

                          {(propertyValueOptions[property.propertyId] ?? []).length === 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              暂无可选规格值
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Paper>
                  )}
                </Stack>
              )}

              {form.specType && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle1">销售规格</Typography>
                  <Chip size="small" variant="outlined" label={`SKU ${form.skus.length} 条`} />
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

              {form.specType && propertyList.length === 0 ? (
                <Alert severity="info">请先在上方选择销售属性值，再自动生成销售规格（SKU）。</Alert>
              ) : (
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
                    {orderedSkuRows.map(({ sku, sourceIndex }) => (
                      <TableRow key={buildSkuKey(sku.properties) || sourceIndex}>
                        <TableCell>
                          <TextField
                            size="small"
                            value={sku.picUrl || ''}
                            disabled={readonly}
                            onChange={(e) => patchSku(sourceIndex, 'picUrl', e.target.value)}
                            placeholder={readonly ? '' : '可选，留空时回退'}
                          />
                          <Typography variant="caption" color="text.secondary">
                            展示图：{resolveSkuDisplayPicUrl(sku) || '-'}
                          </Typography>
                        </TableCell>
                        {form.specType &&
                          propertyList.map((property) => {
                            const propertyValueName = sku.properties?.find((item) => item.propertyId === property.id)?.valueName || '';
                            return <TableCell key={property.id}>{propertyValueName}</TableCell>;
                          })}
                        <TableCell>
                          <TextField size="small" value={sku.barCode || ''} disabled={readonly} onChange={(e) => patchSku(sourceIndex, 'barCode', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" inputProps={{ step: 0.01 }} value={sku.price} disabled={readonly} onChange={(e) => patchSku(sourceIndex, 'price', Number(e.target.value))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" inputProps={{ step: 0.01 }} value={sku.marketPrice} disabled={readonly} onChange={(e) => patchSku(sourceIndex, 'marketPrice', Number(e.target.value))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" inputProps={{ step: 0.01 }} value={sku.costPrice} disabled={readonly} onChange={(e) => patchSku(sourceIndex, 'costPrice', Number(e.target.value))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={sku.stock} disabled={readonly} onChange={(e) => patchSku(sourceIndex, 'stock', Number(e.target.value))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={sku.weight || 0} disabled={readonly} onChange={(e) => patchSku(sourceIndex, 'weight', Number(e.target.value))} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={sku.volume || 0} disabled={readonly} onChange={(e) => patchSku(sourceIndex, 'volume', Number(e.target.value))} />
                        </TableCell>
                        {Boolean(form.subCommissionType) && (
                          <TableCell>
                            <TextField size="small" type="number" inputProps={{ step: 0.01 }} value={sku.subCommissionFirstPrice || 0} disabled={readonly} onChange={(e) => patchSku(sourceIndex, 'subCommissionFirstPrice', Number(e.target.value))} />
                          </TableCell>
                        )}
                        {Boolean(form.subCommissionType) && (
                          <TableCell>
                            <TextField size="small" type="number" inputProps={{ step: 0.01 }} value={sku.subCommissionSecondPrice || 0} disabled={readonly} onChange={(e) => patchSku(sourceIndex, 'subCommissionSecondPrice', Number(e.target.value))} />
                          </TableCell>
                        )}
                        {form.specType && !readonly && (
                          <TableCell>
                            <Button size="small" color="error" onClick={() => deleteSku(sourceIndex)}>删除</Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Box ref={(element: HTMLDivElement | null) => { sectionRefs.current.delivery = element; }} sx={{ scrollMarginTop: `${SECTION_SCROLL_MARGIN_TOP}px` }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>物流服务</Typography>
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
      </Box>

      <Box ref={(element: HTMLDivElement | null) => { sectionRefs.current.description = element; }} sx={{ scrollMarginTop: `${SECTION_SCROLL_MARGIN_TOP}px` }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>图文描述</Typography>
            <TextField disabled={readonly} fullWidth size="small" multiline minRows={6} label="商品详情*" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </CardContent>
        </Card>
      </Box>

      <Box ref={(element: HTMLDivElement | null) => { sectionRefs.current.other = element; }} sx={{ scrollMarginTop: `${SECTION_SCROLL_MARGIN_TOP}px` }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>其它设置</Typography>
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
      </Box>

      <Paper
        variant="outlined"
        sx={{
          position: 'sticky',
          bottom: 0,
          zIndex: (theme) => theme.zIndex.appBar - 1,
          p: 1.5,
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(8px)'
        }}
      >
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
      </Paper>

    </Stack>
  );
}
