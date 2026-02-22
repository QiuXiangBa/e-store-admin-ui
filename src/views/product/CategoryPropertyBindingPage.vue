<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span class="title">类目属性绑定</span>
        <el-button type="primary" :loading="saving" :disabled="!categoryId" @click="onSave">
          保存绑定
        </el-button>
      </div>
    </template>

    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      show-icon
      :closable="false"
      style="margin-bottom: 12px"
    />
    <el-alert
      v-if="successMessage"
      :title="successMessage"
      type="success"
      show-icon
      :closable="false"
      style="margin-bottom: 12px"
    />

    <el-card shadow="never" style="margin-bottom: 12px">
      <el-space wrap>
        <el-select
          v-model="categoryId"
          filterable
          clearable
          placeholder="请选择商品分类"
          style="width: 320px"
          @change="onCategoryChange"
        >
          <el-option v-for="item in categories" :key="item.id" :label="`${item.name}（ID:${item.id}）`" :value="item.id" />
        </el-select>
        <el-tag type="primary">已绑定 {{ selectedCount }} 个属性</el-tag>
        <el-tag>{{ activeType === PROPERTY_TYPE_SALES ? '当前：销售属性' : '当前：展示属性' }}</el-tag>
      </el-space>
    </el-card>

    <el-tabs v-model="activeType" @tab-change="onTabChange">
      <el-tab-pane :name="PROPERTY_TYPE_SALES" label="销售属性" />
      <el-tab-pane :name="PROPERTY_TYPE_DISPLAY" label="展示属性" />
    </el-tabs>

    <div class="toolbar-row">
      <span class="hint">勾选后即加入当前分类，可设置启用、必填、配图能力和排序</span>
      <el-space>
        <el-button size="small" @click="selectAllActive" :disabled="!activeRows.length">当前类型全选</el-button>
        <el-button size="small" @click="clearAllActive" :disabled="!activeRows.length">当前类型清空</el-button>
      </el-space>
    </div>

    <el-table :data="activeRows" v-loading="loading" border>
      <el-table-column label="绑定" width="72" align="center">
        <template #default="scope">
          <el-checkbox
            :model-value="scope.row.selected"
            @change="(value: string | number | boolean) => onSelectedChange(scope.row.propertyId, Boolean(value))"
          />
        </template>
      </el-table-column>
      <el-table-column prop="propertyId" label="属性ID" width="100" />
      <el-table-column prop="propertyName" label="属性名称" min-width="200" />
      <el-table-column label="启用" width="90" align="center">
        <template #default="scope">
          <el-switch
            :model-value="scope.row.enabled"
            :disabled="!scope.row.selected"
            @change="(value: string | number | boolean) => onEnabledChange(scope.row.propertyId, Boolean(value))"
          />
        </template>
      </el-table-column>
      <el-table-column label="必填" width="90" align="center">
        <template #default="scope">
          <el-switch
            :model-value="scope.row.required"
            :disabled="!scope.row.selected || !scope.row.enabled"
            @change="(value: string | number | boolean) => patchRow(scope.row.propertyId, { required: Boolean(value) })"
          />
        </template>
      </el-table-column>
      <el-table-column label="支持规格值配图" width="130" align="center">
        <template #default="scope">
          <el-switch
            :model-value="scope.row.supportValueImage"
            :disabled="!scope.row.selected || !scope.row.enabled || scope.row.propertyType !== PROPERTY_TYPE_SALES"
            @change="(value: string | number | boolean) => onSupportValueImageChange(scope.row.propertyId, Boolean(value))"
          />
        </template>
      </el-table-column>
      <el-table-column label="规格值图片必填" width="130" align="center">
        <template #default="scope">
          <el-switch
            :model-value="scope.row.valueImageRequired"
            :disabled="
              !scope.row.selected ||
              !scope.row.enabled ||
              scope.row.propertyType !== PROPERTY_TYPE_SALES ||
              !scope.row.supportValueImage
            "
            @change="(value: string | number | boolean) => patchRow(scope.row.propertyId, { valueImageRequired: Boolean(value) })"
          />
        </template>
      </el-table-column>
      <el-table-column label="排序" width="120">
        <template #default="scope">
          <el-input-number
            :model-value="scope.row.sort"
            :min="0"
            :step="1"
            controls-position="right"
            style="width: 100px"
            @change="(value: number | undefined) => patchRow(scope.row.propertyId, { sort: Number(value || 0) })"
          />
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && !activeRows.length" :description="categoryId ? '该类型暂无可用属性' : '请先选择分类'" />
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
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

type PropertyType = 0 | 1;

interface BindingRow {
  propertyId: number;
  propertyName: string;
  propertyType: PropertyType;
  selected: boolean;
  enabled: boolean;
  required: boolean;
  supportValueImage: boolean;
  valueImageRequired: boolean;
  sort: number;
}

const categories = ref<CategoryResp[]>([]);
const categoryId = ref<number | undefined>();
const activeType = ref<PropertyType>(PROPERTY_TYPE_SALES);
const rowsByType = ref<Record<PropertyType, BindingRow[]>>({
  [PROPERTY_TYPE_DISPLAY]: [],
  [PROPERTY_TYPE_SALES]: []
});
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const activeRows = computed(() => rowsByType.value[activeType.value]);

const selectedCount = computed(() => {
  const displayCount = rowsByType.value[PROPERTY_TYPE_DISPLAY].filter((item) => item.selected).length;
  const salesCount = rowsByType.value[PROPERTY_TYPE_SALES].filter((item) => item.selected).length;
  return displayCount + salesCount;
});

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
        supportValueImage: bound ? bound.supportValueImage : false,
        valueImageRequired: bound ? bound.valueImageRequired : false,
        sort: bound ? bound.sort : (index + 1) * 10
      };
    })
    .sort((a, b) => a.sort - b.sort || a.propertyId - b.propertyId);
}

function patchRows(type: PropertyType, updater: (item: BindingRow) => BindingRow) {
  rowsByType.value[type] = rowsByType.value[type].map((item) => updater(item));
}

function patchRow(propertyId: number, patch: Partial<BindingRow>) {
  const type = activeType.value;
  rowsByType.value[type] = rowsByType.value[type].map((item) =>
    item.propertyId === propertyId ? { ...item, ...patch } : item
  );
}

function onSelectedChange(propertyId: number, selected: boolean) {
  patchRows(activeType.value, (row) => {
    if (row.propertyId !== propertyId) {
      return row;
    }
    if (!selected) {
      return {
        ...row,
        selected: false,
        required: false,
        supportValueImage: false,
        valueImageRequired: false
      };
    }
    return {
      ...row,
      selected: true,
      enabled: true
    };
  });
}

function onEnabledChange(propertyId: number, enabled: boolean) {
  patchRows(activeType.value, (row) => {
    if (row.propertyId !== propertyId) {
      return row;
    }
    if (!enabled) {
      return {
        ...row,
        enabled: false,
        required: false,
        supportValueImage: false,
        valueImageRequired: false
      };
    }
    return {
      ...row,
      enabled: true
    };
  });
}

function onSupportValueImageChange(propertyId: number, supportValueImage: boolean) {
  patchRows(activeType.value, (row) => {
    if (row.propertyId !== propertyId) {
      return row;
    }
    return {
      ...row,
      supportValueImage,
      valueImageRequired: supportValueImage ? row.valueImageRequired : false
    };
  });
}

function selectAllActive() {
  patchRows(activeType.value, (row) => ({ ...row, selected: true, enabled: true }));
}

function clearAllActive() {
  patchRows(activeType.value, (row) => ({
    ...row,
    selected: false,
    required: false,
    supportValueImage: false,
    valueImageRequired: false
  }));
}

function onTabChange(name: string | number) {
  activeType.value = Number(name) === PROPERTY_TYPE_DISPLAY ? PROPERTY_TYPE_DISPLAY : PROPERTY_TYPE_SALES;
}

async function loadCategories() {
  const list = await getCategoryList();
  categories.value = list || [];
}

async function loadBindingRows(targetCategoryId: number) {
  loading.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const [displayPropertyList, salesPropertyList, displayBoundList, salesBoundList] = await Promise.all([
      getPropertySimpleListByType(PROPERTY_TYPE_DISPLAY),
      getPropertySimpleListByType(PROPERTY_TYPE_SALES),
      getCategoryPropertyList(targetCategoryId, PROPERTY_TYPE_DISPLAY),
      getCategoryPropertyList(targetCategoryId, PROPERTY_TYPE_SALES)
    ]);

    rowsByType.value = {
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
    };
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    loading.value = false;
  }
}

async function onCategoryChange() {
  if (!categoryId.value) {
    rowsByType.value = {
      [PROPERTY_TYPE_DISPLAY]: [],
      [PROPERTY_TYPE_SALES]: []
    };
    return;
  }
  await loadBindingRows(categoryId.value);
}

async function onSave() {
  if (!categoryId.value) {
    errorMessage.value = '请先选择商品分类';
    return;
  }

  const selectedRows = [...rowsByType.value[PROPERTY_TYPE_DISPLAY], ...rowsByType.value[PROPERTY_TYPE_SALES]].filter(
    (item) => item.selected
  );
  if (!selectedRows.length) {
    errorMessage.value = '请至少选择一个属性进行绑定';
    return;
  }
  if (selectedRows.some((item) => !Number.isInteger(item.sort) || item.sort < 0)) {
    errorMessage.value = '排序必须为大于等于 0 的整数';
    return;
  }

  saving.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    await saveCategoryPropertyBatch({
      categoryId: categoryId.value,
      items: selectedRows
        .sort((a, b) => a.sort - b.sort || a.propertyId - b.propertyId)
        .map((item) => ({
          propertyId: item.propertyId,
          enabled: item.enabled,
          required: item.required,
          supportValueImage: item.supportValueImage,
          valueImageRequired: item.valueImageRequired,
          sort: item.sort
        }))
    });
    successMessage.value = `已保存：${selectedRows.length} 个属性绑定`;
    await loadBindingRows(categoryId.value);
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadCategories().catch((error) => {
    ElMessage.error((error as Error).message);
  });
});
</script>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 22px;
  font-weight: 700;
}

.toolbar-row {
  margin: 8px 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hint {
  font-size: 13px;
  color: #64748b;
}
</style>
