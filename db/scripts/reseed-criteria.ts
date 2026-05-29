import { db } from "../index";
import { criteria, subCriteria } from "../schema";

async function reseedCriteria() {
  console.log("🗑️  Menghapus kriteria & sub-kriteria lama...");
  await db.delete(subCriteria); // hapus sub dulu (FK)
  await db.delete(criteria);
  console.log("✅ Data lama dihapus\n");

  console.log("🌱 Menanam struktur kriteria BPS Bengkalis...\n");

  // ============ 1. PROFESIONAL (grup, multi-rater, 25%) ============
  const [pro] = await db
    .insert(criteria)
    .values({
      code: "PRO",
      name: "Profesional",
      description:
        "Kompetensi dan profesionalisme dalam menunjang penyelenggaraan kegiatan statistik",
      weight: "0.2500",
      hasSubCriteria: true,
      scoringMethod: "MULTI_RATER",
      calculationType: null,
      type: "BENEFIT",
      displayOrder: 1,
      isActive: true,
    })
    .returning({ id: criteria.id });

  await db.insert(subCriteria).values([
    {
      criteriaId: pro.id,
      code: "PRO-1",
      name: "Skill dan Knowledge",
      description:
        "Mempunyai skill dan knowledge yang bagus dalam menunjang proses penyelenggaraan kegiatan statistik atau pendukung kegiatan statistik yang efektif dan efisien",
      weight: "0.0500",
      type: "BENEFIT",
      displayOrder: 1,
    },
    {
      criteriaId: pro.id,
      code: "PRO-2",
      name: "Belajar Berkelanjutan dan Inovatif",
      description:
        "Belajar secara berkelanjutan dan mempunyai ide atau gagasan yang kreatif dan inovatif serta implementatif",
      weight: "0.1500",
      type: "BENEFIT",
      displayOrder: 2,
    },
    {
      criteriaId: pro.id,
      code: "PRO-3",
      name: "Sesuai SOP/Pedoman",
      description:
        "Melaksanakan pekerjaan sesuai dengan SOP atau Pedoman baku yang telah ditetapkan",
      weight: "0.0500",
      type: "BENEFIT",
      displayOrder: 3,
    },
  ]);

  // ============ 2. INTEGRITAS (grup, multi-rater, 20%) ============
  const [int] = await db
    .insert(criteria)
    .values({
      code: "INT",
      name: "Integritas",
      description:
        "Konsistensi dan tanggung jawab dalam bersikap dan bertindak",
      weight: "0.2000",
      hasSubCriteria: true,
      scoringMethod: "MULTI_RATER",
      calculationType: null,
      type: "BENEFIT",
      displayOrder: 2,
      isActive: true,
    })
    .returning({ id: criteria.id });

  await db.insert(subCriteria).values([
    {
      criteriaId: int.id,
      code: "INT-1",
      name: "Bertanggung Jawab",
      description:
        "Bertanggung jawab penuh dalam menjalankan amanah yang diemban",
      weight: "0.0500",
      type: "BENEFIT",
      displayOrder: 1,
    },
    {
      criteriaId: int.id,
      code: "INT-2",
      name: "Disiplin dan Konsisten",
      description: "Disiplin jadwal, konsisten dalam sikap dan open mind",
      weight: "0.1000",
      type: "BENEFIT",
      displayOrder: 2,
    },
    {
      criteriaId: int.id,
      code: "INT-3",
      name: "Terukur",
      description: "Setiap langkah terukur dan akuntabel",
      weight: "0.0500",
      type: "BENEFIT",
      displayOrder: 3,
    },
  ]);

  // ============ 3. AMANAH (grup, multi-rater, 20%) ============
  const [ama] = await db
    .insert(criteria)
    .values({
      code: "AMA",
      name: "Amanah",
      description: "Moralitas, dedikasi, dan keadilan dalam menjalankan tugas",
      weight: "0.2000",
      hasSubCriteria: true,
      scoringMethod: "MULTI_RATER",
      calculationType: null,
      type: "BENEFIT",
      displayOrder: 3,
      isActive: true,
    })
    .returning({ id: criteria.id });

  await db.insert(subCriteria).values([
    {
      criteriaId: ama.id,
      code: "AMA-1",
      name: "Mental Spiritual dan Moralitas",
      description:
        "Mempunyai mental spiritual dan berperilaku sesuai prinsip moralitas yang tinggi",
      weight: "0.1000",
      type: "BENEFIT",
      displayOrder: 1,
    },
    {
      criteriaId: ama.id,
      code: "AMA-2",
      name: "Ikhlas dan Dedikatif",
      description:
        "Melaksanakan tugas dengan ikhlas, tanpa pamrih, dan mendedikasikannya untuk kepentingan bangsa dan negara",
      weight: "0.0500",
      type: "BENEFIT",
      displayOrder: 2,
    },
    {
      criteriaId: ama.id,
      code: "AMA-3",
      name: "Adil dan Berkualitas",
      description:
        "Bersikap adil, mengutamakan quality oriented output daripada output oriented",
      weight: "0.0500",
      type: "BENEFIT",
      displayOrder: 3,
    },
  ]);

  // ============ 4. CKP (leaf, manual-input, monthly-average, 20%) ============
  await db.insert(criteria).values({
    code: "CKP",
    name: "Capaian Kinerja Pegawai",
    description:
      "Capaian Kinerja terhadap Target Kinerja, diambil dari rata-rata nilai kinerja bulanan",
    weight: "0.2000",
    hasSubCriteria: false,
    scoringMethod: "MANUAL_INPUT",
    calculationType: "MONTHLY_AVERAGE",
    type: "BENEFIT",
    displayOrder: 4,
    isActive: true,
  });

  // ============ 5. ABSENSI (leaf, manual-input, absence-threshold, 15%) ============
  await db.insert(criteria).values({
    code: "ABS",
    name: "Absensi",
    description:
      "Penilaian kedisiplinan kehadiran berdasarkan total Kekurangan Jam Kerja (KJK) dalam menit",
    weight: "0.1500",
    hasSubCriteria: false,
    scoringMethod: "MANUAL_INPUT",
    calculationType: "ABSENCE_THRESHOLD",
    type: "BENEFIT",
    displayOrder: 5,
    isActive: true,
  });

  console.log("✅ Struktur kriteria BPS berhasil ditanam:");
  console.log("   PRO  Profesional  (25%) → 3 sub-kriteria [MULTI_RATER]");
  console.log("   INT  Integritas   (20%) → 3 sub-kriteria [MULTI_RATER]");
  console.log("   AMA  Amanah       (20%) → 3 sub-kriteria [MULTI_RATER]");
  console.log(
    "   CKP  Capaian Kinerja (20%) → leaf [MANUAL_INPUT / MONTHLY_AVERAGE]",
  );
  console.log(
    "   ABS  Absensi      (15%) → leaf [MANUAL_INPUT / ABSENCE_THRESHOLD]",
  );
  console.log(
    "\n   Total bobot leaf: 5+15+5 + 5+10+5 + 10+5+5 + 20 + 15 = 100% ✓",
  );
}

reseedCriteria()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Gagal:", err);
    process.exit(1);
  });
