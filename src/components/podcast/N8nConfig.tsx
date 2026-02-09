import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ExternalLink, Webhook, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface N8nConfigProps {
  onConfigSaved?: () => void;
}

const DEFAULT_WEBHOOK_URL = "http://localhost:5678/webhook/podcast-export";

export const N8nConfig = ({ onConfigSaved }: N8nConfigProps) => {
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK_URL);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedUrl = localStorage.getItem('n8n_webhook_url');
    if (savedUrl) {
      setWebhookUrl(savedUrl);
    } else {
      // Set default and save it
      localStorage.setItem('n8n_webhook_url', DEFAULT_WEBHOOK_URL);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('n8n_webhook_url', webhookUrl);
    toast({
      title: "Gespeichert",
      description: "Die Webhook URL wurde gespeichert."
    });
    onConfigSaved?.();
  };

  const handleTest = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: "URL fehlt",
        description: "Bitte gib zuerst eine Webhook URL ein.",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          message: 'Test from Podcast Creator',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setTestResult("success");
        toast({
          title: "Verbindung erfolgreich!",
          description: "Der n8n Webhook antwortet korrekt."
        });
      } else {
        setTestResult("error");
        toast({
          title: "Fehler",
          description: `Webhook antwortete mit Status ${response.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      setTestResult("error");
      toast({
        title: "Verbindungsfehler",
        description: "Konnte den Webhook nicht erreichen. Prüfe die URL und ob n8n läuft.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Webhook className="w-5 h-5" />
          n8n Webhook Integration
        </CardTitle>
        <CardDescription>
          Verbinde deinen n8n Workflow, um exportierte Scripts automatisch zu verarbeiten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webhook URL input */}
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <div className="flex gap-2">
            <Input
              id="webhook-url"
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="https://your-n8n.app.n8n.cloud/webhook/podcast-export"
              className={testResult === "success" ? "border-green-500" : testResult === "error" ? "border-red-500" : ""}
            />
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !webhookUrl.trim()}
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : testResult === "success" ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : testResult === "error" ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : (
                "Testen"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Die URL findest du im n8n Webhook Node unter "Production URL"
          </p>
        </div>

        {/* Save button */}
        <Button onClick={handleSave} className="w-full">
          Speichern
        </Button>

        {/* Setup instructions */}
        <div className="pt-4 border-t border-border/50">
          <h4 className="text-sm font-medium mb-2">Setup Anleitung:</h4>
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Importiere den Workflow aus <code className="bg-muted px-1 rounded">n8n-workflows/podcast-to-joggai.json</code></li>
            <li>Aktiviere den Workflow in n8n</li>
            <li>Kopiere die Production URL vom Webhook Node</li>
            <li>Füge sie hier ein und teste die Verbindung</li>
          </ol>
        </div>

        {/* Quick links */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => window.open('https://n8n.io', '_blank')}
          >
            <ExternalLink className="w-3 h-3" />
            n8n.io
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => window.open('https://app.jogg.ai/video-podcast', '_blank')}
          >
            <ExternalLink className="w-3 h-3" />
            Jogg.ai
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default N8nConfig;
