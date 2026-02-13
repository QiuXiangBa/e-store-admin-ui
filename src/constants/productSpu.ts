export const PRODUCT_SPU_STATUS = {
  RECYCLE: -1,
  ENABLE: 0,
  DISABLE: 1
} as const;

export type ProductSpuStatus = (typeof PRODUCT_SPU_STATUS)[keyof typeof PRODUCT_SPU_STATUS];

export function getProductSpuStatusLabel(status: number): string {
  if (status === PRODUCT_SPU_STATUS.ENABLE) {
    return '上架';
  }
  if (status === PRODUCT_SPU_STATUS.DISABLE) {
    return '下架';
  }
  return '回收站';
}

