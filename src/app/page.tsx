import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <main className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Rubbin Hood</h1>
          <p className="text-muted-foreground">
            Prediction Market Analytics Platform
          </p>
        </div>

        {/* Theme Test Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Liquidity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">$5,432.10</p>
              <p className="text-xs text-profit">+12.5% this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Realized P&L
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums text-profit">
                +$1,234.56
              </p>
              <p className="text-xs text-muted-foreground">147 trades closed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums text-loss">
                -$89.50
              </p>
              <p className="text-xs text-muted-foreground">1.6% fee drag</p>
            </CardContent>
          </Card>
        </div>

        {/* Component Test */}
        <Card>
          <CardHeader>
            <CardTitle>Component Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge className="bg-profit text-white">Profit</Badge>
              <Badge className="bg-loss text-white">Loss</Badge>
              <Badge className="bg-warning text-black">Warning</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
              <div className="space-y-1">
                <div className="h-10 rounded bg-background border" />
                <p className="text-xs">background</p>
              </div>
              <div className="space-y-1">
                <div className="h-10 rounded bg-card" />
                <p className="text-xs">card</p>
              </div>
              <div className="space-y-1">
                <div className="h-10 rounded bg-popover" />
                <p className="text-xs">popover</p>
              </div>
              <div className="space-y-1">
                <div className="h-10 rounded bg-primary" />
                <p className="text-xs">primary</p>
              </div>
              <div className="space-y-1">
                <div className="h-10 rounded bg-secondary" />
                <p className="text-xs">secondary</p>
              </div>
              <div className="space-y-1">
                <div className="h-10 rounded bg-profit" />
                <p className="text-xs">profit</p>
              </div>
              <div className="space-y-1">
                <div className="h-10 rounded bg-loss" />
                <p className="text-xs">loss</p>
              </div>
              <div className="space-y-1">
                <div className="h-10 rounded bg-warning" />
                <p className="text-xs">warning</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
