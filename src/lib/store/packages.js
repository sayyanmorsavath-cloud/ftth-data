// ════════════════════════════════════════════════════════════════
// store/packages.js
// CRUD hooks ສຳລັບ Packages (ແພັກເກດອິນເຕີເນັດ)
// ════════════════════════════════════════════════════════════════

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ─── Query key ────────────────────────────────────────────────
export const PACKAGES_KEY = "/api/packages";

// ─── DB row → JS object ───────────────────────────────────────
function packageFromDb(row, customerCount = 0) {
  return {
    id:            row.id,
    name:          row.name,
    speed:         row.speed,
    price:         row.price,
    description:   row.description,
    customerCount, // ຈຳນວນລູກຄ້າທີ່ໃຊ້ package ນີ້
  };
}

// ─── ດຶງລາຍຊື່ packages + ຈຳນວນລູກຄ້າ (ຮຽງຕາມລາຄາ) ─────────
export function useListPackages() {
  return useQuery({
    queryKey: [PACKAGES_KEY],
    queryFn: async () => {
      const [pkgsRes, countsRes] = await Promise.all([
        supabase.from("packages").select("*").order("price"),
        supabase.from("customers").select("package_id").not("package_id", "is", null),
      ]);

      if (pkgsRes.error) throw pkgsRes.error;

      // ນັບລູກຄ້າຕໍ່ package
      const counts = {};
      for (const c of countsRes.data ?? []) {
        counts[c.package_id] = (counts[c.package_id] ?? 0) + 1;
      }

      return (pkgsRes.data ?? []).map(p => packageFromDb(p, counts[p.id] ?? 0));
    },
    staleTime: 30_000,
  });
}

// ─── ສ້າງ package ໃໝ່ ────────────────────────────────────────
export function useCreatePackage(options) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }) => {
      const { data: inserted, error } = await supabase
        .from("packages")
        .insert({
          name:        data.name,
          speed:       data.speed,
          price:       data.price,
          description: data.description || null,
        })
        .select()
        .single();
      if (error) throw error;
      return packageFromDb(inserted);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [PACKAGES_KEY] });
      options?.mutation?.onSuccess?.(data);
    },
    onError: options?.mutation?.onError,
  });
}

// ─── ແກ້ໄຂ package ───────────────────────────────────────────
export function useUpdatePackage(options) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await supabase
        .from("packages")
        .update({
          name:        data.name,
          speed:       data.speed,
          price:       data.price,
          description: data.description || null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (!updated) throw new Error("ບໍ່ພົບແພັກເກດ");
      return packageFromDb(updated);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PACKAGES_KEY] });
      options?.mutation?.onSuccess?.();
    },
    onError: options?.mutation?.onError,
  });
}

// ─── ລຶບ package ─────────────────────────────────────────────
export function useDeletePackage(options) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PACKAGES_KEY] });
      options?.mutation?.onSuccess?.();
    },
    onError: options?.mutation?.onError,
  });
}
