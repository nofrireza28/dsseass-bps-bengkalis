import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Kiri: Branding Section */}
      <section className="bg-bps-gradient relative hidden lg:flex flex-col justify-between p-10 text-white overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-bps-accent blur-3xl" />
        </div>

        {/* Logos */}
        <div className="relative z-10">
          <div className=" inline-block bg-transparent p-2">
            <Image
              src="/logos/bps-logo.png"
              alt="Logo BPS"
              width={64}
              height={64}
              style={{ width: "auto", height: "64px" }}
              className="object-contain"
            />
          </div>
        </div>

        {/* Branding text */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-6">
            {/* Logo Bengkalis - besar di samping judul */}
            <div className="bg-transparent p-3 shrink-0">
              <Image
                src="/logos/bengkalis-logo.png"
                alt="Logo Kabupaten Bengkalis"
                width={120}
                height={120}
                style={{ width: "auto", height: "110px" }}
                className="object-contain"
              />
            </div>

            {/* Judul + subtitle */}
            <div className="space-y-2">
              <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
                Sistem Pendukung Keputusan
                <br />
                <span className="text-bps-accent">
                  Pemilihan Pegawai Terbaik
                </span>
              </h1>
              <p className="text-base xl:text-lg text-blue-100">
                Badan Pusat Statistik Kabupaten Bengkalis
              </p>
            </div>
          </div>

          {/* Deskripsi metode SAW */}
          <div className="pt-4 border-t border-white/20">
            <p className="text-sm text-blue-100/80 max-w-2xl leading-relaxed">
              {/* Menggunakan metode{" "}
              <strong>Simple Additive Weighting (SAW)</strong> untuk perhitungan
              ranking pegawai yang objektif, transparan, dan dapat
              dipertanggungjawabkan. */}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-blue-200/70">
          © {new Date().getFullYear()} BPS Kabupaten Bengkalis
        </div>
      </section>

      {/* Kanan: Form Section */}
      <section className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logos (terlihat hanya di mobile) */}
          <div className="lg:hidden flex justify-center gap-3 mb-8">
            <div className="bg-white rounded-full p-1.5 shadow-md border border-gray-200">
              <Image
                src="/logos/bps-logo.png"
                alt="Logo BPS"
                width={48}
                height={48}
                style={{ width: "auto", height: "48px" }}
                className="object-contain"
              />
            </div>
            <div className="bg-white rounded-full p-1.5 shadow-md border border-gray-200">
              <Image
                src="/logos/bengkalis-logo.png"
                alt="Logo Kabupaten Bengkalis"
                width={48}
                height={48}
                style={{ width: "auto", height: "48px" }}
                className="object-contain"
              />
            </div>
          </div>

          <Suspense fallback={<div>Memuat...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
