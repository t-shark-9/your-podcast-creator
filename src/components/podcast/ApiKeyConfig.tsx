import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

export default function ApiKeyConfig() {
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const savedApiKey = localStorage.getItem("joggai_api_key") || import.meta.env.VITE_JOGGAI_API_KEY || "";
    setApiKey(savedApiKey);
    if (savedApiKey) {
      validateApiKey(savedApiKey);
    }
  }, []);

  const validateApiKey = async (key: string) => {
    if (!key.trim()) {
      setIsValid(null);
      return;
    }

    setIsValidating(true);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("joggai-proxy", {
        body: { endpoint: "/user/whoami", method: "GET", apiKey: key }
      });
      if (invokeErr) throw invokeErr;

      if (data.code === 0) {
        setIsValid(true);
        setUserEmail(data.data?.email || "");
        localStorage.setItem("joggai_api_key", key);
        toast({
          title: t("settings.joggai.validated"),
          description: `${t("settings.joggai.validated.desc")} ${data.data?.email || data.data?.username}`,
        });
      } else {
        setIsValid(false);
        toast({
          title: t("settings.joggai.invalid.title"),
          description: data.msg || t("settings.joggai.invalid.desc"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setIsValid(false);
      toast({
        title: t("settings.joggai.error"),
        description: error.message || t("settings.joggai.error.desc"),
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem("joggai_api_key", apiKey);
    validateApiKey(apiKey);
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="w-5 h-5" />
              {t("settings.joggai.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.joggai.desc")}
            </CardDescription>
          </div>
          {isValid !== null && (
            <Badge variant={isValid ? "default" : "destructive"} className="gap-1">
              {isValid ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  {t("settings.joggai.connected")}
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" />
                  {t("settings.joggai.invalid")}
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key-inline">{t("settings.joggai.label")}</Label>
          <Input
            id="api-key-inline"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t("settings.joggai.placeholder")}
          />
          {isValid && userEmail && (
            <p className="text-sm text-muted-foreground">
              {t("settings.joggai.connected.as")} {userEmail}
            </p>
          )}
        </div>

        <Button onClick={handleSave} disabled={isValidating} className="w-full">
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("settings.joggai.validate")}
            </>
          ) : (
            t("settings.joggai.save")
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          {t("settings.joggai.hint")}
        </p>
      </CardContent>
    </Card>
  );
}
