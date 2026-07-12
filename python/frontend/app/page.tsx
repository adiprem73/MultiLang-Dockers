import Notebook from "@/components/Notebook";

export default function Home() {
  // Notebook is a client component; it verifies the session and redirects to
  // /login before rendering anything sensitive.
  return <Notebook />;
}
