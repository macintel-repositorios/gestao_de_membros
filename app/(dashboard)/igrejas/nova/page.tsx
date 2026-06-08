"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NovaIgrejaRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/igreja");
  }, [router]);

  return null;
}
