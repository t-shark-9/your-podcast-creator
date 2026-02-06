import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, TestTube, Webhook, Zap } from "lucide-react";

export interface N8nConfig {
  enabled: boolean;
  webhookUrl: string;
  triggerOnScriptGenerated: boolean;
  triggerOnAudioGenerated: boolean;
  triggerOnVideoGenerated: boolean;
  triggerOnWorkflowComplete: boolean;
  customHeaders: Record<string, string>;
}

const DEFAULT_CONFIG: N8nConfig = {
  enabled: false,
  webhookUrl: "",
  triggerOnScriptGenerated: true,
  triggerOnAudioGenerated: true,
  triggerOnVideoGenerated: true,
  triggerOnWorkflowComplete: true,
  customHeaders: {}
};

const STORAGE_KEY = "n8n_config";

export const useN8nConfig = () => {
  const [config, setConfig] = useState<N8nConfig>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_CONFIG;
  });

  const saveConfig = (newConfig: N8nConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  };

  return { config, saveConfig };
};

export const triggerN8nWebhook = async (
  config: N8nConfig,
  eventType: string,
  payload: Record<string, any>
): Promise<boolean> => {
  if (!config.enabled || !config.webhookUrl) {
    return false;
  }

  // Check if this event type should trigger
  const shouldTrigger = 
    (eventType === "script_generated" && config.triggerOnScriptGenerated) ||
    (eventType === "audio_generated" && config.triggerOnAudioGenerated) ||
    (eventType === "video_generated" && config.triggerOnVideoGenerated) ||
    (eventType === "workflow_complete" && config.triggerOnWorkflowComplete) ||
    eventType === "test";

  if (!shouldTrigger) {
    return false;
  }

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config.customHeaders
      },
      body: JSON.stringify({
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload
      })
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to trigger n8n webhook:", error);
    return false;
  }
};

interface N8nSettingsProps {
  onClose?: () => void;
}

export const N8nSettings = ({ onClose }: N8nSettingsProps) => {
  const { config, saveConfig } = useN8nConfig();
  const [localConfig, setLocalConfig] = useState<N8nConfig>(config);
  const [isTesting, setIsTesting] = useState(false);
  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const { toast } = useToast();

  const handleSave = () => {
    saveConfig(localConfig);
    toast({
      title: "Einstellungen gespeichert",
      description: "Die n8n-Konfiguration wurde gespeichert."
    });
    onClose?.();
  };

  const handleTest = async () => {
    if (!localConfig.webhookUrl) {
      toast({
        title: "Webhook URL fehlt",
        description: "Bitte gib eine Webhook URL ein.",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    try {
      const testConfig = { ...localConfig, enabled: true };
      const success = await triggerN8nWebhook(testConfig, "test", {
        message: "Test from Podcast Creator",
        source: "n8n_settings"
      });

      if (success) {
        toast({
          title: "Test erfolgreich!",
          description: "Der Webhook wurde erfolgreich aufgerufen."
        });
      } else {
        toast({
          title: "Test fehlgeschlagen",
          description: "Der Webhook konnte nicht erreicht werden.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Ein Fehler ist aufgetreten.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const addHeader = () => {
    if (headerKey && headerValue) {
      setLocalConfig({
        ...localConfig,
        customHeaders: {
          ...localConfig.customHeaders,
          [headerKey]: headerValue
        }
      });
      setHeaderKey("");
      setHeaderValue("");
    }
  };

  const removeHeader = (key: string) => {
    const { [key]: removed, ...rest } = localConfig.customHeaders;
    setLocalConfig({ ...localConfig, customHeaders: rest });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            n8n Integration
          </CardTitle>
          <CardDescription>
            Verbinde deinen Podcast-Workflow mit n8n für Automatisierungen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>n8n Integration aktivieren</Label>
              <p className="text-sm text-muted-foreground">
                Aktiviert das Senden von Events an n8n
              </p>
            </div>
            <Switch
              checked={localConfig.enabled}
              onCheckedChange={(checked) => 
                setLocalConfig({ ...localConfig, enabled: checked })
              }
            />
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                placeholder="https://your-n8n-instance.com/webhook/..."
                value={localConfig.webhookUrl}
                onChange={(e) => 
                  setLocalConfig({ ...localConfig, webhookUrl: e.target.value })
                }
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || !localConfig.webhookUrl}
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Die Webhook URL aus deinem n8n Workflow
            </p>
          </div>

          {/* Event Triggers */}
          <div className="space-y-4">
            <Label>Events</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Script generiert</span>
                <Switch
                  checked={localConfig.triggerOnScriptGenerated}
                  onCheckedChange={(checked) =>
                    setLocalConfig({ ...localConfig, triggerOnScriptGenerated: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Audio generiert</span>
                <Switch
                  checked={localConfig.triggerOnAudioGenerated}
                  onCheckedChange={(checked) =>
                    setLocalConfig({ ...localConfig, triggerOnAudioGenerated: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Video/Bild generiert</span>
                <Switch
                  checked={localConfig.triggerOnVideoGenerated}
                  onCheckedChange={(checked) =>
                    setLocalConfig({ ...localConfig, triggerOnVideoGenerated: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Workflow abgeschlossen</span>
                <Switch
                  checked={localConfig.triggerOnWorkflowComplete}
                  onCheckedChange={(checked) =>
                    setLocalConfig({ ...localConfig, triggerOnWorkflowComplete: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Custom Headers */}
          <div className="space-y-2">
            <Label>Custom Headers (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Header Name"
                value={headerKey}
                onChange={(e) => setHeaderKey(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Header Value"
                value={headerValue}
                onChange={(e) => setHeaderValue(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={addHeader}>
                +
              </Button>
            </div>
            {Object.entries(localConfig.customHeaders).length > 0 && (
              <div className="space-y-1 mt-2">
                {Object.entries(localConfig.customHeaders).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between bg-muted/50 px-3 py-1.5 rounded text-sm">
                    <span><strong>{key}:</strong> {value}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHeader(key)}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Einstellungen speichern
          </Button>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-border/50 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Webhook Payload Format
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-background/50 p-3 rounded-lg overflow-x-auto">
{`{
  "event": "script_generated",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "data": {
    "script": "...",
    "topics": "...",
    "duration": 5
  }
}`}
          </pre>
          <p className="text-xs text-muted-foreground mt-2">
            Events: <code>script_generated</code>, <code>audio_generated</code>, <code>video_generated</code>, <code>workflow_complete</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default N8nSettings;
