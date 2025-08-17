// app/home/page.tsx
import Link from "next/link";

export const metadata = {
  title: "AI 육아코치 홈",
  description: "인디언밥 AI 육아코치 홈",
};

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">AI 육아코치 홈</h1>
      <p className="mt-3 text-sm text-gray-600">
        챗봇은 <code>/coach</code>에서 계속 사용.
      </p>

      <div className="mt-6 grid gap-3">
        <Link href="/coach" className="rounded-2xl border p-4 hover:bg-gray-50">👉 코치 바로가기</Link>
        <Link href="/news"  className="rounded-2xl border p-4 hover:bg-gray-50">📰 뉴스</Link>
        <Link href="/team"  className="rounded-2xl border p-4 hover:bg-gray-50">👥 팀 게시판</Link>
      </div>
    </main>
  );
}
