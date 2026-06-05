"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redireciona para a página de gerenciamento de igrejas
export default function IgrejasRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/igreja");
  }, [router]);

  return null;
}
