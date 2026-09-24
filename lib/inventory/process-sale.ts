export type BomItem = {
  bahanBakuId: string;
  quantityPerProduct: number;
};

export type SaleItem = {
  productId: string;
  quantity: number;
  bom: BomItem[];
};

export function calculateMaterialRequirements(items: SaleItem[]) {
  const requirements = new Map<string, number>();

  for (const item of items) {
    for (const material of item.bom) {
      requirements.set(
        material.bahanBakuId,
        (requirements.get(material.bahanBakuId) ?? 0) +
          material.quantityPerProduct * item.quantity
      );
    }
  }

  return Object.fromEntries(requirements);
}

// Production implementation should execute validation + stock updates
// inside ONE PostgreSQL transaction/RPC to avoid race conditions.
