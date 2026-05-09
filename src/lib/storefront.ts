import type { StorefrontProduct } from "@/lib/storefrontData";

export const productFallbackImage =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=85";

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function productSlug(product: Pick<StorefrontProduct, "name" | "code" | "id">) {
  return `${slugify(product.name)}-${slugify(product.code || product.id)}`;
}
