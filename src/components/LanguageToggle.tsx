import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-1.5 text-xs font-medium"
    >
      <Globe className="w-3.5 h-3.5" />
      {language === "de" ? "EN" : "DE"}
    </Button>
  );
}
