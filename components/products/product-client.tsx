"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  Edit3,
  ImagePlus,
  Package,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast";

type Product = {
  id: string;
  workspace_id: string;
  nama: string;
  sku: string | null;
  kategori: string | null;
  harga_jual: number;
  stok_produk: number;
  aktif: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

type ProductClientProps = {
  initialProducts: Product[];
  workspaceId: string;
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export function ProductClient({
  initialProducts,
  workspaceId,
}: ProductClientProps) {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    nama: "",
    sku: "",
    kategori: "",
    harga_jual: "",
    aktif: true,
  });

  const categories = useMemo(() => {
    const values = products
      .map((product) => product.kategori)
      .filter((value): value is string => Boolean(value));

    return ["Semua", ...Array.from(new Set(values))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !keyword ||
        product.nama.toLowerCase().includes(keyword) ||
        (product.sku ?? "").toLowerCase().includes(keyword);

      const matchesCategory =
        categoryFilter === "Semua" || product.kategori === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const activeCount = products.filter((product) => product.aktif).length;
  const inactiveCount = products.length - activeCount;
  const categoryCount = new Set(
    products
      .map((product) => product.kategori)
      .filter((value): value is string => Boolean(value)),
  ).size;

  const openAddModal = () => {
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
    setForm({
      nama: "",
      sku: "",
      kategori: "",
      harga_jual: "",
      aktif: true,
    });
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setImageFile(null);
    setImagePreview(product.image_url ?? null);

    setForm({
      nama: product.nama,
      sku: product.sku ?? "",
      kategori: product.kategori ?? "",
      harga_jual: String(product.harga_jual),
      aktif: product.aktif,
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      showToast({
        type: "warning",
        title: "Format foto tidak didukung",
        message: "Gunakan foto JPG, PNG, atau WebP.",
      });
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast({
        type: "warning",
        title: "Ukuran foto terlalu besar",
        message: "Ukuran foto maksimal 2 MB.",
      });
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadProductImage = async (productId: string, file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${workspaceId}/${productId}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);

    return data.publicUrl;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.nama.trim()) {
      showToast({
        type: "warning",
        title: "Nama produk belum diisi",
        message: "Masukkan nama produk terlebih dahulu.",
      });
      return;
    }

    const harga = Number(form.harga_jual);

    if (!Number.isFinite(harga) || harga < 0) {
      showToast({
        type: "warning",
        title: "Harga jual tidak valid",
        message: "Masukkan harga jual 0 atau lebih.",
      });
      return;
    }

    setSaving(true);

    try {
      if (editingProduct) {
        let imageUrl = editingProduct.image_url;

        if (imageFile) {
          setUploadingImage(true);
          imageUrl = await uploadProductImage(editingProduct.id, imageFile);
          setUploadingImage(false);
        }

        const { data, error } = await supabase
          .from("products")
          .update({
            nama: form.nama.trim(),
            sku: form.sku.trim() || null,
            kategori: form.kategori.trim() || null,
            harga_jual: harga,
            aktif: form.aktif,
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingProduct.id)
          .eq("workspace_id", workspaceId)
          .select("*")
          .single();

        if (error) throw error;

        setProducts((current) =>
          current.map((product) =>
            product.id === editingProduct.id ? data : product,
          ),
        );
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({
            workspace_id: workspaceId,
            nama: form.nama.trim(),
            sku: form.sku.trim() || null,
            kategori: form.kategori.trim() || null,
            harga_jual: harga,
            stok_produk: 0,
            aktif: form.aktif,
            image_url: null,
          })
          .select("*")
          .single();

        if (error) throw error;

        let createdProduct = data;

        if (imageFile) {
          setUploadingImage(true);
          const imageUrl = await uploadProductImage(data.id, imageFile);
          setUploadingImage(false);

          const { data: updatedProduct, error: imageUpdateError } =
            await supabase
              .from("products")
              .update({
                image_url: imageUrl,
                updated_at: new Date().toISOString(),
              })
              .eq("id", data.id)
              .eq("workspace_id", workspaceId)
              .select("*")
              .single();

          if (imageUpdateError) throw imageUpdateError;

          createdProduct = updatedProduct;
        }

        setProducts((current) => [createdProduct, ...current]);
      }

      const isEditing = Boolean(editingProduct);
      const productName = form.nama.trim();

      closeModal();

      showToast({
        type: "success",
        title: isEditing ? "Produk diperbarui" : "Produk ditambahkan",
        message: `${productName} berhasil ${isEditing ? "diperbarui" : "ditambahkan"}${imageFile ? " beserta foto." : "."}`,
      });
    } catch (error) {
      console.error(error);

      showToast({
        type: "error",
        title: uploadingImage
          ? "Gagal mengunggah foto"
          : "Gagal menyimpan produk",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan produk.",
      });
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(`Hapus produk "${product.nama}"?`);

    if (!confirmed) return;

    setDeletingId(product.id);

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id)
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      );

      showToast({
        type: "success",
        title: "Produk dihapus",
        message: `${product.nama} berhasil dihapus.`,
      });
    } catch (error) {
      console.error(error);

      showToast({
        type: "error",
        title: "Gagal menghapus produk",
        message:
          error instanceof Error
            ? error.message
            : "Produk tidak dapat dihapus.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* MOBILE PAGE TITLE */}
      <div className="lg:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          Produk
        </h1>
      </div>

      {/* PRODUCT OVERVIEW */}
      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Product Overview
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-950 sm:text-base">
              Ringkasan katalog
            </h2>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            title="Tambah Produk"
            aria-label="Tambah Produk"
            className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:h-10 sm:px-4"
          >
            <Plus className="h-[18px] w-[18px]" />
            <span>Tambah Produk</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <ProductSummary
            label="Total Produk"
            value={products.length}
            description="Semua produk"
            tone="neutral"
          />
          <ProductSummary
            label="Produk Aktif"
            value={activeCount}
            description="Tersedia di POS"
            tone="success"
          />
          <ProductSummary
            label="Nonaktif"
            value={inactiveCount}
            description="Tidak tersedia di POS"
            tone="muted"
          />
          <ProductSummary
            label="Kategori"
            value={categoryCount}
            description="Kategori terisi"
            tone="info"
          />
        </div>
      </div>

      {/* SEARCH & FILTER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari produk atau SKU..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5 sm:h-11 sm:pl-10 sm:pr-4 sm:text-sm"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter kategori"
            className="h-10 w-[96px] shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 sm:h-11 sm:w-44 sm:px-3 sm:text-sm"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "Semua" ? "Kategori" : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-left font-semibold text-slate-600">
                  Produk
                </th>
                <th className="px-5 py-4 text-left font-semibold text-slate-600">
                  SKU
                </th>
                <th className="px-5 py-4 text-left font-semibold text-slate-600">
                  Kategori
                </th>
                <th className="px-5 py-4 text-left font-semibold text-slate-600">
                  Harga
                </th>
                <th className="px-5 py-4 text-left font-semibold text-slate-600">
                  Status
                </th>
                <th className="px-5 py-4 text-right font-semibold text-slate-600">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">
                      {product.nama}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {product.sku || "-"}
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {product.kategori || "-"}
                  </td>

                  <td className="px-5 py-4 font-medium text-slate-900">
                    {formatRupiah(Number(product.harga_jual))}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        product.aktif
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {product.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/bom?product_id=${product.id}`}
                        className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        title="Kelola BOM"
                      >
                        BOM
                      </Link>

                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(product)}
                        disabled={deletingId === product.id}
                        className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center text-sm text-slate-500">
            Tidak ada produk yang ditemukan.
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">{product.nama}</h3>

                <p className="mt-1 text-xs text-slate-500">
                  {product.sku || "Tanpa SKU"}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  product.aktif
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {product.aktif ? "Aktif" : "Nonaktif"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Kategori</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {product.kategori || "-"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Harga</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {formatRupiah(Number(product.harga_jual))}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Link
                href={`/bom?product_id=${product.id}`}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                BOM
              </Link>

              <button
                type="button"
                onClick={() => openEditModal(product)}
                className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => handleDelete(product)}
                disabled={deletingId === product.id}
                className="rounded-lg border border-red-100 px-2 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            Tidak ada produk yang ditemukan.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:p-4">
          <div className="w-full max-w-[620px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingProduct ? "Edit Produk" : "Tambah Produk"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Isi informasi dasar produk.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-3.5 p-4 sm:space-y-4 sm:p-5"
            >
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Nama Produk
                  </label>

                  <input
                    required
                    value={form.nama}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nama: event.target.value,
                      }))
                    }
                    placeholder="Kopi Susu"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-slate-400 sm:h-11 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    SKU
                  </label>

                  <input
                    value={form.sku}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sku: event.target.value,
                      }))
                    }
                    placeholder="PRD-001"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-slate-400 sm:h-11 sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Kategori
                  </label>

                  <input
                    value={form.kategori}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        kategori: event.target.value,
                      }))
                    }
                    placeholder="Minuman"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-slate-400 sm:h-11 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Harga Jual
                  </label>

                  <input
                    required
                    type="number"
                    min="0"
                    value={form.harga_jual}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        harga_jual: event.target.value,
                      }))
                    }
                    placeholder="18000"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-slate-400 sm:h-11 sm:text-sm"
                  />
                </div>
              </div>

              {/* FOTO PRODUK */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                    <ImagePlus className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 sm:text-sm">
                      Foto Produk
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-slate-500 sm:text-xs">
                      JPG, PNG, atau WebP • maksimal 2 MB
                    </p>
                  </div>

                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                    <Upload className="h-3.5 w-3.5" />
                    {imageFile ? "Ganti Foto" : "Pilih Foto"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      disabled={saving}
                      className="sr-only"
                    />
                  </label>
                </div>

                {imagePreview ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img
                      src={imagePreview}
                      alt={`Preview ${form.nama || "produk"}`}
                      className="h-40 w-full object-cover sm:h-48"
                    />
                  </div>
                ) : (
                  <div className="mt-3 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center sm:h-32">
                    <div>
                      <ImagePlus className="mx-auto h-6 w-6 text-slate-300" />
                      <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">
                        Belum ada foto produk
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 sm:gap-3 sm:p-4">
                <input
                  type="checkbox"
                  checked={form.aktif}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      aktif: event.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />

                <div>
                  <p className="text-xs font-semibold text-slate-900 sm:text-sm">
                    Produk aktif
                  </p>
                  <p className="text-[10px] leading-4 text-slate-500 sm:text-xs">
                    Tersedia di POS
                  </p>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:justify-end sm:gap-3 sm:pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  {uploadingImage
                    ? "Mengunggah foto..."
                    : saving
                      ? "Menyimpan..."
                      : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductSummary({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  tone: "neutral" | "success" | "muted" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "info"
        ? "bg-blue-50 text-blue-600"
        : tone === "muted"
          ? "bg-slate-100 text-slate-500"
          : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold sm:h-9 sm:w-9 sm:rounded-xl ${toneClass}`}
      >
        {value}
      </div>

      <p className="mt-3 text-xs text-slate-500 sm:text-sm">{label}</p>

      <p className="mt-1 text-[10px] leading-4 text-slate-400 sm:text-xs">
        {description}
      </p>
    </div>
  );
}
