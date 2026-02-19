export const PRODUCT_SPU_STATUS = {
  RECYCLE: -1,
  ENABLE: 1,
  DISABLE: 0
} as const;

export type ProductSpuStatus = (typeof PRODUCT_SPU_STATUS)[keyof typeof PRODUCT_SPU_STATUS];

export const PRODUCT_SPU_TAB = {
  FOR_SALE: 0,
  IN_WAREHOUSE: 1,
  SOLD_OUT: 2,
  ALERT_STOCK: 3,
  RECYCLE_BIN: 4
} as const;

export type ProductSpuTab = (typeof PRODUCT_SPU_TAB)[keyof typeof PRODUCT_SPU_TAB];

export function getProductSpuStatusLabel(status: number): string {
  if (status === PRODUCT_SPU_STATUS.ENABLE) {
    return '上架';
  }
  if (status === PRODUCT_SPU_STATUS.DISABLE) {
    return '下架';
  }
  return '回收站';
}
