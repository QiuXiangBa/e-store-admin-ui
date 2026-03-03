<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span class="title">属性值管理</span>
        <el-button type="primary" @click="openCreateDialog">新增</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-row">
      <el-form-item label="分类（配图规则）">
        <el-select v-model="categoryId" clearable placeholder="未选择分类" style="width: 240px" @change="onCategoryChange">
          <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="属性">
        <el-select
          v-model="propertyId"
          clearable
          placeholder="全部属性"
          style="width: 220px"
          :disabled="fixedPropertyId > 0"
        >
          <el-option v-for="item in properties" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="值名称">
        <el-input v-model="name" clearable placeholder="输入属性值名称" @keyup.enter="onSearch" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="items" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="90" />
      <el-table-column label="属性" min-width="180">
        <template #default="scope">{{ propertyNameMap[scope.row.propertyId] || scope.row.propertyId }}</template>
      </el-table-column>
      <el-table-column prop="name" label="值名称" min-width="160" />
      <el-table-column label="状态" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status === 0 ? 'success' : 'info'">
            {{ scope.row.status === 0 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
      <el-table-column label="创建时间" width="180">
        <template #default="scope">{{ formatTime(scope.row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="scope">
          <el-space>
            <el-button link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
            <el-button link type="danger" @click="onDelete(scope.row.id)">删除</el-button>
          </el-space>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager-row">
      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :page-sizes="[10, 20, 50]"
        @current-change="loadData"
        @size-change="onPageSizeChange"
      />
    </div>
  </el-card>

  <el-dialog v-model="formOpen" :title="editingId ? `编辑属性值 #${editingId}` : '新增属性值'" width="760px" destroy-on-close>
    <el-alert v-if="formErrorMessage" :title="formErrorMessage" type="error" show-icon :closable="false" style="margin-bottom: 12px" />
    <el-form label-width="110px">
      <el-form-item label="属性" required>
        <el-select
          v-model="form.propertyId"
          placeholder="请选择属性"
          style="width: 100%"
          :disabled="fixedPropertyId > 0"
        >
          <el-option v-for="item in properties" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="值名称" required>
        <el-input v-model="form.name" placeholder="请输入属性值名称" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width: 100%">
          <el-option :value="0" label="启用" />
          <el-option :value="1" label="禁用" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="选填" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" @click="onSubmit">{{ editingId ? '保存修改' : '新增属性值' }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  createPropertyValue,
  deletePropertyValue,
  getCategoryList,
  getCategoryPropertyList,
  getPropertyPage,
  getPropertyValuePage,
  type CategoryPropertyResp,
  type CategoryResp,
  type PropertyResp,
  type PropertyValueResp,
  updatePropertyValue
} from '../../api/admin';

interface PropertyValueForm {
  propertyId: number;
  name: string;
  status: number;
  remark: string;
}

const route = useRoute();
const fixedPropertyId = Number(route.query.propertyId || 0);

const EMPTY_FORM: PropertyValueForm = {
  propertyId: fixedPropertyId || 0,
  name: '',
  status: 0,
  remark: ''
};

const PROPERTY_TYPE_SALES = 1;

const loading = ref(false);
const items = ref<PropertyValueResp[]>([]);
const total = ref(0);
const pageNum = ref(1);
const pageSize = ref(10);

const properties = ref<PropertyResp[]>([]);
const categories = ref<CategoryResp[]>([]);
const categoryId = ref<number | undefined>();
const categoryPropertyMap = ref<Record<number, CategoryPropertyResp>>({});

const propertyId = ref<number | undefined>(fixedPropertyId || undefined);
const name = ref('');

const formOpen = ref(false);
const editingId = ref<number | null>(null);
const form = ref<PropertyValueForm>({ ...EMPTY_FORM });
const formErrorMessage = ref('');

const propertyNameMap = computed<Record<number, string>>(() =>
  Object.fromEntries(properties.value.map((item) => [item.id, item.name]))
);

function formatTime(value?: number) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

async function loadBasicData() {
  try {
    const [propertyPage, categoryList] = await Promise.all([getPropertyPage(1, 200, {}), getCategoryList()]);
    properties.value = propertyPage.list || [];
    categories.value = categoryList || [];
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

async function onCategoryChange() {
  if (!categoryId.value) {
    categoryPropertyMap.value = {};
    return;
  }
  try {
    const list = await getCategoryPropertyList(categoryId.value, PROPERTY_TYPE_SALES);
    categoryPropertyMap.value = Object.fromEntries(list.map((item) => [item.propertyId, item]));
  } catch (error) {
    ElMessage.error((error as Error).message);
    categoryPropertyMap.value = {};
  }
}

async function loadData() {
  loading.value = true;
  try {
    const page = await getPropertyValuePage(pageNum.value, pageSize.value, {
      propertyId: fixedPropertyId || propertyId.value,
      name: name.value.trim() || undefined
    });
    items.value = page.list || [];
    total.value = page.total || 0;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  pageNum.value = 1;
  void loadData();
}

function onReset() {
  if (!fixedPropertyId) {
    propertyId.value = undefined;
  }
  categoryId.value = undefined;
  categoryPropertyMap.value = {};
  name.value = '';
  onSearch();
}

function onPageSizeChange() {
  pageNum.value = 1;
  void loadData();
}

function openCreateDialog() {
  editingId.value = null;
  form.value = { ...EMPTY_FORM };
  formErrorMessage.value = '';
  formOpen.value = true;
}

function openEditDialog(item: PropertyValueResp) {
  editingId.value = item.id;
  form.value = {
    propertyId: item.propertyId,
    name: item.name,
    status: item.status,
    remark: item.remark || ''
  };
  formErrorMessage.value = '';
  formOpen.value = true;
}

function closeDialog() {
  formOpen.value = false;
  formErrorMessage.value = '';
}

async function onSubmit() {
  const currentPropertyId = fixedPropertyId || form.value.propertyId;
  if (!currentPropertyId || !form.value.name.trim()) {
    formErrorMessage.value = '请填写完整必填字段';
    return;
  }
  try {
    const payload = {
      ...form.value,
      propertyId: currentPropertyId,
      name: form.value.name.trim()
    };
    if (editingId.value) {
      await updatePropertyValue({ ...payload, id: editingId.value });
    } else {
      await createPropertyValue(payload);
    }
    ElMessage.success(editingId.value ? '属性值已更新' : '属性值已新增');
    formOpen.value = false;
    await loadData();
  } catch (error) {
    formErrorMessage.value = (error as Error).message;
  }
}

async function onDelete(id: number) {
  try {
    await ElMessageBox.confirm(`确认删除属性值 #${id} 吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await deletePropertyValue(id);
    ElMessage.success('删除成功');
    await loadData();
  } catch (_error) {
    // ignore cancel
  }
}

onMounted(async () => {
  await loadBasicData();
  await loadData();
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

.filter-row {
  margin-bottom: 12px;
}

.pager-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

</style>
