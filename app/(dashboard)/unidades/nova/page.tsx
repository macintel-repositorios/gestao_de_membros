"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NovaUnidadeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/unidades");
  }, [router]);

  return null;
}
