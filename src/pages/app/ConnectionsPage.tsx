import { ConnectionsView } from "@/components/database/ConnectionsView";

/**
 * ConnectionsPage — /app/connections
 *
 * The ConnectionsView component handles its own data sync, OAuth flows,
 * and provider list.  AppShell's URL-param handlers process the OAuth
 * return (?oauth_success / ?oauth_error / &brandId).
 */
export default function ConnectionsPage() {
  return <ConnectionsView />;
}
