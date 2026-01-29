import { Database, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DatabaseView() {
  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Database
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and organize your business data
          </p>
        </div>
        <Button className="gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search database..." 
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Empty State */}
      <Card className="flex-1 flex items-center justify-center border-dashed">
        <CardContent className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Database className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="mb-2">No data yet</CardTitle>
          <CardDescription className="max-w-sm mx-auto mb-6">
            Your database is empty. Start by adding entries manually or connect your data sources to import automatically.
          </CardDescription>
          <div className="flex gap-3 justify-center">
            <Button variant="outline">
              Import Data
            </Button>
            <Button className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add First Entry
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
