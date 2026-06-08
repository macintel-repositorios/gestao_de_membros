"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditarIgrejaRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/igreja");
  }, [router]);

  return null;
}
