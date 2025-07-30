import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="bg-[#222222] px-6 py-4 flex space-x-8 text-lg font-semibold">
      <Link href="/news" className="hover:text-[#3EB6F1]">
        NEWS
      </Link>
      <Link href="/team" className="hover:text-[#3EB6F1]">
        TEAM
      </Link>
    </nav>
  );
}
