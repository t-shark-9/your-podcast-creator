import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Video, ArrowRight, Sparkles, LayoutTemplate, Users, ExternalLink } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageContext";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold">{t("home.title")}</span>
          </div>
          <LanguageToggle />
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full space-y-10">
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gradient">
              {t("home.title")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              {t("home.subtitle")}
            </p>
          </div>

          {/* Studio Card — Featured */}
          <Link to="/studio" className="group block mb-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:glow-primary">
              <CardContent className="py-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                  <LayoutTemplate className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <CardTitle className="text-xl">{t("home.studio.title")}</CardTitle>
                  <CardDescription className="mt-1.5">
                    {t("home.studio.description")}
                  </CardDescription>
                </div>
                <Button className="gap-2 group-hover:gap-3 transition-all shrink-0">
                  {t("home.studio.cta")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Video Podcast Card — Featured */}
          <Link to="/video-podcast" className="group block mb-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:glow-primary">
              <CardContent className="py-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors shrink-0">
                  <Users className="w-7 h-7 text-purple-500" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <CardTitle className="text-xl flex items-center gap-2 justify-center sm:justify-start">
                    {t("home.videopodcast.title")}
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">2.0</span>
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    {t("home.videopodcast.description")}
                  </CardDescription>
                </div>
                <Button variant="outline" className="gap-2 group-hover:gap-3 transition-all shrink-0">
                  {t("home.videopodcast.cta")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Podcast Card */}
            <Link to="/podcast" className="group">
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:glow-primary">
                <CardHeader className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mic className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{t("home.podcast.title")}</CardTitle>
                    <CardDescription className="mt-1.5">
                      {t("home.podcast.description")}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="gap-2 w-full group-hover:gap-3 transition-all">
                    {t("home.podcast.cta")}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Ads Card */}
            <Link to="/ads" className="group">
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-accent/50 hover:glow-accent">
                <CardHeader className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Video className="w-7 h-7 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{t("home.ads.title")}</CardTitle>
                    <CardDescription className="mt-1.5">
                      {t("home.ads.description")}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="secondary" className="gap-2 w-full group-hover:gap-3 transition-all">
                    {t("home.ads.cta")}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
