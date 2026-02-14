import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
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
  getPropertySimpleListByType,
  saveCategoryPropertyBatch,
  type CategoryPropertyResp,
  type CategoryResp,
  type PropertyResp
} from '../../api/admin';

const PROPERTY_TYPE_DISPLAY = 0;
const PROPERTY_TYPE_SALES = 1;

type PropertyType = typeof PROPERTY_TYPE_DISPLAY | typeof PROPERTY_TYPE_SALES;

type BindingRow = {
  propertyId: number;
  propertyName: string;
  propertyType: PropertyType;
  selected: boolean;
  enabled: boolean;
  required: boolean;
  sort: number;
};

function propertyTypeLabel(type: PropertyType) {
  return type === PROPERTY_TYPE_SALES ? '销售属性' : '展示属性';
}

function mergeBindingRows(
  allProperties: PropertyResp[],
  boundProperties: CategoryPropertyResp[],
  propertyType: PropertyType
): BindingRow[] {
  const boundMap = new Map(boundProperties.map((item) => [item.propertyId, item]));
  return allProperties
    .map((item, index) => {
      const bound = boundMap.get(item.id);
      return {
        propertyId: item.id,
        propertyName: item.name,
        propertyType,
        selected: Boolean(bound),
        enabled: bound ? bound.enabled : true,
        required: bound ? bound.required : false,
        sort: bound ? bound.sort : (index + 1) * 10
      };
    })
    .sort((left, right) => left.sort - right.sort || left.propertyId - right.propertyId);
}

export function CategoryPropertyBindingPage() {
  const [categories, setCategories] = useState<CategoryResp[]>([]);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [activeType, setActiveType] = useState<PropertyType>(PROPERTY_TYPE_SALES);
  const [rowsByType, setRowsByType] = useState<Record<PropertyType, BindingRow[]>>({
    [PROPERTY_TYPE_DISPLAY]: [],
    [PROPERTY_TYPE_SALES]: []
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const selectedCount = useMemo(
    () =>
      rowsByType[PROPERTY_TYPE_DISPLAY].filter((item) => item.selected).length +
      rowsByType[PROPERTY_TYPE_SALES].filter((item) => item.selected).length,
    [rowsByType]
  );

  const activeRows = rowsByType[activeType];

  async function loadCategories() {
    const list = await getCategoryList();
    setCategories(list);
  }

  async function loadBindingRows(targetCategoryId: number) {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const [displayPropertyList, salesPropertyList, displayBoundList, salesBoundList] = await Promise.all([
        getPropertySimpleListByType(PROPERTY_TYPE_DISPLAY),
        getPropertySimpleListByType(PROPERTY_TYPE_SALES),
        getCategoryPropertyList(targetCategoryId, PROPERTY_TYPE_DISPLAY),
        getCategoryPropertyList(targetCategoryId, PROPERTY_TYPE_SALES)
      ]);
      setRowsByType({
        [PROPERTY_TYPE_DISPLAY]: mergeBindingRows(
          displayPropertyList.filter((item) => item.status === 0),
          displayBoundList,
          PROPERTY_TYPE_DISPLAY
        ),
        [PROPERTY_TYPE_SALES]: mergeBindingRows(
          salesPropertyList.filter((item) => item.status === 0),
          salesBoundList,
          PROPERTY_TYPE_SALES
        )
      });
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories().catch((error) => setErrorMessage((error as Error).message));
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setRowsByType({
        [PROPERTY_TYPE_DISPLAY]: [],
        [PROPERTY_TYPE_SALES]: []
      });
      return;
    }
    void loadBindingRows(categoryId);
  }, [categoryId]);

  function patchActiveRows(updater: (row: BindingRow) => BindingRow) {
    setRowsByType((prev) => ({
      ...prev,
      [activeType]: prev[activeType].map((row) => updater(row))
    }));
  }

  function patchSingleRow(propertyId: number, updater: (row: BindingRow) => BindingRow) {
    setRowsByType((prev) => ({
      ...prev,
      [activeType]: prev[activeType].map((row) => (row.propertyId === propertyId ? updater(row) : row))
    }));
  }

  async function onSave() {
    if (!categoryId) {
      setErrorMessage('请先选择商品分类');
      return;
    }
    const selectedRows = [...rowsByType[PROPERTY_TYPE_DISPLAY], ...rowsByType[PROPERTY_TYPE_SALES]].filter(
      (item) => item.selected
    );
    if (selectedRows.length === 0) {
      setErrorMessage('请至少选择一个属性进行绑定');
      return;
    }
    if (selectedRows.some((item) => !Number.isInteger(item.sort) || item.sort < 0)) {
      setErrorMessage('排序必须为大于等于 0 的整数');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await saveCategoryPropertyBatch({
        categoryId,
        items: selectedRows
          .sort((left, right) => left.sort - right.sort || left.propertyId - right.propertyId)
          .map((item) => ({
            propertyId: item.propertyId,
            enabled: item.enabled,
            required: item.required,
            sort: item.sort
          }))
      });
      setSuccessMessage(`已保存：${selectedRows.length} 个属性绑定`);
      await loadBindingRows(categoryId);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">类目属性绑定</Typography>
        <Button variant="contained" onClick={() => void onSave()} disabled={saving || loading || !categoryId}>
          {saving ? '保存中...' : '保存绑定'}
        </Button>
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <TextField
              select
              size="small"
              label="商品分类"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value === '' ? '' : Number(event.target.value))}
              sx={{ minWidth: 280 }}
            >
              <MenuItem value="">请选择分类</MenuItem>
              {categories.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}（ID:{item.id}）
                </MenuItem>
              ))}
            </TextField>
            <Chip color="primary" variant="outlined" label={`已绑定 ${selectedCount} 个属性`} />
            <Chip variant="outlined" label={`当前：${propertyTypeLabel(activeType)}`} />
          </Stack>
        </CardContent>
      </Card>

      <Paper sx={{ overflow: 'hidden' }}>
        <Tabs
          value={activeType}
          onChange={(_event, value: PropertyType) => setActiveType(value)}
          sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab value={PROPERTY_TYPE_SALES} label="销售属性" />
          <Tab value={PROPERTY_TYPE_DISPLAY} label="展示属性" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              勾选后即加入当前分类，支持设置启用、必填和排序
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  patchActiveRows((row) => ({ ...row, selected: true, enabled: true }));
                }}
                disabled={!activeRows.length}
              >
                当前类型全选
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={() => {
                  patchActiveRows((row) => ({ ...row, selected: false, required: false }));
                }}
                disabled={!activeRows.length}
              >
                当前类型清空
              </Button>
            </Stack>
          </Stack>

          {loading ? (
            <Box sx={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={26} />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={70}>绑定</TableCell>
                  <TableCell width={100}>属性 ID</TableCell>
                  <TableCell>属性名称</TableCell>
                  <TableCell width={100}>启用</TableCell>
                  <TableCell width={100}>必填</TableCell>
                  <TableCell width={120}>排序</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!activeRows.length ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        {categoryId ? '该类型暂无可用属性，请先到“商品规格”创建属性' : '请先选择分类'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  activeRows.map((row) => (
                    <TableRow key={row.propertyId} hover>
                      <TableCell>
                        <Checkbox
                          checked={row.selected}
                          onChange={(event) =>
                            patchSingleRow(row.propertyId, (prev) => ({
                              ...prev,
                              selected: event.target.checked,
                              required: event.target.checked ? prev.required : false
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>{row.propertyId}</TableCell>
                      <TableCell>{row.propertyName}</TableCell>
                      <TableCell>
                        <FormControlLabel
                          sx={{ m: 0 }}
                          control={
                            <Switch
                              size="small"
                              checked={row.enabled}
                              disabled={!row.selected}
                              onChange={(event) =>
                                patchSingleRow(row.propertyId, (prev) => ({
                                  ...prev,
                                  enabled: event.target.checked,
                                  required: event.target.checked ? prev.required : false
                                }))
                              }
                            />
                          }
                          label=""
                        />
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          sx={{ m: 0 }}
                          control={
                            <Switch
                              size="small"
                              checked={row.required}
                              disabled={!row.selected || !row.enabled}
                              onChange={(event) =>
                                patchSingleRow(row.propertyId, (prev) => ({
                                  ...prev,
                                  required: event.target.checked
                                }))
                              }
                            />
                          }
                          label=""
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={row.sort}
                          disabled={!row.selected}
                          inputProps={{ min: 0, step: 1 }}
                          onChange={(event) => {
                            const nextSort = Number(event.target.value);
                            patchSingleRow(row.propertyId, (prev) => ({
                              ...prev,
                              sort: Number.isFinite(nextSort) ? nextSort : 0
                            }));
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Box>
      </Paper>
    </Stack>
  );
}

