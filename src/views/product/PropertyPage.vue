<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span class="title">商品属性</span>
        <el-button type="primary" @click="openCreateDialog">新增</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-row">
      <el-form-item label="属性名称">
        <el-input v-model="filters.name" clearable placeholder="输入属性名称" @keyup.enter="onSearch" />
      </el-form-item>
      <el-form-item label="属性类型">
        <el-select v-model="filters.propertyType" clearable placeholder="全部" style="width: 140px">
          <el-option :value="0" label="展示属性" />
          <el-option :value="1" label="销售属性" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="items" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="90" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column label="属性类型" width="120">
        <template #default="scope">{{ scope.row.propertyType === 0 ? '展示属性' : '销售属性' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status === 0 ? 'success' : 'info'">
            {{ scope.row.status === 0 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
      <el-table-column label="创建时间" width="180">
        <template #default="scope">{{ formatTime(scope.row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="scope">
          <el-space>
            <el-button link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
            <el-button link @click="goPropertyValues(scope.row.id)">属性值</el-button>
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

  <el-dialog v-model="formOpen" :title="editingId ? `编辑属性 #${editingId}` : '新增属性'" width="620px" destroy-on-close>
    <el-alert v-if="formErrorMessage" :title="formErrorMessage" type="error" show-icon :closable="false" style="margin-bottom: 12px" />
    <el-form label-width="100px">
      <el-form-item label="属性名称" required>
        <el-input v-model="form.name" placeholder="请输入属性名称" />
      </el-form-item>
      <el-form-item label="属性类型">
        <el-select v-model="form.propertyType" style="width: 100%">
          <el-option :value="0" label="展示属性" />
          <el-option :value="1" label="销售属性" />
        </el-select>
      </el-form-item>
      <el-form-item label="录入方式">
        <el-select v-model="form.inputType" style="width: 100%">
          <el-option :value="0" label="手工录入" />
          <el-option :value="1" label="选择录入" />
        </el-select>
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
      <el-button type="primary" @click="onSubmit">{{ editingId ? '保存修改' : '新增属性' }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { createProperty, deleteProperty, getPropertyPage, type PropertyResp, updateProperty } from '../../api/admin';

interface PropertyForm {
  name: string;
  propertyType: number;
  inputType: number;
  status: number;
  remark: string;
}

const EMPTY_FORM: PropertyForm = {
  name: '',
  propertyType: 1,
  inputType: 1,
  status: 0,
  remark: ''
};

const router = useRouter();
const loading = ref(false);
const items = ref<PropertyResp[]>([]);
const total = ref(0);
const pageNum = ref(1);
const pageSize = ref(10);
const filters = ref<{ name?: string; propertyType?: number }>({});

const formOpen = ref(false);
const editingId = ref<number | null>(null);
const form = ref<PropertyForm>({ ...EMPTY_FORM });
const formErrorMessage = ref('');

function formatTime(value?: number) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

async function loadData() {
  loading.value = true;
  try {
    const page = await getPropertyPage(pageNum.value, pageSize.value, {
      name: filters.value.name?.trim() || undefined,
      propertyType: filters.value.propertyType
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
  filters.value = {};
  onSearch();
}

function onPageSizeChange() {
  pageNum.value = 1;
  void loadData();
}

function goPropertyValues(propertyId: number) {
  void router.push(`/product/property-values?propertyId=${propertyId}`);
}

function openCreateDialog() {
  editingId.value = null;
  form.value = { ...EMPTY_FORM };
  formErrorMessage.value = '';
  formOpen.value = true;
}

function openEditDialog(item: PropertyResp) {
  editingId.value = item.id;
  form.value = {
    name: item.name,
    propertyType: item.propertyType ?? 1,
    inputType: item.inputType ?? 1,
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
  if (!form.value.name.trim()) {
    formErrorMessage.value = '属性名称不能为空';
    return;
  }
  try {
    const payload = {
      ...form.value,
      name: form.value.name.trim()
    };
    if (editingId.value) {
      await updateProperty({ ...payload, id: editingId.value });
    } else {
      await createProperty(payload);
    }
    ElMessage.success(editingId.value ? '属性已更新' : '属性已新增');
    formOpen.value = false;
    await loadData();
  } catch (error) {
    formErrorMessage.value = (error as Error).message;
  }
}

async function onDelete(id: number) {
  try {
    await ElMessageBox.confirm(`确认删除属性 #${id} 吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await deleteProperty(id);
    ElMessage.success('删除成功');
    await loadData();
  } catch (_error) {
    // ignore cancel
  }
}

onMounted(() => {
  void loadData();
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
