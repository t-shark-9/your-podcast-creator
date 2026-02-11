import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const { toast } = useToast();

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
          title: "API Key validiert",
          description: `Verbunden als ${data.data?.email || data.data?.username}`,
        });
      } else {
        setIsValid(false);
        toast({
          title: "Ungültiger API Key",
          description: data.msg || "Der API Key konnte nicht validiert werden.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Validation error:", error);
      setIsValid(false);
      toast({
        title: "Validierungsfehler",
        description: error.message || "Verbindung zu JoggAI fehlgeschlagen.",
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Einstellungen</h1>
            <p className="text-muted-foreground">API Konfiguration</p>
          </div>
        </div>

        {/* JoggAI API Key Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>JoggAI API</CardTitle>
                <CardDescription>
                  Dein API Key für die Video-Generierung
                </CardDescription>
              </div>
              {isValid !== null && (
                <Badge variant={isValid ? "default" : "destructive"} className="gap-1">
                  {isValid ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Verbunden
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      Ungültig
                    </>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Dein JoggAI API Key"
              />
              {isValid && userEmail && (
                <p className="text-sm text-muted-foreground">
                  Verbunden als: {userEmail}
                </p>
              )}
            </div>
            
            <Button onClick={handleSave} disabled={isValidating} className="w-full">
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validiere...
                </>
              ) : (
                "Speichern & Validieren"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
