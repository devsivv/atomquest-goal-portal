import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  BellRing, 
  ShieldAlert, 
  FileLock2, 
  ToggleRight 
} from "lucide-react";

export const metadata = {
  title: "Platform Settings | Quartiq",
  description: "Enterprise configuration and governance controls.",
};

const settingsModules = [
  {
    title: "Organization Settings",
    description: "Manage corporate profile, departments, and global branding.",
    icon: Building2,
    status: "Coming Soon",
  },
  {
    title: "Notification Preferences",
    description: "Configure system-wide email and in-app alert thresholds.",
    icon: BellRing,
    status: "Coming Soon",
  },
  {
    title: "Security & Access",
    description: "SAML/SSO configuration, session policies, and IP allowlisting.",
    icon: ShieldAlert,
    status: "Coming Soon",
  },
  {
    title: "Audit & Compliance",
    description: "Export full immutability logs and configure data retention.",
    icon: FileLock2,
    status: "Coming Soon",
  },
  {
    title: "Feature Flags",
    description: "Toggle beta modules like AI 360° feedback and OKR cascading.",
    icon: ToggleRight,
    status: "Coming Soon",
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground mt-2">
          Enterprise configuration and governance controls.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsModules.map((module) => (
          <Card 
            key={module.title} 
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20 group"
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">
                  {module.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {module.description}
                </CardDescription>
              </div>
              <div className="h-10 w-10 shrink-0 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <module.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Badge variant="secondary" className="bg-muted/50">
                {module.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
