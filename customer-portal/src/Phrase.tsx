import { actionText, requirementText, statusText, text, type CopyKey } from "./i18n";

export function Pair({
  language,
  english,
  translated,
}: {
  language: string;
  english: string;
  translated: string;
}) {
  const same = language === "en" || translated.trim() === english.trim();
  return (
    <span className="phrase">
      <span className="phrase-english">{english}</span>
      {!same && (
        <span className="phrase-translation" lang={language}>
          {translated}
        </span>
      )}
    </span>
  );
}

export function Phrase({
  language,
  k,
  vars,
}: {
  language: string;
  k: CopyKey;
  vars?: Record<string, string | number>;
}) {
  return <Pair language={language} english={text("en", k, vars)} translated={text(language, k, vars)} />;
}

export function StatusPhrase({ language, status }: { language: string; status: string }) {
  return <Pair language={language} english={statusText("en", status)} translated={statusText(language, status)} />;
}

export function RequirementPhrase({
  language,
  code,
  fallback,
}: {
  language: string;
  code: string;
  fallback: string;
}) {
  return (
    <Pair
      language={language}
      english={requirementText("en", code, fallback)}
      translated={requirementText(language, code, fallback)}
    />
  );
}

export function ActionPhrase({ language, action }: { language: string; action: string }) {
  return <Pair language={language} english={actionText("en", action)} translated={actionText(language, action)} />;
}

export function inlinePair(language: string, english: string, translated: string) {
  return language === "en" || english.trim() === translated.trim() ? english : `${english} — ${translated}`;
}

export function lines(language: string, k: CopyKey) {
  const english = text("en", k);
  const translated = text(language, k);
  return language === "en" || english === translated ? english : `${english}\n${translated}`;
}
