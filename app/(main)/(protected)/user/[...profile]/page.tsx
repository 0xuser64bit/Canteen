import { checkIfUserExits } from "@/actions/user/getUserData";
import { UserProfile } from "@/forms/userProfile";
import { auth } from "@/lib/auth";

export default async function UserProfilePage() {
  const session = await auth();
  const userData = await checkIfUserExits({
    email: session?.user?.email as string,
  });

  return (
    <div className="mx-auto w-1/2">
      <UserProfile
        university={userData?.university as string}
        countryValue={userData?.country as string}
        countryCodeValue={userData?.countryCode as string}
        bioValue={userData?.bio as string}
        country={userData?.country as string}
      />
    </div>
  );
}
