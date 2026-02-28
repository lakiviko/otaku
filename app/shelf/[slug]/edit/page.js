import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/header-context";
import { getServerAuthSession } from "@/lib/github-auth";
import { getShelfBySlug } from "@/lib/shelves";
import ShelfEditClient from "./shelf-edit-client";

export default async function ShelfEditPage({ params }) {
  const { slug } = await params;
  const viewer = await getServerAuthSession();
  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(`/shelf/${slug}/edit`)}`);
  }

  const shelf = await getShelfBySlug(slug);

  if (!shelf) {
    notFound();
  }

  const initialData = {
    slug: shelf.slug,
    name: shelf.name || "",
    overview: shelf.overview || "",
    lists: (shelf.lists || []).map((list) => ({
      name: list.name || "",
      overview: list.overview || "",
      items: (list.items || []).map((item) => String(item.ref || "").trim()).filter(Boolean)
    }))
  };

  return (
    <main>
      <PageHeader eyebrow="Полка" title={`${shelf.name} · Редактор`} />
      <section className="details">
        <div className="details-content">
          <div className="section-head">
            <h3>Виртуальный редактор</h3>
            <Link href={`/shelf/${slug}`} className="badge">Назад к полке</Link>
          </div>
          <p className="card-meta">
            Изменения здесь не сохраняются в файл автоматически. В конце нажми "Скопировать JSONC" и вставь результат в GitHub.
          </p>
          <ShelfEditClient initialData={initialData} />
        </div>
      </section>
    </main>
  );
}
