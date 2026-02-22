<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span class="title">商品分类</span>
        <el-space>
          <el-button @click="goPropertyBinding">属性关联</el-button>
          <el-button :loading="savingSort" @click="saveSortBatch" :disabled="!hasSortChanges">保存排序</el-button>
          <el-button type="primary" @click="openCreateDialog">新增</el-button>
        </el-space>
      </div>
    </template>

    <el-form :inline="true" class="filter-row">
      <el-form-item label="分类名称">
        <el-input v-model="name" clearable placeholder="输入分类名称" @keyup.enter="loadData" />
      </el-form-item>
      <el-form-item label="显示范围">
        <el-switch v-model="onlyTopLevel" active-text="仅看一级" inactive-text="展示全部" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table
      :data="tableData"
      v-loading="loading"
      border
      row-key="id"
      :tree-props="{ children: 'children' }"
      :default-expand-all="false"
    >
      <el-table-column prop="id" label="ID" width="90" />
      <el-table-column label="名称" min-width="200">
        <template #default="scope">
          <span>{{ scope.row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="层级" width="80">
        <template #default="scope">{{ (levelMap[scope.row.id] ?? 0) + 1 }}</template>
      </el-table-column>
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
            style="width: 40px; height: 40px; border-radius: 6px"
            :preview-src-list="getPreviewUrl(scope.row.picUrl) ? [getPreviewUrl(scope.row.picUrl)] : []"
          />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="排序" width="130">
        <template #default="scope">
          <el-input-number
            :model-value="sortDraftMap[scope.row.id] ?? scope.row.sort"
            :min="0"
            :step="1"
            controls-position="right"
            style="width: 110px"
            @change="(value: number | undefined) => patchSortValue(scope.row.id, value)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="scope">
          <el-space>
            <el-button link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
            <el-button link v-if="scope.row.parentId > 0" @click="goSpu(scope.row.id)">查看商品</el-button>
            <el-button link type="danger" @click="onDelete(scope.row.id)">删除</el-button>
          </el-space>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="formOpen" :title="editingId ? `编辑分类 #${editingId}` : '新增分类'" width="760px" destroy-on-close>
    <el-alert v-if="formErrorMessage" :title="formErrorMessage" type="error" show-icon :closable="false" style="margin-bottom: 12px" />
    <el-form label-width="100px">
      <el-form-item label="父级分类">
        <el-select v-model="form.parentId" style="width: 100%">
          <el-option :value="0" label="顶级分类" />
          <el-option v-for="item in rootOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="分类名称" required>
        <el-input v-model="form.name" placeholder="请输入分类名称" />
      </el-form-item>
      <el-form-item label="分类图片" required>
        <div class="upload-row">
          <el-input v-model="form.picUrl" placeholder="上传后自动回填 objectUrl" />
          <el-button :loading="uploadingPic" @click="triggerUpload('picUrl')">上传图片</el-button>
        </div>
      </el-form-item>
      <el-form-item v-if="picPreviewUrl" label="分类图预览">
        <el-image :src="picPreviewUrl" fit="cover" style="width: 96px; height: 96px; border-radius: 8px" :preview-src-list="[picPreviewUrl]" />
      </el-form-item>
      <el-form-item label="大图">
        <div class="upload-row">
          <el-input v-model="form.bigPicUrl" placeholder="上传后自动回填 objectUrl（选填）" />
          <el-button :loading="uploadingBigPic" @click="triggerUpload('bigPicUrl')">上传大图</el-button>
        </div>
      </el-form-item>
      <el-form-item v-if="bigPicPreviewUrl" label="大图预览">
        <el-image :src="bigPicPreviewUrl" fit="cover" style="width: 96px; height: 96px; border-radius: 8px" :preview-src-list="[bigPicPreviewUrl]" />
      </el-form-item>
      <el-form-item label="排序" required>
        <el-input-number v-model="form.sort" :min="0" style="width: 160px" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width: 160px">
          <el-option :value="0" label="启用" />
          <el-option :value="1" label="禁用" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" @click="onSubmit">{{ editingId ? '保存修改' : '新增分类' }}</el-button>
    </template>
  </el-dialog>

  <input ref="fileInputRef" type="file" accept="image/*" style="display: none" @change="handleSelectFile" />
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  createCategory,
  deleteCategory,
  getCategoryList,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  type CategoryResp,
  updateCategory,
  updateCategorySortBatch
} from '../../api/admin';

interface CategoryForm {
  parentId: number;
  name: string;
  picUrl: string;
  bigPicUrl: string;
  sort: number;
  status: number;
}

type TreeNode = CategoryResp & { children: TreeNode[] };
const EMPTY_FORM: CategoryForm = {
  parentId: 0,
  name: '',
  picUrl: '',
  bigPicUrl: '',
  sort: 0,
  status: 0
};

const router = useRouter();
const loading = ref(false);
const savingSort = ref(false);
const list = ref<CategoryResp[]>([]);
const name = ref('');
const onlyTopLevel = ref(false);
const sortDraftMap = ref<Record<number, number>>({});

const formOpen = ref(false);
const editingId = ref<number | null>(null);
const form = ref<CategoryForm>({ ...EMPTY_FORM });
const formErrorMessage = ref('');
const uploadingPic = ref(false);
const uploadingBigPic = ref(false);
const uploadTarget = ref<'picUrl' | 'bigPicUrl'>('picUrl');
const fileInputRef = ref<HTMLInputElement | null>(null);
const previewUrlMap = ref<Record<string, string>>({});

const rootOptions = computed(() => list.value.filter((item) => item.parentId === 0));
const picPreviewUrl = computed(() => getPreviewUrl(form.value.picUrl));
const bigPicPreviewUrl = computed(() => getPreviewUrl(form.value.bigPicUrl));

function buildTree(items: CategoryResp[]) {
  const map = new Map<number, TreeNode>();
  items.forEach((item) => map.set(item.id, { ...item, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parentId === 0) {
      roots.push(node);
      return;
    }
    const parent = map.get(node.parentId);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function buildLevelMap(nodes: TreeNode[], level = 0, map: Record<number, number> = {}) {
  nodes.forEach((node) => {
    map[node.id] = level;
    if (node.children?.length) {
      buildLevelMap(node.children, level + 1, map);
    }
  });
  return map;
}

const treeData = computed(() => buildTree(list.value));
const levelMap = computed(() => buildLevelMap(treeData.value));
const tableData = computed(() =>
  onlyTopLevel.value
    ? treeData.value.map((item) => ({ ...item, children: [] }))
    : treeData.value
);

const hasSortChanges = computed(() =>
  list.value.some((item) => sortDraftMap.value[item.id] !== undefined && sortDraftMap.value[item.id] !== item.sort)
);

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

async function loadData() {
  loading.value = true;
  try {
    const resp = await getCategoryList({ name: name.value.trim() || undefined });
    list.value = resp || [];
    sortDraftMap.value = Object.fromEntries((resp || []).map((item) => [item.id, item.sort]));
    await loadPreviewUrls((resp || []).flatMap((item) => [item.picUrl || '', item.bigPicUrl || '']));
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  void loadData();
}

function onReset() {
  name.value = '';
  onlyTopLevel.value = false;
  void loadData();
}

function goPropertyBinding() {
  void router.push('/product/category-property');
}

function goSpu(categoryId: number) {
  void router.push(`/product/spu?categoryId=${categoryId}`);
}

function patchSortValue(id: number, value: number | undefined) {
  sortDraftMap.value[id] = Number.isFinite(value as number) ? Number(value) : 0;
}

async function saveSortBatch() {
  const changed = list.value
    .filter((item) => sortDraftMap.value[item.id] !== undefined && sortDraftMap.value[item.id] !== item.sort)
    .map((item) => ({ id: item.id, sort: Number(sortDraftMap.value[item.id]) }));

  if (!changed.length) {
    ElMessage.warning('没有需要保存的排序变更');
    return;
  }
  if (changed.some((item) => Number.isNaN(item.sort) || item.sort < 0)) {
    ElMessage.error('排序必须为大于等于 0 的数字');
    return;
  }

  savingSort.value = true;
  try {
    await updateCategorySortBatch(changed);
    ElMessage.success('排序保存成功');
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    savingSort.value = false;
  }
}

function openCreateDialog() {
  editingId.value = null;
  form.value = { ...EMPTY_FORM };
  formErrorMessage.value = '';
  formOpen.value = true;
}

function openEditDialog(item: CategoryResp) {
  editingId.value = item.id;
  form.value = {
    parentId: item.parentId,
    name: item.name,
    picUrl: item.picUrl,
    bigPicUrl: item.bigPicUrl || '',
    sort: item.sort,
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
      picUrl: form.value.picUrl.trim(),
      bigPicUrl: form.value.bigPicUrl.trim() || undefined
    };
    if (editingId.value) {
      await updateCategory({ ...payload, id: editingId.value });
    } else {
      await createCategory(payload);
    }
    ElMessage.success(editingId.value ? '分类已更新' : '分类已新增');
    formOpen.value = false;
    await loadData();
  } catch (error) {
    formErrorMessage.value = (error as Error).message;
  }
}

async function onDelete(id: number) {
  try {
    await ElMessageBox.confirm(`确认删除分类 #${id} 吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await deleteCategory(id);
    ElMessage.success('删除成功');
    await loadData();
  } catch (_error) {
    // ignore cancel
  }
}

function triggerUpload(target: 'picUrl' | 'bigPicUrl') {
  uploadTarget.value = target;
  fileInputRef.value?.click();
}

async function handleSelectFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  input.value = '';
  if (uploadTarget.value === 'picUrl') {
    uploadingPic.value = true;
  } else {
    uploadingBigPic.value = true;
  }
  try {
    const sign = await getPresignedUploadUrl({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      pathPrefix: 'product/category'
    });
    await axios.put(sign.uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'application/octet-stream' }
    });
    form.value[uploadTarget.value] = sign.objectUrl;
    await loadPreviewUrls([sign.objectUrl]);
    ElMessage.success('上传成功');
  } catch (error) {
    formErrorMessage.value = `图片上传失败：${(error as Error).message}`;
  } finally {
    if (uploadTarget.value === 'picUrl') {
      uploadingPic.value = false;
    } else {
      uploadingBigPic.value = false;
    }
  }
}

watch(
  () => [form.value.picUrl, form.value.bigPicUrl],
  (values) => {
    void loadPreviewUrls(values.filter(Boolean));
  }
);

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

.upload-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  width: 100%;
}
</style>
