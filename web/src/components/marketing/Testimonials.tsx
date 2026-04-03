import { getTranslations } from "next-intl/server";

export default async function Testimonials() {
  const t = await getTranslations("testimonials");

  const quotes = [
    { quote: t("q1Quote"), name: t("q1Name"), specialty: t("q1Specialty") },
    { quote: t("q2Quote"), name: t("q2Name"), specialty: t("q2Specialty") },
    { quote: t("q3Quote"), name: t("q3Name"), specialty: t("q3Specialty") },
  ];

  return (
    <section className="bg-doc-bg py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-doc-text mb-4">{t("title")}</h2>
          <p className="text-doc-muted text-lg">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quotes.map((q, i) => (
            <div
              key={i}
              className="relative rounded-2xl bg-doc-card border border-doc-border p-7 flex flex-col gap-5"
            >
              {/* Large decorative quote */}
              <span
                className="text-7xl font-serif leading-none text-doc-accent/20 select-none absolute top-4 start-6"
                aria-hidden="true"
              >
                "
              </span>

              <blockquote className="relative z-10 text-doc-text text-base leading-relaxed pt-4">
                {q.quote}
              </blockquote>

              <div className="flex items-center gap-3 mt-auto">
                <div className="w-9 h-9 rounded-full bg-doc-accent/15 border border-doc-accent/20 flex items-center justify-center shrink-0">
                  <span className="text-doc-accent text-xs font-bold">
                    {q.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-doc-text text-sm font-semibold">{q.name}</p>
                  <p className="text-doc-muted text-xs">{q.specialty}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
