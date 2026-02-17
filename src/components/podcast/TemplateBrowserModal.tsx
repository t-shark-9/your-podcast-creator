import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  LayoutTemplate,
  Search,
  X,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { joggAiService } from "@/lib/joggai";
import type { JoggAiTemplate } from "@/lib/joggai";
import { cn } from "@/lib/utils";

interface TemplateBrowserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (template: JoggAiTemplate) => void;
  selectedTemplateId?: string;
}

export default function TemplateBrowserModal({
  open,
  onOpenChange,
  onConfirm,
  selectedTemplateId: initialSelectedId,
}: TemplateBrowserModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [allTemplates, setAllTemplates] = useState<JoggAiTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(initialSelectedId || "");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const { language } = useLanguage();

  useEffect(() => {
    if (open) {
      setSelectedId(initialSelectedId || "");
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const templates = await joggAiService.getTemplates();
      setAllTemplates(Array.isArray(templates) ? templates : []);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Derive categories from tags
  const allTags = Array.from(
    new Set(allTemplates.flatMap((t) => t.tags || []).filter(Boolean))
  ).sort();

  const filters = [
    { id: "all", label: language === "de" ? "Alle" : "All" },
    ...allTags.slice(0, 8).map((tag) => ({ id: tag, label: tag })),
  ];

  const filtered = allTemplates.filter((tmpl) => {
    const matchesSearch =
      !search.trim() ||
      tmpl.name?.toLowerCase().includes(search.toLowerCase()) ||
      tmpl.description?.toLowerCase().includes(search.toLowerCase()) ||
      tmpl.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter =
      activeFilter === "all" || tmpl.tags?.includes(activeFilter);

    return matchesSearch && matchesFilter;
  });

  const selectedTemplate = allTemplates.find(
    (t) => String(t.template_id) === selectedId
  );

  const handleConfirm = () => {
    if (selectedTemplate) {
      onConfirm?.(selectedTemplate);
    }
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedId("");
    onConfirm?.(null as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b space-y-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <LayoutTemplate className="w-5 h-5 text-primary" />
              {language === "de" ? "Template wählen" : "Choose Template"}
            </DialogTitle>
            <DialogDescription>
              {language === "de"
                ? "Wähle ein Template als Grundlage für dein Video"
                : "Choose a template as the base for your video"}
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={
                language === "de"
                  ? "Templates durchsuchen..."
                  : "Search templates..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter chips */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                    activeFilter === f.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Selected preview */}
          {selectedTemplate && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
              {selectedTemplate.cover_url && (
                <img
                  src={selectedTemplate.cover_url}
                  alt=""
                  className="w-14 h-9 rounded object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {selectedTemplate.name}
                </p>
                {selectedTemplate.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedTemplate.description}
                  </p>
                )}
              </div>
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">
                {language === "de"
                  ? "Lade Templates..."
                  : "Loading templates..."}
              </span>
            </div>
          ) : filtered.length > 0 ? (
            <ScrollArea className="h-full px-6 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filtered.map((tmpl) => {
                  const tid = String(tmpl.template_id);
                  const isSelected = selectedId === tid;
                  return (
                    <button
                      key={tid}
                      onClick={() => setSelectedId(isSelected ? "" : tid)}
                      className={cn(
                        "relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] text-left group",
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 shadow-lg"
                          : "border-border/50 hover:border-primary/40"
                      )}
                    >
                      {tmpl.cover_url ? (
                        <img
                          src={tmpl.cover_url}
                          alt={tmpl.name}
                          className="aspect-video w-full object-cover bg-muted"
                          loading="lazy"
                        />
                      ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center">
                          <LayoutTemplate className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="p-2 bg-card">
                        <p className="text-xs font-medium truncate">
                          {tmpl.name || `Template ${tid}`}
                        </p>
                        {tmpl.tags && tmpl.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tmpl.tags.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[9px] px-1 py-0"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-6 h-6 text-primary bg-background rounded-full shadow" />
                        </div>
                      )}
                      {!isSelected && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4 pb-2">
                {filtered.length}{" "}
                {language === "de" ? "Templates" : "templates"}
                {search && ` — "${search}"`}
              </p>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Search className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">
                {language === "de"
                  ? "Keine Templates gefunden"
                  : "No templates found"}
              </p>
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSearch("");
                    setActiveFilter("all");
                  }}
                >
                  {language === "de" ? "Filter zurücksetzen" : "Clear filters"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-4 bg-card/80">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadTemplates}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5", isLoading && "animate-spin")}
              />
              {language === "de" ? "Neu laden" : "Reload"}
            </Button>
            {selectedId && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                {language === "de" ? "Auswahl entfernen" : "Clear selection"}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {language === "de" ? "Abbrechen" : "Cancel"}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedId}
              className="gap-2 min-w-[120px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              {language === "de" ? "Bestätigen" : "Confirm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
