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
      <el-table-column label="图片" width="96">
        <template #default="scope">
          <el-image
            v-if="scope.row.picUrl"
            :src="getPreviewUrl(scope.row.picUrl)"
            fit="cover"
            style="width: 36px; height: 36px; border-radius: 6px"
            :preview-src-list="getPreviewUrl(scope.row.picUrl) ? [getPreviewUrl(scope.row.picUrl)] : []"
          />
          <span v-else>-</span>
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
      <el-form-item v-if="supportsImage" :label="valueImageRequired ? '图片（必填）' : '图片'">
        <div class="upload-row">
          <el-input v-model="form.picUrl" placeholder="上传后自动回填 objectUrl" />
          <el-button :loading="uploadingPic" @click="triggerUpload">上传图片</el-button>
        </div>
      </el-form-item>
      <el-form-item v-if="supportsImage && picPreviewUrl" label="预览">
        <el-image :src="picPreviewUrl" fit="cover" style="width: 96px; height: 96px; border-radius: 8px" :preview-src-list="[picPreviewUrl]" />
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

  <input ref="fileInputRef" type="file" accept="image/*" style="display: none" @change="handleSelectFile" />
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  createPropertyValue,
  deletePropertyValue,
  getCategoryList,
  getCategoryPropertyList,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
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
  picUrl: string;
}

const route = useRoute();
const fixedPropertyId = Number(route.query.propertyId || 0);

const EMPTY_FORM: PropertyValueForm = {
  propertyId: fixedPropertyId || 0,
  name: '',
  status: 0,
  remark: '',
  picUrl: ''
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

const uploadingPic = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const previewUrlMap = ref<Record<string, string>>({});

const propertyNameMap = computed<Record<number, string>>(() =>
  Object.fromEntries(properties.value.map((item) => [item.id, item.name]))
);

const selectedBinding = computed(() => {
  const selectedPropertyId = fixedPropertyId || form.value.propertyId;
  if (!selectedPropertyId) {
    return undefined;
  }
  return categoryPropertyMap.value[selectedPropertyId];
});

const supportsImage = computed(() => Boolean(selectedBinding.value?.supportValueImage));
const valueImageRequired = computed(() => Boolean(selectedBinding.value?.valueImageRequired));
const picPreviewUrl = computed(() => getPreviewUrl(form.value.picUrl));

function formatTime(value?: number) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

function getPreviewUrl(objectUrl?: string) {
  const key = objectUrl?.trim();
  if (!key) {
    return '';
  }
  return previewUrlMap.value[key] || '';
}

async function loadPreviewUrls(objectUrls: string[]) {
  const unique = Array.from(new Set(objectUrls.map((item) => item.trim()).filter(Boolean)));
  const pending = unique.filter((item) => !previewUrlMap.value[item]);
  if (!pending.length) {
    return;
  }
  const entries = await Promise.all(
    pending.map(async (objectUrl) => {
      try {
        const resp = await getPresignedDownloadUrl({ objectUrl });
        return [objectUrl, resp.downloadUrl] as const;
      } catch (_error) {
        return [objectUrl, ''] as const;
      }
    })
  );
  previewUrlMap.value = Object.fromEntries([...Object.entries(previewUrlMap.value), ...entries]);
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
    await loadPreviewUrls(items.value.map((item) => item.picUrl || ''));
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
    remark: item.remark || '',
    picUrl: item.picUrl || ''
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
  if (valueImageRequired.value && !form.value.picUrl.trim()) {
    formErrorMessage.value = '当前类目要求规格值图片必填';
    return;
  }

  try {
    const payload = {
      ...form.value,
      propertyId: currentPropertyId,
      name: form.value.name.trim(),
      picUrl: supportsImage.value ? form.value.picUrl.trim() : ''
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

function triggerUpload() {
  fileInputRef.value?.click();
}

async function handleSelectFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  input.value = '';
  uploadingPic.value = true;
  try {
    const sign = await getPresignedUploadUrl({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      pathPrefix: 'product/property/value'
    });
    await axios.put(sign.uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'application/octet-stream' }
    });
    form.value.picUrl = sign.objectUrl;
    await loadPreviewUrls([sign.objectUrl]);
    ElMessage.success('上传成功');
  } catch (error) {
    formErrorMessage.value = `图片上传失败：${(error as Error).message}`;
  } finally {
    uploadingPic.value = false;
  }
}

watch(
  () => form.value.picUrl,
  (value) => {
    if (value?.trim()) {
      void loadPreviewUrls([value]);
    }
  }
);

watch(
  () => form.value.propertyId,
  () => {
    if (!supportsImage.value) {
      form.value.picUrl = '';
    }
  }
);

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

.upload-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  width: 100%;
}
</style>
