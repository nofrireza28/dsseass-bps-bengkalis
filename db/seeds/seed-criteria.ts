import { db } from "../index";
import { criteria, subCriteria } from "../schema";
import { eq } from "drizzle-orm";

interface SubCriteriaInput {
  code: string;
  name: string;
  weight: string;
  displayOrder: number;
  description?: string;
}

interface CriteriaInput {
  code: string;
  name: string;
  weight: string;
  hasSubCriteria: boolean;
  displayOrder: number;
  description?: string;
  subCriteria: SubCriteriaInput[];
}

const CRITERIA_DATA: CriteriaInput[] = [
  {
    code: "K01",
    name: "PROFESIONAL",
    weight: "0.2500",
    hasSubCriteria: true,
    displayOrder: 1,
    description: "Profesional",
    subCriteria: [
      {
        code: "K01-S01",
        name: "Skill dan Knowledge",
        weight: "0.0500",
        displayOrder: 1,
        description:
          "Mempunyai skill dan knowledge yang bagus dalam menunjang proses penyelenggaraan kegiatan statistik atau pendukung kegiatan statistik yang efektif dan efesien",
      },
      {
        code: "K01-S02",
        name: "Kreatif dan Inovatif",
        weight: "0.1500",
        displayOrder: 2,
        description:
          "Belajar secara berkelanjutan dan mempunyai ide atau gagasan yang kreatif dan inovatif serta implementatif",
      },
      {
        code: "K01-S03",
        name: "Kerja dengan SOP",
        weight: "0.0500",
        displayOrder: 3,
        description:
          "Melaksanakan pekerjaan sesuai dengan SOP atau Pedoman baku yang telah ditetapkan",
      },
    ],
  },
  {
    code: "K02",
    name: "INTEGRITAS",
    weight: "0.2000",
    hasSubCriteria: true,
    displayOrder: 2,
    description: "Integritas",
    subCriteria: [
      {
        code: "K02-S01",
        name: "Tanggung Jawab",
        weight: "0.0500",
        displayOrder: 1,
        description:
          "Bertanggung jawab penuh dalam menjalankan amanah yang diemban",
      },
      {
        code: "K02-S02",
        name: "Disiplin dan Konsisten",
        weight: "0.1000",
        displayOrder: 2,
        description:
          "Disiplin jadwal serta konsisten dalam sikap dan open mind",
      },
      {
        code: "K02-S03",
        name: "Langkah Terukur",
        weight: "0.0500",
        displayOrder: 3,
        description: "Setiap langkah terukur dan akuntabel",
      },
    ],
  },
  {
    code: "K03",
    name: "AMANAH",
    weight: "0.2000",
    hasSubCriteria: true,
    displayOrder: 3,
    description: "Amanah",
    subCriteria: [
      {
        code: "K03-S01",
        name: "Mental dan Moralitas",
        weight: "0.1000",
        displayOrder: 1,
        description:
          "Mempunyai mental spiritual dan berperilaku sesuai prinsip moralitas yang tinggi",
      },
      {
        code: "K03-S02",
        name: "Ikhlas dan Berdedikasi",
        weight: "0.0500",
        displayOrder: 2,
        description:
          "Melaksanakan tugas dengan ikhlas serta tanpa pamrih dan mendedikasikannya untuk kepentingan bangsa dan negara",
      },
      {
        code: "K03-S03",
        name: "Adil dan Berorientasi Hasil",
        weight: "0.0500",
        displayOrder: 3,
        description:
          "Bersikap adil dan mengutamakan quality oriented output daripada output oriented",
      },
    ],
  },
  {
    code: "K04",
    name: "CKP",
    weight: "0.2000",
    hasSubCriteria: false,
    displayOrder: 4,
    description: "Capaian Kinerja Pegawai",
    subCriteria: [
      {
        code: "K04-S01",
        name: "Capaian Kinerja Pegawai",
        weight: "1.0000",
        displayOrder: 1,
        description: "Capaian kinerja pegawai",
      },
    ],
  },
  {
    code: "K05",
    name: "ABSENSI",
    weight: "0.1500",
    hasSubCriteria: false,
    displayOrder: 5,
    description: "Absensi",
    subCriteria: [
      {
        code: "K05-S01",
        name: "Absensi",
        weight: "1.0000",
        displayOrder: 1,
        description: "Absensi Pegawai",
      },
    ],
  },
];

export async function seedCriteria() {
  console.log("📌 Seeding criteria & sub-criteria...");

  // Validasi total bobot kriteria
  const totalCriteriaWeight = CRITERIA_DATA.reduce(
    (sum, c) => sum + parseFloat(c.weight),
    0,
  );

  if (Math.abs(totalCriteriaWeight - 1.0) > 0.0001) {
    throw new Error(
      `Total bobot kriteria harus = 1.0, didapat: ${totalCriteriaWeight}`,
    );
  }

  for (const criteriaInput of CRITERIA_DATA) {
    // Validasi total bobot sub-kriteria per kriteria
    /*
    const totalSubWeight = criteriaInput.subCriteria.reduce(
      (sum, sc) => sum + parseFloat(sc.weight),
      0,
    );

    if (Math.abs(totalSubWeight - 1.0) > 0.0001) {
      throw new Error(
        `Total bobot sub-kriteria ${criteriaInput.code} harus = 1.0, didapat: ${totalSubWeight}`,
      );
    }
    */

    // Check apakah criteria sudah ada
    const existing = await db
      .select()
      .from(criteria)
      .where(eq(criteria.code, criteriaInput.code))
      .limit(1);

    let criteriaId: string;

    if (existing.length === 0) {
      // Insert criteria
      const [inserted] = await db
        .insert(criteria)
        .values({
          code: criteriaInput.code,
          name: criteriaInput.name,
          description: criteriaInput.description,
          weight: criteriaInput.weight,
          hasSubCriteria: criteriaInput.hasSubCriteria,
          displayOrder: criteriaInput.displayOrder,
        })
        .returning({ id: criteria.id });

      criteriaId = inserted.id;
      console.log(
        `  ✓ Created criteria: ${criteriaInput.code} - ${criteriaInput.name}`,
      );
    } else {
      criteriaId = existing[0].id;
      console.log(`  ⏭  Criteria already exists: ${criteriaInput.code}`);
      continue;
    }

    // Insert sub-criteria
    for (const subInput of criteriaInput.subCriteria) {
      await db.insert(subCriteria).values({
        criteriaId,
        code: subInput.code,
        name: subInput.name,
        description: subInput.description,
        weight: subInput.weight,
        displayOrder: subInput.displayOrder,
      });
      console.log(`    ↳ Created sub-criteria: ${subInput.code}`);
    }
  }
}
