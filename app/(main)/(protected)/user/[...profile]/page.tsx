import { getUserDataAction } from "@/actions/user/getUserData";
import { UserProfile } from "@/forms/userProfile";
import { auth } from "@/lib/auth";

export default async function UserProfilePage() {
  const session = await auth();
  const userData = await getUserDataAction({ email: session?.user?.email as string, username: session?.user?.name as string });

  return (
    <div className="mx-auto w-1/2">
      <UserProfile
        usernameValue={userData?.name as string}
        countryValue={userData?.country as string}
        countryCodeValue={userData?.countryCode as string}
        bioValue={userData?.bio as string}
      />
    </div>
  );
}
