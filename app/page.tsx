"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to GUI immediately
    router.push("/gui");
  }, [router]);

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    }}>
      <div style={{ color: "white", fontSize: "1.5rem", fontWeight: "600" }}>
        Loading ARCH Freight Calculator...
      </div>
    </div>
  );
}
