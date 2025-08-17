// app/page.tsx
import { redirect } from "next/navigation";

export default function Root() {
  // 루트(/) 들어오면 /home으로 리다이렉트
  redirect("/home");
}
