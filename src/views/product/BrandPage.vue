<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span class="title">商品品牌</span>
        <el-button type="primary" @click="openCreateDialog">新增</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-row">
      <el-form-item label="品牌名称">
        <el-input v-model="filters.name" placeholder="输入品牌名" clearable @keyup.enter="onSearch" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 140px">
          <el-option :value="0" label="启用" />
          <el-option :value="1" label="禁用" />
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
      <el-table-column label="状态" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status === 0 ? 'success' : 'info'">
            {{ scope.row.status === 0 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="100" />
      <el-table-column label="图片" width="96">
        <template #default="scope">
          <el-image
            v-if="scope.row.picUrl"
            :src="getPreviewUrl(scope.row.picUrl)"
            fit="cover"
            style="width: 40px; height: 40px; border-radius: 6px"
            :preview-src-list="getPreviewUrl(scope.row.picUrl) ? [getPreviewUrl(scope.row.picUrl)] : []"
          />
          <span v-else>-</span>
        </template>
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

  <el-dialog v-model="formOpen" :title="editingId ? `编辑品牌 #${editingId}` : '新增品牌'" width="720px" destroy-on-close>
    <el-alert v-if="formErrorMessage" :title="formErrorMessage" type="error" show-icon :closable="false" style="margin-bottom: 12px" />
    <el-form label-width="100px">
      <el-form-item label="品牌名称" required>
        <el-input v-model="form.name" placeholder="请输入品牌名称" />
      </el-form-item>
      <el-form-item label="图片" required>
        <div class="upload-row">
          <el-input v-model="form.picUrl" placeholder="上传后自动回填 objectUrl" />
          <el-button :loading="uploadingPic" @click="triggerUpload">上传图片</el-button>
        </div>
      </el-form-item>
      <el-form-item v-if="picPreviewUrl" label="预览">
        <el-image :src="picPreviewUrl" fit="cover" style="width: 96px; height: 96px; border-radius: 8px" :preview-src-list="[picPreviewUrl]" />
      </el-form-item>
      <el-form-item label="排序" required>
        <el-input-number v-model="form.sort" :min="0" :step="1" style="width: 160px" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width: 160px">
          <el-option :value="0" label="启用" />
          <el-option :value="1" label="禁用" />
        </el-select>
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.description" type="textarea" :rows="3" placeholder="选填" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" @click="onSubmit">{{ editingId ? '保存修改' : '新增品牌' }}</el-button>
    </template>
  </el-dialog>

  <input ref="fileInputRef" type="file" accept="image/*" style="display: none" @change="handleSelectFile" />
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  createBrand,
  deleteBrand,
  getBrandPage,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  type BrandResp,
  updateBrand
} from '../../api/admin';

interface BrandForm {
  name: string;
  picUrl: string;
  sort: number;
  description: string;
  status: number;
}

const DEFAULT_FORM: BrandForm = {
  name: '',
  picUrl: '',
  sort: 0,
  description: '',
  status: 0
};

const loading = ref(false);
const items = ref<BrandResp[]>([]);
const total = ref(0);
const pageNum = ref(1);
const pageSize = ref(10);
const filters = ref<{ name?: string; status?: number }>({});

const formOpen = ref(false);
const editingId = ref<number | null>(null);
const form = ref<BrandForm>({ ...DEFAULT_FORM });
const formErrorMessage = ref('');
const uploadingPic = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const previewUrlMap = ref<Record<string, string>>({});

const picPreviewUrl = computed(() => getPreviewUrl(form.value.picUrl));

function getPreviewUrl(objectUrl?: string) {
  const key = objectUrl?.trim();
  if (!key) {
    return '';
  }
  return previewUrlMap.value[key] || '';
}

async function loadPreviewUrls(objectUrls: string[]) {
  const uniqueObjectUrls = Array.from(new Set(objectUrls.map((item) => item.trim()).filter(Boolean)));
  const pending = uniqueObjectUrls.filter((item) => !previewUrlMap.value[item]);
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

async function loadData() {
  loading.value = true;
  try {
    const page = await getBrandPage(pageNum.value, pageSize.value, {
      name: filters.value.name?.trim() || undefined,
      status: filters.value.status
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
  filters.value = {};
  onSearch();
}

function onPageSizeChange() {
  pageNum.value = 1;
  void loadData();
}

function openCreateDialog() {
  editingId.value = null;
  form.value = { ...DEFAULT_FORM };
  formErrorMessage.value = '';
  formOpen.value = true;
}

function openEditDialog(item: BrandResp) {
  editingId.value = item.id;
  form.value = {
    name: item.name,
    picUrl: item.picUrl,
    sort: item.sort,
    description: item.description || '',
    status: item.status
  };
  formErrorMessage.value = '';
  formOpen.value = true;
}

function closeDialog() {
  formOpen.value = false;
  formErrorMessage.value = '';
}

async function onSubmit() {
  if (!form.value.name.trim() || !form.value.picUrl.trim()) {
    formErrorMessage.value = '请填写完整必填字段';
    return;
  }
  try {
    const payload = {
      ...form.value,
      name: form.value.name.trim(),
      picUrl: form.value.picUrl.trim()
    };
    if (editingId.value) {
      await updateBrand({ ...payload, id: editingId.value });
    } else {
      await createBrand(payload);
    }
    ElMessage.success(editingId.value ? '品牌已更新' : '品牌已新增');
    formOpen.value = false;
    await loadData();
  } catch (error) {
    formErrorMessage.value = (error as Error).message;
  }
}

async function onDelete(id: number) {
  try {
    await ElMessageBox.confirm(`确认删除品牌 #${id} 吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await deleteBrand(id);
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
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) {
    return;
  }
  target.value = '';
  uploadingPic.value = true;
  formErrorMessage.value = '';
  try {
    const sign = await getPresignedUploadUrl({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      pathPrefix: 'product/brand'
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

onMounted(() => {
  void loadData();
});
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
