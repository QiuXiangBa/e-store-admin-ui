import { http, type PageResp } from '../http';

export interface BrandResp {
  id: number;
  name: string;
  picUrl: string;
  sort: number;
  description?: string;
  status: number;
  createTime?: number;
}

export interface CategoryResp {
  id: number;
  parentId: number;
  name: string;
  isLeaf?: boolean;
  picUrl: string;
  bigPicUrl?: string;
  sort: number;
  status: number;
  createTime?: number;
}

export interface PropertyResp {
  id: number;
  name: string;
  propertyType?: number;
  inputType?: number;
  status: number;
  remark?: string;
  createTime?: number;
}

export interface PropertyValueResp {
  id: number;
  propertyId: number;
  name: string;
  status: number;
  remark?: string;
  picUrl?: string;
  createTime?: number;
}

export interface SkuProperty {
  propertyId: number;
  propertyName: string;
  valueId: number;
  valueName: string;
  valuePicUrl?: string;
}

export interface SkuResp {
  id?: number;
  spuId?: number;
  properties?: SkuProperty[];
  price: number;
  marketPrice: number;
  costPrice: number;
  barCode?: string;
  picUrl: string;
  stock: number;
  weight?: number;
  volume?: number;
  subCommissionFirstPrice?: number;
  subCommissionSecondPrice?: number;
  salesCount?: number;
}

export interface SpuResp {
  id: number;
  name: string;
  keyword: string;
  introduction: string;
  description: string;
  barCode?: string;
  categoryId: number;
  brandId: number;
  picUrl: string;
  sliderPicUrls?: string[];
  materialPicUrls?: string[];
  videoUrl?: string;
  sort: number;
  status: number;
  specType: boolean;
  deliveryTypes?: number[];
  deliveryTemplateId?: number;
  recommendHot?: boolean;
  recommendBenefit?: boolean;
  recommendBest?: boolean;
  recommendNew?: boolean;
  recommendGood?: boolean;
  giveIntegral?: number;
  giveCouponTemplateIds?: string;
  subCommissionType?: boolean;
  activityOrders?: string;
  displayProperties?: SpuDisplayProperty[];
  price: number;
  marketPrice: number;
  costPrice: number;
  stock: number;
  salesCount: number;
  virtualSalesCount?: number;
  browseCount: number;
  createTime?: number;
  skus: SkuResp[];
}

export interface SpuCountResp {
  enableCount: number;
  disableCount: number;
  soldOutCount: number;
  alertStockCount: number;
  recycleCount: number;
}

export interface PresignedUploadUrlReq {
  fileName: string;
  contentType: string;
  pathPrefix?: string;
}

export interface PresignedUploadUrlResp {
  objectKey: string;
  uploadUrl: string;
  objectUrl: string;
}

export interface PresignedDownloadUrlReq {
  objectUrl: string;
}

export interface PresignedDownloadUrlResp {
  downloadUrl: string;
}

export interface BrandSaveReq {
  id?: number;
  name: string;
  picUrl: string;
  sort: number;
  description?: string;
  status: number;
}

export interface CategorySaveReq {
  id?: number;
  parentId: number;
  name: string;
  picUrl: string;
  bigPicUrl?: string;
  sort: number;
  status: number;
}

export interface CategorySortBatchItemReq {
  id: number;
  sort: number;
}

export interface PropertySaveReq {
  id?: number;
  name: string;
  propertyType: number;
  inputType?: number;
  status: number;
  remark?: string;
}

export interface PropertyValueSaveReq {
  id?: number;
  propertyId: number;
  name: string;
  status: number;
  remark?: string;
  picUrl?: string;
}

export interface SpuSaveReq {
  id?: number;
  name: string;
  keyword: string;
  introduction: string;
  description: string;
  barCode?: string;
  categoryId: number;
  brandId: number;
  picUrl: string;
  sliderPicUrls?: string[];
  materialPicUrls?: string[];
  videoUrl?: string;
  sort: number;
  specType: boolean;
  deliveryTypes: number[];
  deliveryTemplateId?: number;
  recommendHot?: boolean;
  recommendBenefit?: boolean;
  recommendBest?: boolean;
  recommendNew?: boolean;
  recommendGood?: boolean;
  giveIntegral?: number;
  giveCouponTemplateIds?: string;
  subCommissionType?: boolean;
  activityOrders?: string;
  displayProperties?: SpuDisplayProperty[];
  skus: SkuResp[];
}

export interface SpuDisplayProperty {
  propertyId: number;
  propertyName?: string;
  valueText: string;
  sort?: number;
}

export interface CategoryPropertyResp {
  id: number;
  categoryId: number;
  propertyId: number;
  propertyName: string;
  propertyType: number;
  enabled: boolean;
  required: boolean;
  supportValueImage: boolean;
  valueImageRequired: boolean;
  sort: number;
}

export interface CategoryPropertySaveReq {
  categoryId: number;
  items: Array<{
    propertyId: number;
    enabled: boolean;
    required: boolean;
    supportValueImage: boolean;
    valueImageRequired: boolean;
    sort: number;
  }>;
}

interface IdResp {
  id: number;
}

interface BooleanResp {
  success: boolean;
}

function getPageParams(pageNum: number, pageSize: number, extra?: Record<string, unknown>) {
  return { pageNum, pageSize, ...(extra ?? {}) };
}

export function getBrandPage(pageNum: number, pageSize: number, filters: { name?: string; status?: number }) {
  return http.get<never, PageResp<BrandResp>>('/product/brand/page', {
    params: getPageParams(pageNum, pageSize, filters)
  });
}

export function getBrandSimpleList() {
  return http.get<never, BrandResp[]>('/product/brand/list-all-simple');
}

export function createBrand(data: BrandSaveReq) {
  return http.post<BrandSaveReq, IdResp>('/product/brand/create', data);
}

export function updateBrand(data: BrandSaveReq) {
  return http.put<BrandSaveReq, BooleanResp>('/product/brand/update', data);
}

export function deleteBrand(id: number) {
  return http.delete<never, BooleanResp>('/product/brand/delete', { params: { id } });
}

export function getCategoryList(params?: { name?: string; status?: number; parentId?: number }) {
  return http.get<never, CategoryResp[]>('/product/category/list', { params });
}

export function createCategory(data: CategorySaveReq) {
  return http.post<CategorySaveReq, IdResp>('/product/category/create', data);
}

export function updateCategory(data: CategorySaveReq) {
  return http.put<CategorySaveReq, BooleanResp>('/product/category/update', data);
}

export function updateCategorySortBatch(items: CategorySortBatchItemReq[]) {
  return http.put<{ items: CategorySortBatchItemReq[] }, BooleanResp>('/product/category/update-sort-batch', { items });
}

export function deleteCategory(id: number) {
  return http.delete<never, BooleanResp>('/product/category/delete', { params: { id } });
}

export function getCategoryPropertyList(categoryId: number, propertyType?: number) {
  return http.get<never, CategoryPropertyResp[]>('/product/category/property/list', {
    params: { categoryId, propertyType }
  });
}

export function saveCategoryPropertyBatch(data: CategoryPropertySaveReq) {
  return http.put<CategoryPropertySaveReq, BooleanResp>('/product/category/property/save-batch', data);
}

export function getPresignedUploadUrl(data: PresignedUploadUrlReq) {
  return http.post<PresignedUploadUrlReq, PresignedUploadUrlResp>('/system/file/presigned-upload-url', data);
}

export function getPresignedDownloadUrl(data: PresignedDownloadUrlReq) {
  return http.post<PresignedDownloadUrlReq, PresignedDownloadUrlResp>('/system/file/presigned-download-url', data);
}

export function getPropertyPage(
  pageNum: number,
  pageSize: number,
  filters: { name?: string; status?: number; propertyType?: number }
) {
  return http.get<never, PageResp<PropertyResp>>('/product/property/page', {
    params: getPageParams(pageNum, pageSize, filters)
  });
}

export function getPropertySimpleList() {
  return http.get<never, PropertyResp[]>('/product/property/simple-list');
}

export function getPropertySimpleListByType(propertyType?: number) {
  return http.get<never, PropertyResp[]>('/product/property/simple-list', { params: { propertyType } });
}

export function createProperty(data: PropertySaveReq) {
  return http.post<PropertySaveReq, IdResp>('/product/property/create', data);
}

export function updateProperty(data: PropertySaveReq) {
  return http.put<PropertySaveReq, BooleanResp>('/product/property/update', data);
}

export function deleteProperty(id: number) {
  return http.delete<never, BooleanResp>('/product/property/delete', { params: { id } });
}

export function getPropertyValuePage(
  pageNum: number,
  pageSize: number,
  filters: { propertyId?: number; name?: string; status?: number }
) {
  return http.get<never, PageResp<PropertyValueResp>>('/product/property/value/page', {
    params: getPageParams(pageNum, pageSize, filters)
  });
}

export function getPropertyValueSimpleList(propertyId: number) {
  return http.get<never, PropertyValueResp[]>('/product/property/value/simple-list', { params: { propertyId } });
}

export function createPropertyValue(data: PropertyValueSaveReq) {
  return http.post<PropertyValueSaveReq, IdResp>('/product/property/value/create', data);
}

export function updatePropertyValue(data: PropertyValueSaveReq) {
  return http.put<PropertyValueSaveReq, BooleanResp>('/product/property/value/update', data);
}

export function deletePropertyValue(id: number) {
  return http.delete<never, BooleanResp>('/product/property/value/delete', { params: { id } });
}

export function getSpuCount() {
  return http.get<never, SpuCountResp>('/product/spu/get-count');
}

export function getSpuPage(
  pageNum: number,
  pageSize: number,
  filters: { name?: string; tabType?: number; categoryId?: number; brandId?: number }
) {
  return http.get<never, PageResp<SpuResp>>('/product/spu/page', {
    params: getPageParams(pageNum, pageSize, filters)
  });
}

export function getSpuDetail(id: number) {
  return http.get<never, SpuResp>('/product/spu/get-detail', { params: { id } });
}

export function createSpu(data: SpuSaveReq) {
  return http.post<SpuSaveReq, IdResp>('/product/spu/create', data);
}

export function updateSpu(data: SpuSaveReq) {
  return http.put<SpuSaveReq, BooleanResp>('/product/spu/update', data);
}

export function updateSpuStatus(id: number, status: number) {
  return http.put<{ id: number; status: number }, BooleanResp>('/product/spu/update-status', { id, status });
}

export function deleteSpu(id: number) {
  return http.delete<never, BooleanResp>('/product/spu/delete', { params: { id } });
}

export interface CommentResp {
  id: number;
  userId: number;
  userNickname?: string;
  spuId: number;
  spuName?: string;
  skuId: number;
  visible: boolean;
  scores: number;
  descriptionScores: number;
  benefitScores: number;
  content?: string;
  picUrls?: string;
  replyStatus?: number;
  replyUserId?: number;
  replyContent?: string;
  replyTime?: number;
  createTime?: number;
}

export interface FavoriteResp {
  id: number;
  userId: number;
  spuId: number;
  createTime?: number;
}

export interface BrowseHistoryResp {
  id: number;
  userId: number;
  spuId: number;
  userDeleted: boolean;
  createTime?: number;
}

export interface CommentCreateReq {
  userId: number;
  spuId: number;
  skuId: number;
  userNickname?: string;
  userAvatar?: string;
  anonymous?: boolean;
  orderId?: number;
  orderItemId?: number;
  scores?: number;
  descriptionScores?: number;
  benefitScores?: number;
  content?: string;
  picUrls?: string;
  visible?: boolean;
}

export function getCommentPage(
  pageNum: number,
  pageSize: number,
  filters: { spuId?: number; userId?: number; visible?: boolean }
) {
  return http.get<never, PageResp<CommentResp>>('/product/comment/page', {
    params: getPageParams(pageNum, pageSize, filters)
  });
}

export function createComment(data: CommentCreateReq) {
  return http.post<CommentCreateReq, BooleanResp>('/product/comment/create', data);
}

export function updateCommentVisible(id: number, visible: boolean) {
  return http.put<{ id: number; visible: boolean }, BooleanResp>('/product/comment/update-visible', { id, visible });
}

export function replyComment(id: number, replyContent: string) {
  return http.put<{ id: number; replyContent: string }, BooleanResp>('/product/comment/reply', {
    id,
    replyContent
  });
}

export function getFavoritePage(pageNum: number, pageSize: number, filters: { userId?: number; spuId?: number }) {
  return http.get<never, PageResp<FavoriteResp>>('/product/favorite/page', {
    params: getPageParams(pageNum, pageSize, filters)
  });
}

export function getBrowseHistoryPage(
  pageNum: number,
  pageSize: number,
  filters: { userId?: number; spuId?: number; userDeleted?: boolean }
) {
  return http.get<never, PageResp<BrowseHistoryResp>>('/product/browse-history/page', {
    params: getPageParams(pageNum, pageSize, filters)
  });
}
