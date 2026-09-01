import { Workspace } from "@/components/app/Workspace";
import { getProfile, requireUser } from "@/lib/dal";

export default async function AppPage() {
  const user = await requireUser();
  const profile = await getProfile();

  return (
    <Workspace
      userId={user.id}
      displayName={profile?.display_name ?? "there"}
      email={profile?.email ?? ""}
      avatarUrl={profile?.avatar_url ?? null}
    />
  );
}
